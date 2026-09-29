"""IoT (simulated) readings and AI prediction endpoints.

Every IoT payload is labelled "Simulated IoT reading" (scope: Simulated IoT API).
Every AI response carries the "Demonstration prediction" disclaimer.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import schemas as s
from app.core.config import get_settings
from app.db.database import get_db
from app.auth.deps import get_current_user, require_role
from app.models import IoTSensorReading, MilkBatch, User
from app.api.routes._helpers import get_or_404
from app.services import ai_service
from app.services import batch_automation
from app.services.iot_simulator import SIMULATED_LABEL, simulate_batch_readings

router = APIRouter(tags=["iot", "ai"])


def _utcnow():
    return datetime.now(timezone.utc)


def _reading_out(r: IoTSensorReading) -> s.ReadingOut:
    return s.ReadingOut(
        id=r.reading_id,
        batch_id=r.batch_id,
        sensor_type=r.sensor_type,
        reading_value=float(r.reading_value),
        unit=r.unit,
        recorded_at=r.recorded_at,
        simulated_label=SIMULATED_LABEL,
    )


def _check_batch_rw(user: User, batch: MilkBatch) -> None:
    if user.role in ("admin", "superadmin"):
        return
    if batch.farm.user_id != user.user_id:
        raise HTTPException(status_code=404, detail="Batch not found")


@router.post("/iot/readings", response_model=s.ReadingOut, status_code=201)
def ingest_reading(
    body: s.ReadingIngest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin", "superadmin")),
):
    batch = get_or_404(db, MilkBatch, body.batch_id, "Batch")
    _check_batch_rw(user, batch)
    r = IoTSensorReading(
        batch_id=batch.batch_id,
        sensor_type=body.sensor_type.strip(),
        reading_value=body.reading_value,
        unit=body.unit,
        recorded_at=body.recorded_at or _utcnow(),
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _reading_out(r)


@router.post("/iot/batches/{batch_id}/simulate", response_model=s.SimulateResponse, status_code=201)
def simulate_readings(
    batch_id: int,
    body: s.SimulateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin", "superadmin")),
):
    batch = get_or_404(db, MilkBatch, batch_id, "Batch")
    _check_batch_rw(user, batch)
    rows = simulate_batch_readings(
        batch_id=batch_id,
        hours_back=body.hours_back,
        interval_minutes=body.interval_minutes,
        base_temp_c=body.base_temp_c,
        excursion_count=body.excursion_count,
    )
    objs = [
        IoTSensorReading(
            batch_id=row["batch_id"],
            sensor_type=row["sensor_type"],
            reading_value=row["reading_value"],
            unit=row["unit"],
            recorded_at=row["recorded_at"],
        )
        for row in rows
    ]
    db.add_all(objs)
    db.commit()
    for o in objs:
        db.refresh(o)
    return s.SimulateResponse(count=len(objs), readings=[_reading_out(o) for o in objs])


@router.get("/iot/batches/{batch_id}/readings", response_model=list[s.ReadingOut])
def list_readings(
    batch_id: int,
    sensor_type: str | None = None,
    skip: int = 0,
    limit: int = Query(500, le=5000),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    batch = get_or_404(db, MilkBatch, batch_id, "Batch")
    _check_batch_rw(user, batch)
    q = db.query(IoTSensorReading).filter(IoTSensorReading.batch_id == batch_id)
    if sensor_type:
        q = q.filter(IoTSensorReading.sensor_type == sensor_type)
    rows = q.order_by(IoTSensorReading.recorded_at).offset(skip).limit(limit).all()
    return [_reading_out(r) for r in rows]


# ---------------------------------------------------------------------------
# Periodic local-demo automation
# ---------------------------------------------------------------------------

@router.get("/iot/automation/status", response_model=s.AutomationStatus)
def get_automation_status(
    batch_id: int | None = Query(default=None, ge=1, alias="batchId"),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin", "superadmin")),
):
    """Observe scheduler configuration and last persisted demo activity."""
    if user.role == "farmer":
        if batch_id is None:
            raise HTTPException(400, "Farmers must provide batchId.")
        batch = get_or_404(db, MilkBatch, batch_id, "Batch")
        _check_batch_rw(user, batch)
    return s.AutomationStatus(**batch_automation.automation_status(db, get_settings(), batch_id))


@router.post("/iot/automation/run", response_model=s.AutomationRunResponse, status_code=201)
def run_automation(
    body: s.AutomationRunRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin", "superadmin")),
):
    """Run one due-only cycle; repeated calls inside the interval are no-ops."""
    settings = get_settings()
    if not settings.DEMO_MODE:
        raise HTTPException(409, "Simulated IoT/AI automation is disabled outside demo mode.")
    if user.role == "farmer":
        if body.batch_id is None:
            raise HTTPException(400, "Farmers must provide batchId.")
        batch = get_or_404(db, MilkBatch, body.batch_id, "Batch")
        _check_batch_rw(user, batch)
    elif body.batch_id is not None:
        get_or_404(db, MilkBatch, body.batch_id, "Batch")
    try:
        result = batch_automation.run_cycle(
            db,
            settings,
            batch_id=body.batch_id,
            triggered_by=f"manual:{user.role}:{user.user_id}",
        )
    except FileNotFoundError as exc:
        raise HTTPException(503, f"AI models are not installed on the server: {exc}")
    return s.AutomationRunResponse(**result)


# ---------------------------------------------------------------------------
# AI predictions
# ---------------------------------------------------------------------------

@router.post("/predict/adulteration", response_model=s.AdulterationResponse)
def predict_adulteration(
    body: s.AdulterationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = ai_service.predict_adulteration(body.to_feature_dict())
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"AI models are not installed on the server: {exc}")
    return s.AdulterationResponse(**result)


@router.post("/predict/freshness", response_model=s.FreshnessResponse)
def predict_freshness(
    body: s.FreshnessRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = ai_service.predict_freshness(body.to_feature_dict())
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"AI models are not installed on the server: {exc}")
    return s.FreshnessResponse(**result)


@router.get("/ai/status", response_model=dict)
def ai_status(user: User = Depends(get_current_user)):
    loaded = ai_service.models_loaded()
    try:
        if not loaded:
            ai_service.load_models()
            loaded = True
    except FileNotFoundError:
        loaded = False
    return {
        "models_loaded": loaded,
        "model_version": ai_service.MODEL_VERSION,
        "disclaimer": ai_service.DISCLAIMER,
    }
