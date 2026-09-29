"""Super Admin governance, escalations and platform oversight."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app import schemas as s
from app.auth.deps import require_role
from app.core.config import get_settings
from app.db.database import get_db
from app.models import (
    AIPrediction,
    AdminActionLog,
    AdminApplication,
    AdminFarmAssignment,
    Complaint,
    EscalationCase,
    Farm,
    IoTSensorReading,
    MilkBatch,
    PlatformSetting,
    User,
)
from app.models.enums import (
    ADMIN_APPLICATION_STATUS,
    ESCALATION_CASE_TYPES,
    ESCALATION_PRIORITIES,
    ESCALATION_STATUS,
    USER_STATUS,
)
from app.api.routes._helpers import get_or_404, log_admin_action, notify

router = APIRouter(prefix="/super-admin", tags=["super-admin"])


def _now():
    return datetime.now(timezone.utc)


def _user(u: User) -> dict:
    return {
        "id": u.user_id, "fullName": u.full_name, "email": u.email,
        "phone": u.phone, "role": u.role, "status": u.status,
        "isVerified": u.is_verified, "city": u.city, "createdAt": u.created_at,
    }


def _case(x: EscalationCase) -> dict:
    return {
        "id": x.case_id, "caseCode": x.case_code, "caseType": x.case_type,
        "category": x.category, "title": x.title, "description": x.description,
        "priority": x.priority, "status": x.status,
        "raisedByAdminId": x.raised_by_admin_id,
        "assignedToSuperadminId": x.assigned_to_superadmin_id,
        "farmId": x.farm_id, "batchId": x.batch_id, "userId": x.user_id,
        "complaintId": x.complaint_id, "adminRemarks": x.admin_remarks,
        "resolutionNotes": x.resolution_notes, "createdAt": x.created_at,
        "updatedAt": x.updated_at, "resolvedAt": x.resolved_at,
    }


def _application(x: AdminApplication) -> dict:
    return {
        "id": x.application_id, "applicantUserId": x.applicant_user_id,
        "requestedRole": x.requested_role, "reason": x.reason, "status": x.status,
        "submittedAt": x.submitted_at, "reviewedBySuperadminId": x.reviewed_by_superadmin_id,
        "reviewedAt": x.reviewed_at, "reviewNotes": x.review_notes,
    }


def _assignment(x: AdminFarmAssignment) -> dict:
    return {
        "id": x.assignment_id, "adminId": x.admin_id, "farmId": x.farm_id,
        "assignedBySuperadminId": x.assigned_by_superadmin_id,
        "assignedAt": x.assigned_at, "revokedAt": x.revoked_at, "isActive": x.is_active,
    }


@router.get("/dashboard", response_model=dict)
def dashboard(db: Session = Depends(get_db), actor: User = Depends(require_role("superadmin"))):
    del actor
    return {
        "totalUsers": db.query(func.count(User.user_id)).filter(User.role != "superadmin").scalar(),
        "admins": db.query(func.count(User.user_id)).filter(User.role == "admin", User.status == "active").scalar(),
        "farms": db.query(func.count(Farm.farm_id)).scalar(),
        "pendingFarms": db.query(func.count(Farm.farm_id)).filter(Farm.verification_status == "pending").scalar(),
        "milkBatches": db.query(func.count(MilkBatch.batch_id)).scalar(),
        "aiAnomalies": db.query(func.count(AIPrediction.prediction_id)).filter(AIPrediction.anomaly_flag.is_(True)).scalar(),
        "openComplaints": db.query(func.count(Complaint.complaint_id)).filter(Complaint.status.in_(("open", "in_review"))).scalar(),
        "openCases": db.query(func.count(EscalationCase.case_id)).filter(~EscalationCase.status.in_(("resolved", "closed"))).scalar(),
        "pendingAdminApplications": db.query(func.count(AdminApplication.application_id)).filter(AdminApplication.status == "pending").scalar(),
    }


@router.get("/users", response_model=list[dict])
def users(
    role: str | None = None, status_: str | None = Query(default=None, alias="status"),
    search: str | None = None, skip: int = 0, limit: int = Query(50, le=200),
    db: Session = Depends(get_db), actor: User = Depends(require_role("superadmin")),
):
    del actor
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if status_:
        q = q.filter(User.status == status_)
    if search:
        pattern = f"%{search.strip()}%"
        q = q.filter(or_(User.full_name.ilike(pattern), User.email.ilike(pattern), User.phone.ilike(pattern)))
    return [_user(x) for x in q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()]


@router.get("/users/{user_id}", response_model=dict)
def user_detail(user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_role("superadmin"))):
    del actor
    return _user(get_or_404(db, User, user_id, "User"))


@router.patch("/users/{user_id}/status", response_model=dict)
def update_user(
    user_id: int, body: s.SuperAdminUserUpdate, db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    target = get_or_404(db, User, user_id, "User")
    if target.user_id == actor.user_id:
        raise HTTPException(400, "You cannot change your own account.")
    if target.role == "superadmin":
        raise HTTPException(403, "Super Admin accounts cannot be changed through this endpoint.")
    if body.status is not None:
        if body.status not in USER_STATUS:
            raise HTTPException(400, f"status must be one of {USER_STATUS}")
        target.status = body.status
    if body.is_verified is not None:
        target.is_verified = body.is_verified
    log_admin_action(db, actor.user_id, "superadmin_user_update", "user", target.user_id, target.email)
    notify(db, target.user_id, "system", f"Your account status is now '{target.status}'.")
    db.commit()
    db.refresh(target)
    return _user(target)


@router.post("/admin-applications", response_model=dict, status_code=201)
def create_application(
    body: s.AdminApplicationCreate, db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    applicant = get_or_404(db, User, body.applicant_user_id, "Applicant")
    if applicant.role in ("admin", "superadmin"):
        raise HTTPException(409, "This account already has privileged access.")
    exists = db.query(AdminApplication).filter(AdminApplication.applicant_user_id == applicant.user_id, AdminApplication.status == "pending").first()
    if exists:
        raise HTTPException(409, "A pending application already exists.")
    row = AdminApplication(applicant_user_id=applicant.user_id, requested_role="admin", reason=body.reason)
    db.add(row)
    db.flush()
    log_admin_action(db, actor.user_id, "admin_application_created", "admin_application", row.application_id, applicant.email)
    db.commit()
    db.refresh(row)
    return _application(row)


@router.get("/admin-applications", response_model=list[dict])
def applications(
    status_: str | None = Query(default=None, alias="status"), skip: int = 0,
    limit: int = Query(50, le=200), db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    del actor
    q = db.query(AdminApplication)
    if status_:
        q = q.filter(AdminApplication.status == status_)
    return [_application(x) for x in q.order_by(AdminApplication.submitted_at.desc()).offset(skip).limit(limit).all()]


@router.patch("/admin-applications/{application_id}", response_model=dict)
def decide_application(
    application_id: int, body: s.AdminApplicationDecision, db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    row = get_or_404(db, AdminApplication, application_id, "Admin application")
    if row.status != "pending":
        raise HTTPException(409, "This application has already been decided.")
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "status must be approved or rejected")
    applicant = get_or_404(db, User, row.applicant_user_id, "Applicant")
    if applicant.role == "superadmin":
        raise HTTPException(403, "Super Admin accounts cannot be managed here.")
    row.status = body.status
    row.review_notes = body.review_notes
    row.reviewed_by_superadmin_id = actor.user_id
    row.reviewed_at = _now()
    if body.status == "approved":
        applicant.role = "admin"
        applicant.status = "active"
        applicant.is_verified = True
    notify(db, applicant.user_id, "system", f"Your Admin access application was {body.status}.")
    log_admin_action(db, actor.user_id, f"admin_application_{body.status}", "admin_application", row.application_id, applicant.email)
    db.commit()
    db.refresh(row)
    return _application(row)


@router.get("/admin-assignments", response_model=list[dict])
def assignments(
    active_only: bool = True, db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    del actor
    q = db.query(AdminFarmAssignment)
    if active_only:
        q = q.filter(AdminFarmAssignment.is_active.is_(True))
    return [_assignment(x) for x in q.order_by(AdminFarmAssignment.assigned_at.desc()).all()]


@router.post("/admin-assignments", response_model=dict, status_code=201)
def create_assignment(
    body: s.AssignmentCreate, db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    admin = get_or_404(db, User, body.admin_id, "Admin")
    get_or_404(db, Farm, body.farm_id, "Farm")
    if admin.role != "admin" or admin.status != "active":
        raise HTTPException(400, "Assignments require an active Admin account.")
    existing = db.query(AdminFarmAssignment).filter_by(admin_id=body.admin_id, farm_id=body.farm_id).first()
    if existing:
        if existing.is_active:
            raise HTTPException(409, "This assignment already exists.")
        existing.is_active, existing.revoked_at, existing.assigned_at = True, None, _now()
        existing.assigned_by_superadmin_id = actor.user_id
        row = existing
    else:
        row = AdminFarmAssignment(admin_id=body.admin_id, farm_id=body.farm_id, assigned_by_superadmin_id=actor.user_id)
        db.add(row)
    db.flush()
    log_admin_action(db, actor.user_id, "admin_farm_assigned", "farm", body.farm_id, admin.email)
    notify(db, admin.user_id, "system", f"You were assigned to farm #{body.farm_id}.")
    db.commit()
    db.refresh(row)
    return _assignment(row)


@router.delete("/admin-assignments/{assignment_id}", response_model=dict)
def revoke_assignment(
    assignment_id: int, db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    row = get_or_404(db, AdminFarmAssignment, assignment_id, "Assignment")
    if not row.is_active:
        raise HTTPException(409, "Assignment is already inactive.")
    row.is_active, row.revoked_at = False, _now()
    log_admin_action(db, actor.user_id, "admin_farm_unassigned", "farm", row.farm_id, f"Admin #{row.admin_id}")
    db.commit()
    return {"message": "Assignment revoked."}


@router.get("/cases", response_model=list[dict])
def cases(
    kind: str | None = None, status_: str | None = Query(default=None, alias="status"),
    category: str | None = None, priority: str | None = None, search: str | None = None,
    skip: int = 0, limit: int = Query(50, le=200), db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    del actor
    q = db.query(EscalationCase)
    if kind: q = q.filter(EscalationCase.case_type == kind)
    if status_: q = q.filter(EscalationCase.status == status_)
    if category: q = q.filter(EscalationCase.category == category)
    if priority: q = q.filter(EscalationCase.priority == priority)
    if search:
        p = f"%{search.strip()}%"
        q = q.filter(or_(EscalationCase.case_code.ilike(p), EscalationCase.title.ilike(p), EscalationCase.description.ilike(p)))
    return [_case(x) for x in q.order_by(EscalationCase.created_at.desc()).offset(skip).limit(limit).all()]


@router.get("/cases/{case_id}", response_model=dict)
def case_detail(case_id: int, db: Session = Depends(get_db), actor: User = Depends(require_role("superadmin"))):
    del actor
    return _case(get_or_404(db, EscalationCase, case_id, "Case"))


@router.patch("/cases/{case_id}", response_model=dict)
def update_case(
    case_id: int, body: s.CaseUpdate, db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    row = get_or_404(db, EscalationCase, case_id, "Case")
    if body.status is not None:
        if body.status not in ESCALATION_STATUS:
            raise HTTPException(400, f"status must be one of {ESCALATION_STATUS}")
        if body.status in ("resolved", "closed") and not (body.resolution_notes or row.resolution_notes):
            raise HTTPException(400, "Resolution notes are required to close a case.")
        row.status = body.status
        row.resolved_at = _now() if body.status in ("resolved", "closed") else None
    if body.priority is not None:
        if body.priority not in ESCALATION_PRIORITIES:
            raise HTTPException(400, f"priority must be one of {ESCALATION_PRIORITIES}")
        row.priority = body.priority
    if body.assigned_to_superadmin_id is not None:
        assignee = get_or_404(db, User, body.assigned_to_superadmin_id, "Super Admin")
        if assignee.role != "superadmin" or assignee.status != "active":
            raise HTTPException(400, "Assignee must be an active Super Admin.")
        row.assigned_to_superadmin_id = assignee.user_id
    if body.admin_remarks is not None: row.admin_remarks = body.admin_remarks
    if body.resolution_notes is not None: row.resolution_notes = body.resolution_notes
    log_admin_action(db, actor.user_id, f"case_{row.status}", "escalation_case", row.case_id, row.case_code)
    notify(db, row.raised_by_admin_id, "system", f"Case {row.case_code} is now '{row.status}'.")
    db.commit()
    db.refresh(row)
    return _case(row)


@router.get("/farms", response_model=list[dict])
def farms(
    verification_status: str | None = None, skip: int = 0, limit: int = Query(50, le=200),
    db: Session = Depends(get_db), actor: User = Depends(require_role("superadmin")),
):
    del actor
    q = db.query(Farm)
    if verification_status: q = q.filter(Farm.verification_status == verification_status)
    rows = q.order_by(Farm.created_at.desc()).offset(skip).limit(limit).all()
    return [{"id": f.farm_id, "ownerId": f.user_id, "farmName": f.farm_name, "location": f.location,
             "verificationStatus": f.verification_status, "capacityLiters": float(f.capacity_liters) if f.capacity_liters is not None else None,
             "createdAt": f.created_at} for f in rows]


@router.get("/analytics", response_model=dict)
def analytics(
    days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    del actor
    since = _now() - timedelta(days=days)
    users_by_role = {r: c for r, c in db.query(User.role, func.count(User.user_id)).group_by(User.role).all()}
    return {
        "days": days, "usersByRole": users_by_role,
        "newUsers": db.query(func.count(User.user_id)).filter(User.created_at >= since).scalar(),
        "newFarms": db.query(func.count(Farm.farm_id)).filter(Farm.created_at >= since).scalar(),
        "newBatches": db.query(func.count(MilkBatch.batch_id)).filter(MilkBatch.created_at >= since).scalar(),
        "newCases": db.query(func.count(EscalationCase.case_id)).filter(EscalationCase.created_at >= since).scalar(),
        "sensorReadings": db.query(func.count(IoTSensorReading.reading_id)).filter(IoTSensorReading.recorded_at >= since).scalar(),
        "predictions": db.query(func.count(AIPrediction.prediction_id)).filter(AIPrediction.predicted_at >= since).scalar(),
    }


@router.get("/audit-logs", response_model=list[dict])
def audit_logs(
    action: str | None = None, actor_id: int | None = None, entity_type: str | None = None,
    skip: int = 0, limit: int = Query(50, le=200), db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    del actor
    q = db.query(AdminActionLog)
    if action: q = q.filter(AdminActionLog.action.ilike(f"%{action}%"))
    if actor_id: q = q.filter(AdminActionLog.admin_id == actor_id)
    if entity_type: q = q.filter(AdminActionLog.entity_type == entity_type)
    return [{"id": x.log_id, "actorId": x.admin_id, "action": x.action, "entityType": x.entity_type,
             "entityId": x.entity_id, "description": x.description, "createdAt": x.created_at}
            for x in q.order_by(AdminActionLog.created_at.desc()).offset(skip).limit(limit).all()]


@router.get("/settings", response_model=list[dict])
def settings_list(db: Session = Depends(get_db), actor: User = Depends(require_role("superadmin"))):
    del actor
    return [{"key": x.setting_key, "value": x.value_json, "updatedBy": x.updated_by, "updatedAt": x.updated_at}
            for x in db.query(PlatformSetting).order_by(PlatformSetting.setting_key).all()]


@router.patch("/settings/{setting_key}", response_model=dict)
def update_setting(
    setting_key: str, body: s.PlatformSettingUpdate, db: Session = Depends(get_db),
    actor: User = Depends(require_role("superadmin")),
):
    lowered = setting_key.lower()
    if any(word in lowered for word in ("secret", "password", "token", "api_key", "database_url")):
        raise HTTPException(400, "Secrets cannot be stored as platform settings.")
    row = db.get(PlatformSetting, setting_key)
    if row is None:
        row = PlatformSetting(setting_key=setting_key, value_json=body.value, updated_by=actor.user_id)
        db.add(row)
    else:
        row.value_json, row.updated_by, row.updated_at = body.value, actor.user_id, _now()
    log_admin_action(db, actor.user_id, "platform_setting_updated", "platform_setting", None, setting_key)
    db.commit()
    db.refresh(row)
    return {"key": row.setting_key, "value": row.value_json, "updatedBy": row.updated_by, "updatedAt": row.updated_at}


@router.get("/support-contacts", response_model=list[s.SupportContact])
def support_contacts(db: Session = Depends(get_db), actor: User = Depends(require_role("superadmin"))):
    del actor
    row = db.get(PlatformSetting, "support.contacts")
    if row and isinstance(row.value_json, list):
        return row.value_json
    cfg = get_settings()
    if cfg.SUPPORT_EMAIL:
        return [{"name": cfg.SUPPORT_NAME, "email": cfg.SUPPORT_EMAIL, "phone": cfg.SUPPORT_PHONE or None, "role": "Technical support"}]
    return []
