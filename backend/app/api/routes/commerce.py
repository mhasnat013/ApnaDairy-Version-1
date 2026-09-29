"""Commerce: cart, orders, payments (SIMULATED), deliveries + tracking.

Payments are simulated end-to-end: no real money moves. Every payment response
carries the disclaimer "Demo payment — no real money will be charged".
"""

import secrets
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app import schemas as s
from app.db.database import get_db
from app.auth.deps import get_current_user, require_role
from app.models import (
    Cart,
    Delivery,
    DeliveryTracking,
    Discount,
    Farm,
    Order,
    Payment,
    Product,
    User,
)
from app.models.enums import DELIVERY_STATUS, ORDER_STATUS, PAYMENT_METHOD
from app.api.routes._helpers import get_or_404, notify

router = APIRouter(tags=["commerce"])

PAYMENT_DISCLAIMER = "Demo payment — no real money will be charged"


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _cart_items(db: Session, cart: Cart) -> list[dict]:
    return (cart.cart_data or {}).get("items", [])


def _enrich_cart(db: Session, cart: Cart) -> s.CartOut:
    items = []
    total = Decimal("0")
    for entry in _cart_items(db, cart):
        p = db.get(Product, int(entry["product_id"]))
        if p is None or p.status == "archived":
            continue
        qty = Decimal(str(entry["quantity"]))
        items.append(
            s.CartItemOut(
                product_id=p.product_id,
                quantity=float(qty),
                name=p.name,
                price=float(p.price),
                image_url=p.image_url,
                farm_name=p.farm.farm_name if p.farm else None,
            )
        )
        total += qty * p.price
    return s.CartOut(items=items, total=float(total))


def _get_or_create_cart(db: Session, user: User) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user.user_id).first()
    if cart is None:
        cart = Cart(user_id=user.user_id, cart_data={"items": []})
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def _order_out(db: Session, o: Order) -> s.OrderOut:
    items = []
    for i in (o.order_items or {}).get("items", []):
        product = db.get(Product, int(i["product_id"]))
        # Older/imported order snapshots used ``unit_price`` and did not store
        # ``farm_id``.  Keep the API compatible with both shapes so historical
        # orders remain visible to customers, riders and the owning farm.
        item_price = i.get("price", i.get("unit_price"))
        if item_price is None and product is not None:
            item_price = product.price
        items.append(
            s.OrderItemOut(
                product_id=i["product_id"],
                quantity=float(i["quantity"]),
                name=i.get("name") or (product.name if product else f"Product #{i['product_id']}"),
                price=float(item_price or 0),
                farm_id=i.get("farm_id") or (product.farm_id if product else None),
            )
        )
    pay = None
    if o.payment:
        pay = s.PaymentOut(
            id=o.payment.payment_id, order_id=o.order_id, amount=float(o.payment.amount),
            method=o.payment.method, status=o.payment.status,
            transaction_ref=o.payment.transaction_ref, paid_at=o.payment.paid_at,
        )
    dlv = None
    if o.delivery:
        dlv = s.DeliveryOut(
            id=o.delivery.delivery_id, order_id=o.order_id,
            rider_id=o.delivery.delivery_person_id,
            rider_name=o.delivery.rider.full_name if o.delivery.rider else None,
            address=o.delivery.address, scheduled_time=o.delivery.scheduled_time,
            delivered_time=o.delivery.delivered_time, status=o.delivery.status,
        )
    return s.OrderOut(
        id=o.order_id, user_id=o.user_id, items=items, order_date=o.order_date,
        total_amount=float(o.total_amount), status=o.status,
        delivery_address=o.delivery_address, payment=pay, delivery=dlv,
    )


def _order_involves_farm(order: Order, farm_id: int, db: Session | None = None) -> bool:
    for item in (order.order_items or {}).get("items", []):
        if item.get("farm_id") == farm_id:
            return True
        if item.get("farm_id") is None and db is not None:
            product = db.get(Product, int(item["product_id"]))
            if product is not None and product.farm_id == farm_id:
                return True
    return False


def _check_order_access(db: Session, user: User, order: Order) -> None:
    if user.role == "admin" or order.user_id == user.user_id:
        return
    if user.role == "farmer":
        farm = db.query(Farm).filter_by(user_id=user.user_id).first()
        if farm and _order_involves_farm(order, farm.farm_id, db):
            return
    if user.role == "rider" and order.delivery and order.delivery.delivery_person_id == user.user_id:
        return
    raise HTTPException(404, "Order not found")


# ---------------------------------------------------------------------------
# Cart (customer)
# ---------------------------------------------------------------------------

@router.get("/cart", response_model=s.CartOut)
def get_cart(db: Session = Depends(get_db), user: User = Depends(require_role("customer"))):
    return _enrich_cart(db, _get_or_create_cart(db, user))


@router.put("/cart", response_model=s.CartOut)
def update_cart(body: s.CartUpdate, db: Session = Depends(get_db), user: User = Depends(require_role("customer"))):
    items = []
    for entry in body.items:
        p = db.get(Product, entry.product_id)
        if p is None or p.status != "active":
            raise HTTPException(400, f"Product {entry.product_id} is not available.")
        if entry.quantity > p.quantity_available:
            raise HTTPException(400, f"Only {p.quantity_available} {p.unit_of_measure} of '{p.name}' available.")
        items.append({"product_id": p.product_id, "quantity": float(entry.quantity)})
    cart = _get_or_create_cart(db, user)
    cart.cart_data = {"items": items}
    db.commit()
    return _enrich_cart(db, cart)


@router.delete("/cart", response_model=s.MessageOut)
def clear_cart(db: Session = Depends(get_db), user: User = Depends(require_role("customer"))):
    cart = _get_or_create_cart(db, user)
    cart.cart_data = {"items": []}
    db.commit()
    return s.MessageOut(message="Cart cleared.")


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

@router.post("/orders", response_model=s.OrderOut, status_code=201)
def create_order(body: s.OrderCreate, db: Session = Depends(get_db), user: User = Depends(require_role("customer", "business"))):
    cart = _get_or_create_cart(db, user)
    entries = _cart_items(db, cart)
    if not entries:
        raise HTTPException(400, "Cart is empty.")
    items, total = [], Decimal("0")
    now = _utcnow()
    for entry in entries:
        p = db.get(Product, int(entry["product_id"]))
        if p is None or p.status != "active":
            raise HTTPException(400, f"Product {entry['product_id']} is not available.")
        qty = Decimal(str(entry["quantity"]))
        if qty > p.quantity_available:
            raise HTTPException(400, f"Only {p.quantity_available} of '{p.name}' available.")
        # Dynamic pricing: apply the best currently-active discount (manual or automatic).
        best = (
            db.query(Discount)
            .filter(Discount.product_id == p.product_id, Discount.valid_from <= now, Discount.valid_until >= now)
            .order_by(Discount.discount_percent.desc())
            .first()
        )
        unit_price = p.price
        if best is not None and best.discount_percent:
            unit_price = (p.price * (Decimal("100") - best.discount_percent) / Decimal("100")).quantize(Decimal("0.01"))
        items.append({"product_id": p.product_id, "quantity": float(qty), "name": p.name, "price": float(unit_price), "farm_id": p.farm_id})
        total += qty * unit_price
    order = Order(user_id=user.user_id, order_items={"items": items}, total_amount=total, status="pending", delivery_address=body.delivery_address)
    db.add(order)
    cart.cart_data = {"items": []}
    db.commit()
    db.refresh(order)
    notify(db, user.user_id, "order", f"Order #{order.order_id} placed — {float(total):.2f} total.")
    db.commit()
    return _order_out(db, order)


@router.get("/orders", response_model=list[s.OrderOut])
def list_orders(
    status_: str | None = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Order).options(joinedload(Order.payment), joinedload(Order.delivery))
    if user.role == "customer" or user.role == "business":
        q = q.filter(Order.user_id == user.user_id)
    elif user.role == "rider":
        q = q.join(Delivery, Delivery.order_id == Order.order_id).filter(Delivery.delivery_person_id == user.user_id)
    # farmer + admin: all (farmer filtered in Python by farm involvement)
    if status_:
        if status_ not in ORDER_STATUS:
            raise HTTPException(400, f"status must be one of {ORDER_STATUS}")
        q = q.filter(Order.status == status_)
    orders = q.order_by(Order.order_date.desc()).offset(skip).limit(limit).all()
    if user.role == "farmer":
        farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()
        if farm:
            orders = [o for o in orders if _order_involves_farm(o, farm.farm_id, db)]
        else:
            orders = []
    return [_order_out(db, o) for o in orders]


@router.get("/orders/{order_id}", response_model=s.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = get_or_404(db, Order, order_id, "Order")
    _check_order_access(db, user, order)
    return _order_out(db, order)


@router.patch("/orders/{order_id}/status", response_model=s.OrderOut)
def update_order_status(
    order_id: int,
    body: s.OrderStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin")),
):
    order = get_or_404(db, Order, order_id, "Order")
    if body.status not in ORDER_STATUS:
        raise HTTPException(400, f"status must be one of {ORDER_STATUS}")
    if user.role == "farmer":
        if body.status not in ("confirmed", "preparing", "cancelled"):
            raise HTTPException(403, "Farmers can only confirm, prepare or cancel orders.")
        farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()
        if not farm or not _order_involves_farm(order, farm.farm_id, db):
            raise HTTPException(404, "Order not found")
    order.status = body.status
    notify(db, order.user_id, "order", f"Order #{order.order_id} is now '{body.status}'.")
    db.commit()
    db.refresh(order)
    return _order_out(db, order)


# ---------------------------------------------------------------------------
# Payments (SIMULATED — no real money)
# ---------------------------------------------------------------------------

@router.post("/orders/{order_id}/pay", response_model=s.PaymentOut)
def pay_order(
    order_id: int,
    body: s.PayRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("customer", "business")),
):
    order = get_or_404(db, Order, order_id, "Order")
    if order.user_id != user.user_id:
        raise HTTPException(404, "Order not found")
    if order.status != "pending":
        raise HTTPException(400, f"Order cannot be paid in status '{order.status}'.")
    if order.payment is not None:
        raise HTTPException(409, "This order already has a payment.")
    if body.method not in PAYMENT_METHOD:
        raise HTTPException(400, f"method must be one of {PAYMENT_METHOD}")
    # Re-validate + decrement stock atomically in this transaction.
    for item in (order.order_items or {}).get("items", []):
        p = db.get(Product, int(item["product_id"]))
        if p is None or p.status != "active":
            raise HTTPException(400, f"Product '{item['name']}' is no longer available.")
        qty = Decimal(str(item["quantity"]))
        if qty > p.quantity_available:
            raise HTTPException(400, f"Insufficient stock for '{p.name}'.")
        p.quantity_available = p.quantity_available - qty
        if p.quantity_available <= 0:
            p.status = "out_of_stock"
    payment = Payment(
        order_id=order.order_id,
        amount=order.total_amount,
        method=body.method,
        status="completed",  # simulated — completes instantly
        transaction_ref=f"DEMO-{secrets.token_hex(6).upper()}",
        paid_at=_utcnow(),
    )
    db.add(payment)
    order.status = "paid"
    db.add(Delivery(order_id=order.order_id, address=order.delivery_address, status="scheduled"))
    db.flush()
    notify(db, order.user_id, "payment", f"{PAYMENT_DISCLAIMER}. Payment {payment.transaction_ref} recorded for order #{order.order_id}.")
    db.commit()
    db.refresh(payment)
    return s.PaymentOut(
        id=payment.payment_id, order_id=payment.order_id, amount=float(payment.amount),
        method=payment.method, status=payment.status,
        transaction_ref=payment.transaction_ref, paid_at=payment.paid_at,
    )


@router.get("/payments", response_model=list[s.PaymentOut])
def list_payments(
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Payment).join(Order, Order.order_id == Payment.order_id)
    if user.role not in ("admin",):
        q = q.filter(Order.user_id == user.user_id)
    rows = q.order_by(Payment.payment_id.desc()).offset(skip).limit(limit).all()
    return [
        s.PaymentOut(id=r.payment_id, order_id=r.order_id, amount=float(r.amount), method=r.method, status=r.status, transaction_ref=r.transaction_ref, paid_at=r.paid_at)
        for r in rows
    ]


@router.get("/payments/{payment_id}", response_model=s.PaymentOut)
def get_payment(payment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = get_or_404(db, Payment, payment_id, "Payment")
    if user.role != "admin" and r.order.user_id != user.user_id:
        raise HTTPException(404, "Payment not found")
    return s.PaymentOut(id=r.payment_id, order_id=r.order_id, amount=float(r.amount), method=r.method, status=r.status, transaction_ref=r.transaction_ref, paid_at=r.paid_at)


# ---------------------------------------------------------------------------
# Deliveries + tracking
# ---------------------------------------------------------------------------

def _delivery_out(d: Delivery) -> s.DeliveryOut:
    return s.DeliveryOut(
        id=d.delivery_id, order_id=d.order_id,
        rider_id=d.delivery_person_id,
        rider_name=d.rider.full_name if d.rider else None,
        address=d.address, scheduled_time=d.scheduled_time,
        delivered_time=d.delivered_time, status=d.status,
    )


def _check_delivery_access(db: Session, user: User, d: Delivery) -> None:
    if user.role == "admin":
        return
    if d.order.user_id == user.user_id:
        return
    if user.role == "rider" and d.delivery_person_id == user.user_id:
        return
    if user.role == "farmer":
        farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()
        if farm and _order_involves_farm(d.order, farm.farm_id, db):
            return
    raise HTTPException(404, "Delivery not found")


@router.get("/deliveries", response_model=list[s.DeliveryOut])
def list_deliveries(
    status_: str | None = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Delivery).options(joinedload(Delivery.rider), joinedload(Delivery.order))
    if user.role == "rider":
        q = q.filter(Delivery.delivery_person_id == user.user_id)
    elif user.role in ("customer", "business"):
        q = q.join(Order, Order.order_id == Delivery.order_id).filter(Order.user_id == user.user_id)
    if status_:
        if status_ not in DELIVERY_STATUS:
            raise HTTPException(400, f"status must be one of {DELIVERY_STATUS}")
        q = q.filter(Delivery.status == status_)
    rows = q.order_by(Delivery.delivery_id.desc()).offset(skip).limit(limit).all()
    if user.role == "farmer":
        farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()
        rows = [d for d in rows if farm and _order_involves_farm(d.order, farm.farm_id, db)]
    return [_delivery_out(d) for d in rows]


@router.get("/deliveries/{delivery_id}", response_model=s.DeliveryOut)
def get_delivery(delivery_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    d = get_or_404(db, Delivery, delivery_id, "Delivery")
    _check_delivery_access(db, user, d)
    return _delivery_out(d)


@router.patch("/deliveries/{delivery_id}/assign", response_model=s.DeliveryOut)
def assign_delivery(
    delivery_id: int,
    body: s.DeliveryAssign,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    d = get_or_404(db, Delivery, delivery_id, "Delivery")
    rider = db.get(User, body.rider_id)
    if rider is None or rider.role != "rider":
        raise HTTPException(400, "rider_id must belong to a delivery rider account.")
    if rider.status != "active":
        raise HTTPException(400, "Rider account is not active.")
    d.delivery_person_id = rider.user_id
    d.status = "assigned"
    notify(db, rider.user_id, "delivery", f"New delivery assignment #{d.delivery_id} for order #{d.order_id}.")
    db.commit()
    db.refresh(d)
    return _delivery_out(d)


@router.patch("/deliveries/{delivery_id}/status", response_model=s.DeliveryOut)
def update_delivery_status(
    delivery_id: int,
    body: s.DeliveryStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("rider", "admin")),
):
    d = get_or_404(db, Delivery, delivery_id, "Delivery")
    if user.role == "rider" and d.delivery_person_id != user.user_id:
        raise HTTPException(404, "Delivery not found")
    if body.status not in DELIVERY_STATUS:
        raise HTTPException(400, f"status must be one of {DELIVERY_STATUS}")
    # Enforce a forward-only delivery state machine (failed may be retried).
    allowed = {
        "scheduled": {"assigned"},
        "assigned": {"picked_up", "failed"},
        "picked_up": {"in_transit", "failed"},
        "in_transit": {"delivered", "failed"},
        "failed": {"assigned"},
        "delivered": set(),
    }
    if body.status not in allowed.get(d.status, set()):
        raise HTTPException(400, f"Cannot move delivery from '{d.status}' to '{body.status}'.")
    d.status = body.status
    if body.status == "delivered":
        d.delivered_time = _utcnow()
        d.order.status = "delivered"
        notify(db, d.order.user_id, "delivery", f"Order #{d.order.order_id} has been delivered.")
    elif body.status == "picked_up":
        d.order.status = "in_transit"
    elif body.status == "failed":
        d.order.status = "confirmed"
        notify(db, d.order.user_id, "delivery", f"Delivery for order #{d.order.order_id} failed. Our team will contact you.")
    db.commit()
    db.refresh(d)
    return _delivery_out(d)


@router.post("/deliveries/{delivery_id}/tracking", response_model=s.TrackingOut, status_code=201)
def add_tracking(
    delivery_id: int,
    body: s.TrackingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("rider", "admin")),
):
    d = get_or_404(db, Delivery, delivery_id, "Delivery")
    if user.role == "rider" and d.delivery_person_id != user.user_id:
        raise HTTPException(404, "Delivery not found")
    t = DeliveryTracking(
        delivery_id=d.delivery_id,
        status_update=body.status_update.strip(),
        latitude=body.latitude,
        longitude=body.longitude,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return s.TrackingOut(id=t.tracking_id, delivery_id=t.delivery_id, status_update=t.status_update, latitude=float(t.latitude) if t.latitude is not None else None, longitude=float(t.longitude) if t.longitude is not None else None, timestamp=t.timestamp)


@router.get("/deliveries/{delivery_id}/tracking", response_model=list[s.TrackingOut])
def list_tracking(delivery_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    d = get_or_404(db, Delivery, delivery_id, "Delivery")
    _check_delivery_access(db, user, d)
    rows = db.query(DeliveryTracking).filter(DeliveryTracking.delivery_id == delivery_id).order_by(DeliveryTracking.timestamp).all()
    return [
        s.TrackingOut(id=t.tracking_id, delivery_id=t.delivery_id, status_update=t.status_update, latitude=float(t.latitude) if t.latitude is not None else None, longitude=float(t.longitude) if t.longitude is not None else None, timestamp=t.timestamp)
        for t in rows
    ]
