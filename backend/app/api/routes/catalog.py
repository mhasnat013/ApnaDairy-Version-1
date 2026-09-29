"""Catalog: public farms/products, farmer product management, pricing, reviews."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import schemas as s
from app.auth.deps import get_current_user, get_own_farm, require_role
from app.db.database import get_db
from app.models import Discount, Farm, MilkBatch, PriceHistory, Product, Review, Subscription, User
from app.models.enums import FARM_VERIFICATION, PRODUCT_STATUS
from app.api.routes._helpers import apply_paging, get_or_404, notify

router = APIRouter(tags=["catalog"])


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Farms (public read; farmer write)
# ---------------------------------------------------------------------------

@router.get("/farms", response_model=list[s.FarmOut])
def list_farms(
    search: str | None = None,
    verification_status: str = "verified",
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Farm)
    if verification_status != "all":
        if verification_status not in FARM_VERIFICATION:
            raise HTTPException(400, f"verification_status must be one of {FARM_VERIFICATION} or 'all'")
        q = q.filter(Farm.verification_status == verification_status)
    if search:
        q = q.filter(Farm.farm_name.ilike(f"%{search}%") | Farm.location.ilike(f"%{search}%"))
    farms = q.order_by(Farm.farm_id).offset(skip).limit(limit).all()
    return [s.FarmOut.from_orm_farm(f) for f in farms]


@router.get("/farms/{farm_id}", response_model=s.FarmOut)
def get_farm(farm_id: int, db: Session = Depends(get_db)):
    farm = get_or_404(db, Farm, farm_id, "Farm")
    return s.FarmOut.from_orm_farm(farm, detail=True)


@router.post("/farms", response_model=s.FarmOut, status_code=201)
def create_farm(
    body: s.FarmCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer")),
):
    if db.query(Farm).filter(Farm.user_id == user.user_id).first():
        raise HTTPException(409, "This account already has a registered farm (one farm per user).")
    farm = Farm(
        user_id=user.user_id,
        farm_name=body.farm_name.strip(),
        location=body.location.strip(),
        latitude=body.latitude,
        longitude=body.longitude,
        capacity_liters=body.capacity_liters,
        established_date=body.established_date,
        description=body.description,
        verification_status="pending",
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return s.FarmOut.from_orm_farm(farm, detail=True, private=True)


@router.patch("/farms/{farm_id}", response_model=s.FarmOut)
def update_farm(
    farm_id: int,
    body: s.FarmUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    farm = get_or_404(db, Farm, farm_id, "Farm")
    if user.role != "admin" and farm.user_id != user.user_id:
        raise HTTPException(403, "You can only edit your own farm.")
    for field in ("farm_name", "location", "description", "capacity_liters", "latitude", "longitude"):
        val = getattr(body, field)
        if val is not None:
            setattr(farm, field, val.strip() if isinstance(val, str) else val)
    db.commit()
    db.refresh(farm)
    return s.FarmOut.from_orm_farm(farm, detail=True, private=True)


@router.post("/farms/{farm_id}/verification-documents", response_model=s.FarmOut)
def add_farm_verification_document(
    farm_id: int,
    body: s.FarmDocumentAdd,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer")),
):
    """Attach a verification document (upload via POST /uploads first) to the farmer's own farm."""
    farm = get_or_404(db, Farm, farm_id, "Farm")
    if farm.user_id != user.user_id:
        raise HTTPException(403, "You can only add documents to your own farm.")
    url = body.file_url.strip()
    if not (url.startswith("/uploads/files/") or url.startswith("http")):
        raise HTTPException(400, "file_url must be an uploaded file URL.")
    docs = list(farm.verification_documents or [])
    if url not in docs:
        if len(docs) >= 10:
            raise HTTPException(400, "A maximum of 10 verification documents is allowed.")
        docs.append(url)
        farm.verification_documents = docs
    db.commit()
    db.refresh(farm)
    return s.FarmOut.from_orm_farm(farm, detail=True, private=True)


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

def _product_out(db: Session, p: Product) -> s.ProductOut:
    farm_name = p.farm.farm_name if p.farm else None
    batch_code = p.batch.batch_code if p.batch else None
    freshness = None
    if p.batch and p.batch.predictions:
        latest = max(p.batch.predictions, key=lambda pr: pr.predicted_at or _utcnow())
        freshness = float(latest.freshness_score) if latest.freshness_score is not None else None
    return s.ProductOut(
        id=p.product_id,
        name=p.name,
        category=p.category,
        description=p.description,
        unit_of_measure=p.unit_of_measure,
        price=float(p.price),
        quantity_available=float(p.quantity_available),
        status=p.status,
        image_url=p.image_url,
        farm_id=p.farm_id,
        farm_name=farm_name,
        batch_id=p.batch_id,
        batch_code=batch_code,
        freshness_score=freshness,
    )


@router.get("/products", response_model=list[s.ProductOut])
def list_products(
    search: str | None = None,
    category: str | None = None,
    farm_id: int | None = None,
    status_: str | None = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Product).options(joinedload(Product.farm), joinedload(Product.batch))
    if status_:
        if status_ not in PRODUCT_STATUS:
            raise HTTPException(400, f"status must be one of {PRODUCT_STATUS}")
        q = q.filter(Product.status == status_)
    else:
        q = q.filter(Product.status == "active")
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%") | Product.category.ilike(f"%{search}%"))
    if category:
        q = q.filter(Product.category == category)
    if farm_id:
        q = q.filter(Product.farm_id == farm_id)
    products = q.order_by(Product.product_id).offset(skip).limit(limit).all()
    return [_product_out(db, p) for p in products]


@router.get("/products/{product_id}", response_model=s.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = get_or_404(db, Product, product_id, "Product")
    return _product_out(db, p)


def _resolve_farm_for_product(db: Session, user: User, farm_id: int | None) -> Farm:
    if user.role == "admin":
        if farm_id is None:
            raise HTTPException(400, "farm_id is required for admin product creation.")
        return get_or_404(db, Farm, farm_id, "Farm")
    own = get_own_farm(user, db)
    if farm_id is not None and farm_id != own.farm_id:
        raise HTTPException(403, "You can only list products for your own farm.")
    return own


@router.post("/products", response_model=s.ProductOut, status_code=201)
def create_product(
    body: s.ProductCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin")),
):
    farm = _resolve_farm_for_product(db, user, body.farm_id)
    if body.status not in PRODUCT_STATUS:
        raise HTTPException(400, f"status must be one of {PRODUCT_STATUS}")
    batch = None
    if body.batch_id is not None:
        batch = get_or_404(db, MilkBatch, body.batch_id, "Batch")
        if batch.farm_id != farm.farm_id:
            raise HTTPException(400, "Batch does not belong to this farm.")
    p = Product(
        farm_id=farm.farm_id,
        batch_id=batch.batch_id if batch else None,
        name=body.name.strip(),
        category=body.category.strip(),
        description=body.description,
        unit_of_measure=body.unit_of_measure,
        price=body.price,
        quantity_available=body.quantity_available,
        status=body.status,
        image_url=body.image_url,
    )
    db.add(p)
    db.flush()
    db.add(PriceHistory(product_id=p.product_id, old_price=0, new_price=body.price, reason="Initial listing"))
    db.commit()
    db.refresh(p)
    return _product_out(db, p)


def _check_product_owner(db: Session, user: User, product_id: int) -> Product:
    p = get_or_404(db, Product, product_id, "Product")
    if user.role != "admin" and p.farm.user_id != user.user_id:
        raise HTTPException(403, "You can only manage your own farm's products.")
    return p


@router.patch("/products/{product_id}", response_model=s.ProductOut)
def update_product(
    product_id: int,
    body: s.ProductUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin")),
):
    p = _check_product_owner(db, user, product_id)
    if body.price is not None and body.price != p.price:
        db.add(PriceHistory(product_id=p.product_id, old_price=p.price, new_price=body.price, reason="Price update"))
        p.price = body.price
    for field in ("name", "category", "description", "unit_of_measure", "quantity_available", "image_url", "status"):
        val = getattr(body, field)
        if val is not None:
            if field == "status" and val not in PRODUCT_STATUS:
                raise HTTPException(400, f"status must be one of {PRODUCT_STATUS}")
            setattr(p, field, val.strip() if isinstance(val, str) else val)
    if body.batch_id is not None:
        batch = get_or_404(db, MilkBatch, body.batch_id, "Batch")
        if batch.farm_id != p.farm_id:
            raise HTTPException(400, "Batch does not belong to this farm.")
        p.batch_id = batch.batch_id
    db.commit()
    db.refresh(p)
    return _product_out(db, p)


@router.patch("/products/{product_id}/price", response_model=s.ProductOut)
def change_price(
    product_id: int,
    body: s.PriceChangeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin")),
):
    p = _check_product_owner(db, user, product_id)
    if body.new_price != p.price:
        db.add(PriceHistory(product_id=p.product_id, old_price=p.price, new_price=body.new_price, reason=body.reason or "Price update"))
        p.price = body.new_price
        # Alert subscribers of this farm about the price change.
        for sub in db.query(Subscription).filter(Subscription.farm_id == p.farm_id, Subscription.status == "active").all():
            notify(db, sub.user_id, "subscription", f"Price update: '{p.name}' is now Rs {float(body.new_price):.2f}.")
        db.commit()
        db.refresh(p)
    return _product_out(db, p)


@router.delete("/products/{product_id}", response_model=s.MessageOut)
def archive_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin")),
):
    p = _check_product_owner(db, user, product_id)
    p.status = "archived"
    db.commit()
    return s.MessageOut(message="Product archived.")


@router.get("/products/{product_id}/price-history", response_model=list[s.PriceHistoryOut])
def get_price_history(product_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Product, product_id, "Product")
    rows = db.query(PriceHistory).filter(PriceHistory.product_id == product_id).order_by(PriceHistory.changed_at.desc()).all()
    return [
        s.PriceHistoryOut(id=r.history_id, product_id=r.product_id, old_price=float(r.old_price), new_price=float(r.new_price), changed_at=r.changed_at, reason=r.reason)
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Discounts / pricing rules
# ---------------------------------------------------------------------------

@router.post("/products/{product_id}/discounts", response_model=s.DiscountOut, status_code=201)
def create_discount(
    product_id: int,
    body: s.DiscountCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin")),
):
    p = _check_product_owner(db, user, product_id)
    if body.valid_until <= body.valid_from:
        raise HTTPException(400, "valid_until must be after valid_from.")
    d = Discount(
        product_id=p.product_id,
        discount_percent=body.discount_percent,
        reason=body.reason,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return s.DiscountOut(id=d.discount_id, product_id=d.product_id, discount_percent=float(d.discount_percent), reason=d.reason, valid_from=d.valid_from, valid_until=d.valid_until)


@router.get("/products/{product_id}/discounts", response_model=list[s.DiscountOut])
def list_discounts(product_id: int, db: Session = Depends(get_db)):
    get_or_404(db, Product, product_id, "Product")
    rows = db.query(Discount).filter(Discount.product_id == product_id).order_by(Discount.valid_from.desc()).all()
    return [s.DiscountOut(id=r.discount_id, product_id=r.product_id, discount_percent=float(r.discount_percent), reason=r.reason, valid_from=r.valid_from, valid_until=r.valid_until) for r in rows]


@router.delete("/discounts/{discount_id}", response_model=s.MessageOut)
def delete_discount(
    discount_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin")),
):
    d = get_or_404(db, Discount, discount_id, "Discount")
    _check_product_owner(db, user, d.product_id)
    db.delete(d)
    db.commit()
    return s.MessageOut(message="Discount removed.")


@router.get("/pricing/rules", response_model=s.PricingRulesOut)
def pricing_rules(db: Session = Depends(get_db)):
    now = _utcnow()
    rows = (
        db.query(Discount)
        .filter(Discount.valid_from <= now, Discount.valid_until >= now)
        .order_by(Discount.discount_percent.desc())
        .limit(50)
        .all()
    )
    return s.PricingRulesOut(
        note="Dynamic pricing: farmers set base prices; time-limited discounts apply on top. All price changes are logged in price history.",
        active_discounts=[
            s.DiscountOut(id=r.discount_id, product_id=r.product_id, discount_percent=float(r.discount_percent), reason=r.reason, valid_from=r.valid_from, valid_until=r.valid_until)
            for r in rows
        ],
    )


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------

@router.post("/reviews", response_model=s.ReviewOut, status_code=201)
def create_review(
    body: s.ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.farm_id and not body.product_id:
        raise HTTPException(400, "A review must target a farm or a product.")
    if body.farm_id:
        get_or_404(db, Farm, body.farm_id, "Farm")
    if body.product_id:
        get_or_404(db, Product, body.product_id, "Product")
    r = Review(user_id=user.user_id, farm_id=body.farm_id, product_id=body.product_id, rating=body.rating, comment=body.comment)
    db.add(r)
    db.flush()
    if body.farm_id:
        avg = db.query(func.avg(Review.rating)).filter(Review.farm_id == body.farm_id).scalar()
        farm = db.get(Farm, body.farm_id)
        farm.rating_avg = round(float(avg), 2) if avg is not None else None
    db.commit()
    db.refresh(r)
    return s.ReviewOut(id=r.review_id, user_id=r.user_id, user_name=user.full_name, farm_id=r.farm_id, product_id=r.product_id, rating=r.rating, comment=r.comment, created_at=r.created_at)


@router.get("/reviews", response_model=list[s.ReviewOut])
def list_reviews(
    farm_id: int | None = None,
    product_id: int | None = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Review).options(joinedload(Review.user))
    if farm_id:
        q = q.filter(Review.farm_id == farm_id)
    if product_id:
        q = q.filter(Review.product_id == product_id)
    rows = q.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    return [
        s.ReviewOut(id=r.review_id, user_id=r.user_id, user_name=r.user.full_name if r.user else None, farm_id=r.farm_id, product_id=r.product_id, rating=r.rating, comment=r.comment, created_at=r.created_at)
        for r in rows
    ]
