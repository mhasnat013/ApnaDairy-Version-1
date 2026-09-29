"""Admin: user management, farm verification approvals, audit logs, analytics."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import schemas as s
from app.database import get_db
from app.auth.deps import get_current_user, require_role
from app.models import (
    AdminActionLog,
    ChatbotMessage,
    Complaint,
    Farm,
    MilkBatch,
    Order,
    Payment,
    Product,
    Subscription,
    User,
    EscalationCase,
)
from app.models.enums import (
    ESCALATION_CASE_TYPES, ESCALATION_PRIORITIES, FARM_VERIFICATION,
    USER_ROLES, USER_STATUS,
)
from app.routers._helpers import get_or_404, log_admin_action, notify

router = APIRouter(prefix="/admin", tags=["admin"])


def _user_out(u: User) -> s.UserOut:
    return s.UserOut(
        id=u.user_id, full_name=u.full_name, email=u.email, phone=u.phone,
        role=u.role, address_line=u.address_line, city=u.city,
        is_verified=u.is_verified, status=u.status, created_at=u.created_at,
    )


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=list[s.UserOut])
def list_users(
    role: str | None = None,
    status_: str | None = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "superadmin")),
):
    q = db.query(User)
    if user.role == "admin":
        q = q.filter(User.role != "superadmin")
    if role:
        if role not in USER_ROLES:
            raise HTTPException(400, f"role must be one of {USER_ROLES}")
        q = q.filter(User.role == role)
    if status_:
        if status_ not in USER_STATUS:
            raise HTTPException(400, f"status must be one of {USER_STATUS}")
        q = q.filter(User.status == status_)
    return [_user_out(u) for u in q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()]


@router.get("/users/{user_id}", response_model=s.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "superadmin"))):
    target = get_or_404(db, User, user_id, "User")
    if user.role == "admin" and target.role == "superadmin":
        raise HTTPException(404, "User not found")
    return _user_out(target)


@router.patch("/users/{user_id}/status", response_model=s.UserOut)
def set_user_status(
    user_id: int,
    body: s.AdminUserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "superadmin")),
):
    if body.status is None:
        raise HTTPException(400, "status is required.")
    if body.status not in USER_STATUS:
        raise HTTPException(400, f"status must be one of {USER_STATUS}")
    target = get_or_404(db, User, user_id, "User")
    if target.user_id == user.user_id:
        raise HTTPException(400, "You cannot change your own status.")
    if target.role == "superadmin":
        raise HTTPException(403, "Super Admin accounts cannot be changed through this endpoint.")
    if user.role == "admin" and target.role == "admin":
        raise HTTPException(403, "Only a Super Admin can manage Admin accounts.")
    target.status = body.status
    log_admin_action(db, user.user_id, f"user_status:{body.status}", "user", target.user_id, f"{target.email} → {body.status}")
    if target.role == "rider" and body.status == "active":
        notify(db, target.user_id, "system", "Your rider account has been approved. You can now log in and accept deliveries.")
    else:
        notify(db, target.user_id, "system", f"Your account status is now '{body.status}'.")
    db.commit()
    db.refresh(target)
    return _user_out(target)


# ---------------------------------------------------------------------------
# Farm verification approvals
# ---------------------------------------------------------------------------

@router.get("/farms/pending", response_model=list[s.FarmOut])
def pending_farms(
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "superadmin")),
):
    rows = (
        db.query(Farm)
        .options(joinedload(Farm.owner))
        .filter(Farm.verification_status == "pending")
        .order_by(Farm.created_at)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [s.FarmOut.from_orm_farm(f, detail=True, private=True) for f in rows]


@router.post("/farms/{farm_id}/verify", response_model=s.FarmOut)
def verify_farm(
    farm_id: int,
    body: s.FarmVerifyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "superadmin")),
):
    farm = get_or_404(db, Farm, farm_id, "Farm")
    decision = body.verification_status
    if decision not in ("verified", "rejected"):
        raise HTTPException(400, "verification_status must be 'verified' or 'rejected'")
    farm.verification_status = decision
    farm.owner.is_verified = decision == "verified"
    log_admin_action(db, user.user_id, f"farm_{decision}", "farm", farm.farm_id, farm.farm_name)
    notify(db, farm.user_id, "system", f"Your farm '{farm.farm_name}' has been {decision}.")
    db.commit()
    db.refresh(farm)
    return s.FarmOut.from_orm_farm(farm, detail=True, private=True)


# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------

@router.get("/action-logs", response_model=list[s.ActionLogOut])
def action_logs(
    action: str | None = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "superadmin")),
):
    q = db.query(AdminActionLog).options(joinedload(AdminActionLog.admin))
    if action:
        q = q.filter(AdminActionLog.action.ilike(f"%{action}%"))
    rows = q.order_by(AdminActionLog.created_at.desc()).offset(skip).limit(limit).all()
    return [
        s.ActionLogOut(
            id=r.log_id, admin_id=r.admin_id,
            admin_name=r.admin.full_name if r.admin else None,
            action=r.action, entity_type=r.entity_type, entity_id=r.entity_id,
            description=r.description, created_at=r.created_at,
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Platform analytics
# ---------------------------------------------------------------------------

@router.get("/analytics/overview", response_model=dict)
def platform_overview(db: Session = Depends(get_db), user: User = Depends(require_role("admin", "superadmin"))):
    users_by_role = {
        role: count for role, count in db.query(User.role, func.count()).group_by(User.role).all()
    }
    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == "completed").scalar() or 0
    total_users = db.query(func.count(User.user_id)).scalar()
    total_farms = db.query(func.count(Farm.farm_id)).scalar()
    return {
        "usersByRole": users_by_role,
        "farms": total_farms,
        "verifiedFarms": db.query(func.count(Farm.farm_id)).filter(Farm.verification_status == "verified").scalar(),
        "batches": db.query(func.count(MilkBatch.batch_id)).scalar(),
        "products": db.query(func.count(Product.product_id)).filter(Product.status == "active").scalar(),
        "orders": db.query(func.count(Order.order_id)).scalar(),
        "revenue": float(total_revenue),
        # Contract keys expected by the admin frontend (AdminOverview).
        "totalUsers": total_users,
        "totalFarms": total_farms,
        "pendingFarms": db.query(func.count(Farm.farm_id)).filter(Farm.verification_status == "pending").scalar(),
        "totalBatches": db.query(func.count(MilkBatch.batch_id)).scalar(),
        "totalOrders": db.query(func.count(Order.order_id)).scalar(),
        "totalRevenue": float(total_revenue),
        "openComplaints": db.query(func.count(Complaint.complaint_id)).filter(Complaint.status == "open").scalar(),
        "activeSubscriptions": db.query(func.count(Subscription.subscription_id)).filter(Subscription.status == "active").scalar(),
    }


@router.get("/analytics/farms", response_model=list[dict])
def farm_analytics(
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "superadmin")),
):
    """Per-farm aggregates computed live from orders and batches."""
    farms = db.query(Farm).order_by(Farm.farm_id).offset(skip).limit(limit).all()
    out = []
    for f in farms:
        batch_count = db.query(func.count(MilkBatch.batch_id)).filter(MilkBatch.farm_id == f.farm_id).scalar()
        total_liters = db.query(func.coalesce(func.sum(MilkBatch.quantity_liters), 0)).filter(MilkBatch.farm_id == f.farm_id).scalar() or 0
        # Revenue from order items referencing this farm.
        revenue = 0.0
        for (items,) in db.query(Order.order_items).filter(Order.status.in_(("paid", "in_transit", "delivered"))).all():
            for item in (items or {}).get("items", []):
                if item.get("farm_id") == f.farm_id:
                    revenue += float(item.get("quantity", 0)) * float(item.get("price", 0))
        out.append({
            "farmId": f.farm_id,
            "farmName": f.farm_name,
            "verificationStatus": f.verification_status,
            "batchCount": batch_count,
            "totalLiters": float(total_liters),
            "revenue": round(revenue, 2),
        })
    return out


# ---------------------------------------------------------------------------
# Chatbot oversight (read-only)
# ---------------------------------------------------------------------------

@router.get("/chat/sessions", response_model=list[dict])
def chat_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "superadmin")),
):
    """Distinct chatbot sessions with owner, message count and last activity."""
    rows = (
        db.query(
            ChatbotMessage.session_id,
            ChatbotMessage.user_id,
            func.count(ChatbotMessage.message_id).label("messages"),
            func.max(ChatbotMessage.sent_at).label("last_at"),
        )
        .group_by(ChatbotMessage.session_id, ChatbotMessage.user_id)
        .order_by(func.max(ChatbotMessage.sent_at).desc())
        .limit(100)
        .all()
    )
    users = {u.user_id: u for u in db.query(User).filter(User.user_id.in_([r.user_id for r in rows if r.user_id])).all()}
    return [
        {
            "session_id": r.session_id,
            "user_id": r.user_id,
            "user_email": users.get(r.user_id).email if r.user_id in users else None,
            "messages": r.messages,
            "last_at": r.last_at.isoformat() if r.last_at else None,
        }
        for r in rows
    ]


@router.get("/chat/sessions/{session_id}", response_model=list[dict])
def chat_session_messages(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "superadmin")),
):
    """Read the messages of one chatbot session (oversight)."""
    rows = (
        db.query(ChatbotMessage)
        .filter(ChatbotMessage.session_id == session_id)
        .order_by(ChatbotMessage.sent_at)
        .limit(500)
        .all()
    )
    return [
        {
            "id": m.message_id,
            "session_id": m.session_id,
            "user_id": m.user_id,
            "sender": m.sender,
            "message_text": m.message_text,
            "sent_at": m.sent_at.isoformat() if m.sent_at else None,
        }
        for m in rows
    ]


@router.post("/escalations", response_model=dict, status_code=201)
def create_escalation(
    body: s.CaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    if body.case_type not in ESCALATION_CASE_TYPES:
        raise HTTPException(400, f"caseType must be one of {ESCALATION_CASE_TYPES}")
    if body.priority not in ESCALATION_PRIORITIES:
        raise HTTPException(400, f"priority must be one of {ESCALATION_PRIORITIES}")
    for model, pk, label in (
        (Farm, body.farm_id, "Farm"), (MilkBatch, body.batch_id, "Milk batch"),
        (User, body.user_id, "User"), (Complaint, body.complaint_id, "Complaint"),
    ):
        if pk is not None:
            get_or_404(db, model, pk, label)
    row = EscalationCase(
        case_code=f"ESC-{uuid4().hex[:10].upper()}", case_type=body.case_type,
        category=body.category, title=body.title, description=body.description,
        priority=body.priority, raised_by_admin_id=user.user_id,
        farm_id=body.farm_id, batch_id=body.batch_id, user_id=body.user_id,
        complaint_id=body.complaint_id, admin_remarks=body.admin_remarks,
    )
    db.add(row)
    db.flush()
    log_admin_action(db, user.user_id, "case_escalated", "escalation_case", row.case_id, row.case_code)
    db.commit()
    db.refresh(row)
    return {"id": row.case_id, "caseCode": row.case_code, "status": row.status}


@router.post("/complaints/{complaint_id}/escalate", response_model=dict, status_code=201)
def escalate_complaint(
    complaint_id: int, body: s.ComplaintEscalate, db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    complaint = get_or_404(db, Complaint, complaint_id, "Complaint")
    existing = db.query(EscalationCase).filter(EscalationCase.complaint_id == complaint_id, ~EscalationCase.status.in_(("resolved", "closed"))).first()
    if existing:
        raise HTTPException(409, "This complaint already has an open escalation.")
    if body.priority not in ESCALATION_PRIORITIES:
        raise HTTPException(400, f"priority must be one of {ESCALATION_PRIORITIES}")
    complaint.category = body.category
    complaint.priority = body.priority
    complaint.escalated_by_admin_id = user.user_id
    complaint.escalated_at = datetime.now(timezone.utc)
    complaint.admin_remarks = body.admin_remarks
    row = EscalationCase(
        case_code=f"ESC-{uuid4().hex[:10].upper()}", case_type="complaint",
        category=body.category, title=complaint.subject, description=complaint.description,
        priority=body.priority, raised_by_admin_id=user.user_id,
        complaint_id=complaint.complaint_id, admin_remarks=body.admin_remarks,
    )
    db.add(row)
    db.flush()
    log_admin_action(db, user.user_id, "complaint_escalated", "complaint", complaint.complaint_id, row.case_code)
    db.commit()
    return {"id": row.case_id, "caseCode": row.case_code, "status": row.status}
