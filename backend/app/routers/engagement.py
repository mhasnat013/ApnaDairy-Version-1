"""Subscriptions, reviews, complaints, notifications."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app import schemas as s
from app.database import get_db
from app.auth.deps import get_current_user, require_role
from app.models import (
    Complaint,
    Farm,
    Notification,
    Product,
    Review,
    Subscription,
    User,
)
from app.models.enums import COMPLAINT_STATUS, SUBSCRIPTION_FREQUENCY
from app.routers._helpers import get_or_404, log_admin_action, notify

router = APIRouter(tags=["engagement"])


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Subscriptions (customers) — user subscribes to a farm's recurring delivery
# ---------------------------------------------------------------------------

def _sub_out(x: Subscription) -> s.SubscriptionOut:
    return s.SubscriptionOut(
        id=x.subscription_id,
        user_id=x.user_id,
        farm_id=x.farm_id,
        farm_name=x.farm.farm_name if x.farm else None,
        product_id=x.product_id,
        product_name=x.product.name if x.product else None,
        frequency=x.frequency,
        status=x.status,
        created_at=x.created_at,
    )


@router.post("/subscriptions", response_model=s.SubscriptionOut, status_code=201)
def create_subscription(
    body: s.SubscriptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("customer")),
):
    farm = get_or_404(db, Farm, body.farm_id, "Farm")
    if farm.verification_status != "verified":
        raise HTTPException(400, "This farm is not verified yet.")
    if body.product_id is not None:
        product = get_or_404(db, Product, body.product_id, "Product")
        if product.farm_id != farm.farm_id:
            raise HTTPException(400, "Product does not belong to this farm.")
        if product.status != "active":
            raise HTTPException(400, "Product is not available for subscription.")
    existing = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user.user_id,
            Subscription.farm_id == farm.farm_id,
            Subscription.product_id == body.product_id,
            Subscription.status == "active",
        )
        .first()
    )
    if existing:
        raise HTTPException(409, "You already have an active subscription for this.")
    x = Subscription(
        user_id=user.user_id,
        farm_id=farm.farm_id,
        product_id=body.product_id,
        frequency=body.frequency,
        status="active",
    )
    db.add(x)
    db.commit()
    db.refresh(x)
    return _sub_out(x)


@router.get("/subscriptions", response_model=list[s.SubscriptionOut])
def list_subscriptions(
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("customer", "admin")),
):
    q = db.query(Subscription).options(joinedload(Subscription.product))
    if user.role != "admin":
        q = q.filter(Subscription.user_id == user.user_id)
    return [_sub_out(x) for x in q.order_by(Subscription.created_at.desc()).offset(skip).limit(limit).all()]


@router.patch("/subscriptions/{subscription_id}", response_model=s.SubscriptionOut)
def update_subscription(
    subscription_id: int,
    body: s.SubscriptionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("customer", "admin")),
):
    x = get_or_404(db, Subscription, subscription_id, "Subscription")
    if user.role != "admin" and x.user_id != user.user_id:
        raise HTTPException(404, "Subscription not found")
    if body.status is not None:
        if body.status not in ("active", "paused", "cancelled"):
            raise HTTPException(400, "status must be active, paused or cancelled")
        x.status = body.status
    if body.frequency is not None:
        if body.frequency not in SUBSCRIPTION_FREQUENCY:
            raise HTTPException(400, f"frequency must be one of {SUBSCRIPTION_FREQUENCY}")
        x.frequency = body.frequency
    db.commit()
    db.refresh(x)
    return _sub_out(x)


# ---------------------------------------------------------------------------
@router.delete("/reviews/{review_id}", response_model=s.MessageOut)
def delete_review(review_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = get_or_404(db, Review, review_id, "Review")
    if r.user_id != user.user_id and user.role != "admin":
        raise HTTPException(404, "Review not found")
    db.delete(r)
    db.commit()
    return s.MessageOut(message="Review deleted.")


# ---------------------------------------------------------------------------
# Complaints
# ---------------------------------------------------------------------------

def _complaint_out(c: Complaint) -> s.ComplaintOut:
    return s.ComplaintOut(
        id=c.complaint_id,
        user_id=c.user_id,
        order_id=c.order_id,
        subject=c.subject,
        description=c.description,
        status=c.status,
        category=c.category,
        priority=c.priority,
        farm_id=c.farm_id,
        batch_id=c.batch_id,
        escalated_by_admin_id=c.escalated_by_admin_id,
        escalated_at=c.escalated_at,
        admin_remarks=c.admin_remarks,
        resolution_notes=c.resolution_notes,
        created_at=c.created_at,
        resolved_at=c.resolved_at,
        updated_at=c.updated_at,
    )


@router.post("/complaints", response_model=s.ComplaintOut, status_code=201)
def create_complaint(
    body: s.ComplaintCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.order_id is not None:
        from app.models import Order
        order = db.get(Order, body.order_id)
        if order is None or (order.user_id != user.user_id and user.role != "admin"):
            raise HTTPException(400, "Invalid order reference.")
    c = Complaint(
        user_id=user.user_id,
        order_id=body.order_id,
        subject=body.subject.strip(),
        description=body.description.strip(),
        status="open",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _complaint_out(c)


@router.get("/complaints", response_model=list[s.ComplaintOut])
def list_complaints(
    status_: str | None = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Complaint)
    if user.role == "farmer":
        farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()
        q = q.filter(Complaint.farm_id == (farm.farm_id if farm else -1))
    elif user.role not in ("admin", "superadmin"):
        q = q.filter(Complaint.user_id == user.user_id)
    if status_:
        if status_ not in COMPLAINT_STATUS:
            raise HTTPException(400, f"status must be one of {COMPLAINT_STATUS}")
        q = q.filter(Complaint.status == status_)
    return [_complaint_out(c) for c in q.order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()]


@router.get("/complaints/{complaint_id}", response_model=s.ComplaintOut)
def get_complaint(complaint_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = get_or_404(db, Complaint, complaint_id, "Complaint")
    if user.role == "farmer":
        farm = db.query(Farm).filter(Farm.user_id == user.user_id).first()
        if farm is None or c.farm_id != farm.farm_id:
            raise HTTPException(404, "Complaint not found")
    elif c.user_id != user.user_id and user.role not in ("admin", "superadmin"):
        raise HTTPException(404, "Complaint not found")
    return _complaint_out(c)


@router.patch("/complaints/{complaint_id}", response_model=s.ComplaintOut)
def update_complaint(
    complaint_id: int,
    body: s.ComplaintUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "superadmin")),
):
    c = get_or_404(db, Complaint, complaint_id, "Complaint")
    if body.status not in COMPLAINT_STATUS:
        raise HTTPException(400, f"status must be one of {COMPLAINT_STATUS}")
    c.status = body.status
    if body.status == "resolved":
        c.resolved_at = _utcnow()
    notify(db, c.user_id, "system", f"Your complaint '{c.subject}' is now '{body.status}'.")
    log_admin_action(db, user.user_id, f"complaint_{body.status}", "complaint", c.complaint_id, f"Complaint #{c.complaint_id} -> {body.status}")
    db.commit()
    db.refresh(c)
    return _complaint_out(c)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@router.get("/notifications", response_model=list[s.NotificationOut])
def list_notifications(
    unread_only: bool = False,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == user.user_id)
    if unread_only:
        q = q.filter(Notification.is_read == False)  # noqa: E712
    rows = q.order_by(Notification.sent_at.desc()).offset(skip).limit(limit).all()
    return [
        s.NotificationOut(id=n.notification_id, user_id=n.user_id, type=n.type, message=n.message, is_read=n.is_read, sent_at=n.sent_at)
        for n in rows
    ]


@router.get("/notifications/unread-count", response_model=dict)
def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = db.query(Notification).filter(Notification.user_id == user.user_id, Notification.is_read == False).count()  # noqa: E712
    return {"unread": count}


@router.post("/notifications/{notification_id}/read", response_model=s.MessageOut)
def mark_read(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    n = get_or_404(db, Notification, notification_id, "Notification")
    if n.user_id != user.user_id:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    return s.MessageOut(message="Marked as read.")


@router.post("/notifications/read-all", response_model=s.MessageOut)
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == user.user_id, Notification.is_read == False).update({"is_read": True})  # noqa: E712
    db.commit()
    return s.MessageOut(message="All notifications marked as read.")
