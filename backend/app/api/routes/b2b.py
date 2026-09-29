"""B2B: bulk purchase requests, quotations, accept/reject → bulk order."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app import schemas as s
from app.db.database import get_db
from app.auth.deps import get_current_user, get_own_farm, require_role
from app.models import (
    BulkPurchaseRequest,
    Farm,
    Order,
    Product,
    Quotation,
    User,
)
from app.models.enums import REQUEST_STATUS
from app.api.routes._helpers import get_or_404, notify

router = APIRouter(prefix="/b2b", tags=["b2b"])


def _utcnow():
    return datetime.now(timezone.utc)


def _request_out(r: BulkPurchaseRequest, count: int | None = None) -> s.BulkRequestOut:
    return s.BulkRequestOut(
        id=r.request_id,
        buyer_id=r.buyer_id,
        buyer_name=r.buyer.full_name if r.buyer else None,
        product_id=r.product_id,
        product_name=r.product.name if r.product else None,
        quantity_requested=float(r.quantity_requested),
        target_price=float(r.target_price) if r.target_price is not None else None,
        deadline=r.deadline,
        status=r.status,
        created_at=r.created_at,
        quotation_count=count if count is not None else len(r.quotations),
    )


def _quotation_out(q: Quotation) -> s.QuotationOut:
    return s.QuotationOut(
        id=q.quotation_id,
        request_id=q.request_id,
        farm_id=q.farm_id,
        farm_name=q.farm.farm_name if q.farm else None,
        bid_price=float(q.bid_price),
        quantity_offered=float(q.quantity_offered),
        status=q.status,
        submitted_at=q.submitted_at,
    )


@router.post("/requests", response_model=s.BulkRequestOut, status_code=201)
def create_request(
    body: s.BulkRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("business")),
):
    product = get_or_404(db, Product, body.product_id, "Product")
    if product.status != "active":
        raise HTTPException(400, "Product is not available for bulk purchase.")
    r = BulkPurchaseRequest(
        buyer_id=user.user_id,
        product_id=product.product_id,
        quantity_requested=body.quantity_requested,
        target_price=body.target_price,
        deadline=body.deadline,
        status="open",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _request_out(r, 0)


@router.get("/requests", response_model=list[s.BulkRequestOut])
def list_requests(
    status_: str | None = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(BulkPurchaseRequest).options(
        joinedload(BulkPurchaseRequest.buyer),
        joinedload(BulkPurchaseRequest.product),
        joinedload(BulkPurchaseRequest.quotations),
    )
    if user.role == "business":
        q = q.filter(BulkPurchaseRequest.buyer_id == user.user_id)
    elif user.role == "farmer":
        # Farmers see open requests they can quote on.
        q = q.filter(BulkPurchaseRequest.status == "open")
    elif user.role not in ("admin",):
        raise HTTPException(403, "Not allowed.")
    if status_:
        if status_ not in REQUEST_STATUS:
            raise HTTPException(400, f"status must be one of {REQUEST_STATUS}")
        q = q.filter(BulkPurchaseRequest.status == status_)
    rows = q.order_by(BulkPurchaseRequest.created_at.desc()).offset(skip).limit(limit).all()
    return [_request_out(r) for r in rows]


def _get_request_visible(db: Session, user: User, request_id: int) -> BulkPurchaseRequest:
    r = get_or_404(db, BulkPurchaseRequest, request_id, "Bulk purchase request")
    if user.role == "admin":
        return r
    if r.buyer_id == user.user_id:
        return r
    if user.role == "farmer" and r.status == "open":
        return r
    # A farmer who already quoted can always see it.
    if user.role == "farmer":
        farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()
        if farm and any(q.farm_id == farm.farm_id for q in r.quotations):
            return r
    raise HTTPException(404, "Bulk purchase request not found")


@router.get("/requests/{request_id}", response_model=s.BulkRequestOut)
def get_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _request_out(_get_request_visible(db, user, request_id))


@router.patch("/requests/{request_id}", response_model=s.BulkRequestOut)
def update_request(
    request_id: int,
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("business")),
):
    r = get_or_404(db, BulkPurchaseRequest, request_id, "Bulk purchase request")
    if r.buyer_id != user.user_id:
        raise HTTPException(404, "Bulk purchase request not found")
    new_status = body.get("status")
    if new_status not in ("cancelled", "expired"):
        raise HTTPException(400, "Businesses can only cancel or expire their requests.")
    r.status = new_status
    db.commit()
    db.refresh(r)
    return _request_out(r)


@router.post("/requests/{request_id}/quotations", response_model=s.QuotationOut, status_code=201)
def submit_quotation(
    request_id: int,
    body: s.QuotationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer")),
):
    r = _get_request_visible(db, user, request_id)
    if r.status != "open":
        raise HTTPException(400, "This request is no longer open for quotations.")
    farm = get_own_farm(user, db)
    if farm.verification_status != "verified":
        raise HTTPException(403, "Only verified farms can submit quotations.")
    existing = (
        db.query(Quotation)
        .filter(Quotation.request_id == request_id, Quotation.farm_id == farm.farm_id)
        .first()
    )
    if existing:
        raise HTTPException(409, "Your farm has already quoted on this request.")
    q = Quotation(
        request_id=request_id,
        farm_id=farm.farm_id,
        bid_price=body.bid_price,
        quantity_offered=body.quantity_offered,
        status="submitted",
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    notify(db, r.buyer_id, "order", f"New quotation from {farm.farm_name} on your bulk request #{request_id}.")
    db.commit()
    return _quotation_out(q)


@router.get("/requests/{request_id}/quotations", response_model=list[s.QuotationOut])
def list_quotations(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = _get_request_visible(db, user, request_id)
    if user.role == "farmer":
        farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()
        if r.buyer_id != user.user_id and not (farm and any(q.farm_id == farm.farm_id for q in r.quotations)):
            # Farmer sees only their own quotation unless they own the request.
            rows = [q for q in r.quotations if farm and q.farm_id == farm.farm_id]
            return [_quotation_out(q) for q in rows]
    rows = sorted(r.quotations, key=lambda q: q.bid_price)
    return [_quotation_out(q) for q in rows]


@router.get("/quotations", response_model=list[s.QuotationOut])
def my_quotations(
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Quotation).options(joinedload(Quotation.farm), joinedload(Quotation.request))
    if user.role == "farmer":
        farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()
        q = q.filter(Quotation.farm_id == (farm.farm_id if farm else -1))
    elif user.role == "business":
        q = q.join(BulkPurchaseRequest).filter(BulkPurchaseRequest.buyer_id == user.user_id)
    elif user.role != "admin":
        raise HTTPException(403, "Not allowed.")
    rows = q.order_by(Quotation.submitted_at.desc()).offset(skip).limit(limit).all()
    return [_quotation_out(x) for x in rows]


def _accept_or_reject(db: Session, user: User, quotation_id: int, accept: bool) -> s.QuotationOut:
    q = get_or_404(db, Quotation, quotation_id, "Quotation")
    r = q.request
    if r.buyer_id != user.user_id:
        raise HTTPException(404, "Quotation not found")
    if q.status != "submitted" or r.status != "open":
        raise HTTPException(400, "This quotation can no longer be decided.")
    if accept:
        q.status = "accepted"
        for other in r.quotations:
            if other.quotation_id != q.quotation_id and other.status == "submitted":
                other.status = "rejected"
                notify(db, other.farm.owner.user_id, "order", f"Your quotation for bulk request #{r.request_id} was not accepted.")
        r.status = "fulfilled"
        # Create the bulk order from the accepted quotation.
        product = q.request.product
        qty = q.quantity_offered
        order = Order(
            user_id=user.user_id,
            order_items={
                "items": [
                    {
                        "product_id": product.product_id,
                        "quantity": float(qty),
                        "name": product.name,
                        "price": float(q.bid_price),
                        "farm_id": q.farm_id,
                    }
                ],
                "bulk_request_id": r.request_id,
                "quotation_id": q.quotation_id,
            },
            total_amount=qty * q.bid_price,
            status="pending",
            delivery_address=user.address_line,
        )
        db.add(order)
        notify(db, q.farm.owner.user_id, "order", f"Your quotation for bulk request #{r.request_id} was ACCEPTED.")
    else:
        q.status = "rejected"
        notify(db, q.farm.owner.user_id, "order", f"Your quotation for bulk request #{r.request_id} was not accepted.")
    db.commit()
    db.refresh(q)
    return _quotation_out(q)


@router.post("/quotations/{quotation_id}/accept", response_model=s.QuotationOut)
def accept_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("business")),
):
    return _accept_or_reject(db, user, quotation_id, True)


@router.post("/quotations/{quotation_id}/reject", response_model=s.QuotationOut)
def reject_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("business")),
):
    return _accept_or_reject(db, user, quotation_id, False)
