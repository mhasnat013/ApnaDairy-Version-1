"""Analytics: role dashboards (live aggregates) + farm analytics snapshots."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import schemas as s
from app.database import get_db
from app.auth.deps import get_current_user, get_own_farm, require_role
from app.models import (
    AIPrediction,
    BulkPurchaseRequest,
    Complaint,
    Farm,
    FarmAnalytics,
    MilkBatch,
    Order,
    Payment,
    Product,
    Quotation,
    Subscription,
    User,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _farm_revenue(db: Session, farm_id: int) -> float:
    revenue = 0.0
    for (items,) in (
        db.query(Order.order_items)
        .filter(Order.status.in_(("paid", "in_transit", "delivered")))
        .all()
    ):
        for item in (items or {}).get("items", []):
            if item.get("farm_id") == farm_id:
                revenue += float(item.get("quantity", 0)) * float(item.get("price", 0))
    return round(revenue, 2)


@router.get("/farmer/overview", response_model=s.FarmerOverviewOut)
def farmer_overview(db: Session = Depends(get_db), user: User = Depends(require_role("farmer"))):
    farm = get_own_farm(user, db)
    total_batches = db.query(func.count(MilkBatch.batch_id)).filter(MilkBatch.farm_id == farm.farm_id).scalar()
    total_products = db.query(func.count(Product.product_id)).filter(Product.farm_id == farm.farm_id, Product.status == "active").scalar()
    active_orders = 0
    for (items, order_status) in db.query(Order.order_items, Order.status).filter(Order.status.in_(("paid", "preparing", "confirmed"))).all():
        if any(i.get("farm_id") == farm.farm_id for i in (items or {}).get("items", [])):
            active_orders += 1
    avg_fresh = (
        db.query(func.avg(AIPrediction.freshness_score))
        .join(MilkBatch, MilkBatch.batch_id == AIPrediction.batch_id)
        .filter(MilkBatch.farm_id == farm.farm_id)
        .scalar()
    )
    # Farmers need complaints linked to their farm, not complaints they raised
    # personally as a user account.
    open_complaints = db.query(func.count(Complaint.complaint_id)).filter(
        Complaint.farm_id == farm.farm_id, Complaint.status == "open"
    ).scalar()
    return s.FarmerOverviewOut(
        farm_id=farm.farm_id,
        total_batches=total_batches,
        total_products=total_products,
        active_orders=active_orders,
        total_revenue=_farm_revenue(db, farm.farm_id),
        avg_freshness_score=round(float(avg_fresh), 1) if avg_fresh is not None else None,
        open_complaints=open_complaints,
    )


@router.get("/admin/overview", response_model=s.AdminOverviewOut)
def admin_overview(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == "completed").scalar() or 0
    return s.AdminOverviewOut(
        total_users=db.query(func.count(User.user_id)).scalar(),
        total_farms=db.query(func.count(Farm.farm_id)).scalar(),
        pending_farms=db.query(func.count(Farm.farm_id)).filter(Farm.verification_status == "pending").scalar(),
        total_batches=db.query(func.count(MilkBatch.batch_id)).scalar(),
        total_orders=db.query(func.count(Order.order_id)).scalar(),
        total_revenue=float(revenue),
        open_complaints=db.query(func.count(Complaint.complaint_id)).filter(Complaint.status == "open").scalar(),
        active_subscriptions=db.query(func.count(Subscription.subscription_id)).filter(Subscription.status == "active").scalar(),
    )


@router.get("/business/overview", response_model=s.BusinessOverviewOut)
def business_overview(db: Session = Depends(get_db), user: User = Depends(require_role("business"))):
    open_requests = db.query(func.count(BulkPurchaseRequest.request_id)).filter(
        BulkPurchaseRequest.buyer_id == user.user_id, BulkPurchaseRequest.status == "open"
    ).scalar()
    total_q = db.query(func.count(Quotation.quotation_id)).join(BulkPurchaseRequest).filter(BulkPurchaseRequest.buyer_id == user.user_id).scalar()
    accepted_q = db.query(func.count(Quotation.quotation_id)).join(BulkPurchaseRequest).filter(
        BulkPurchaseRequest.buyer_id == user.user_id, Quotation.status == "accepted"
    ).scalar()
    spent = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
        Order.user_id == user.user_id, Order.status.in_(("paid", "in_transit", "delivered"))
    ).scalar() or 0
    return s.BusinessOverviewOut(
        open_requests=open_requests, total_quotations=total_q,
        accepted_quotations=accepted_q, total_spent=float(spent),
    )


# ---------------------------------------------------------------------------
# Farm analytics snapshots (ERD: farm_analytics)
# ---------------------------------------------------------------------------

def _snap_out(x: FarmAnalytics) -> s.FarmAnalyticsOut:
    return s.FarmAnalyticsOut(
        id=x.analytics_id, farm_id=x.farm_id,
        product_category=x.product_category, period_start=x.period_start, period_end=x.period_end,
        quantity_produced=x.quantity_produced, quantity_sold=x.quantity_sold,
        quantity_wasted=x.quantity_wasted, revenue=x.revenue, cost=x.cost,
        profit=x.profit, loss=x.loss, created_at=x.created_at,
    )


@router.post("/farms/{farm_id}/snapshots", response_model=s.FarmAnalyticsOut, status_code=201)
def create_snapshot(
    farm_id: int,
    body: s.FarmAnalyticsSnapshot,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin")),
):
    farm = db.get(Farm, farm_id)
    if farm is None:
        raise HTTPException(404, "Farm not found")
    if user.role == "farmer" and farm.user_id != user.user_id:
        raise HTTPException(404, "Farm not found")
    if body.period_end < body.period_start:
        raise HTTPException(400, "period_end must be on or after period_start.")
    x = FarmAnalytics(
        farm_id=farm.farm_id,
        product_category=body.product_category.strip(),
        period_start=body.period_start,
        period_end=body.period_end,
        quantity_produced=body.quantity_produced,
        quantity_sold=body.quantity_sold,
        quantity_wasted=body.quantity_wasted,
        revenue=body.revenue,
        cost=body.cost,
        profit=body.revenue - body.cost,
        loss=body.loss,
    )
    db.add(x)
    db.commit()
    db.refresh(x)
    return _snap_out(x)


@router.get("/farms/{farm_id}/snapshots", response_model=list[s.FarmAnalyticsOut])
def list_snapshots(
    farm_id: int,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    farm = db.get(Farm, farm_id)
    if farm is None:
        raise HTTPException(404, "Farm not found")
    if user.role == "farmer" and farm.user_id != user.user_id:
        raise HTTPException(404, "Farm not found")
    rows = (
        db.query(FarmAnalytics)
        .filter(FarmAnalytics.farm_id == farm_id)
        .order_by(FarmAnalytics.period_start.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_snap_out(x) for x in rows]
