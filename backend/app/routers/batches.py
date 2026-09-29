"""Milk batches: farmer CRUD, public batch trace, AI freshness scoring.

Rule: admins can MODERATE batches but can never CREATE farmer-owned batches
(POST /batches is farmer-only → 403 for admin).
"""

import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app import schemas as s
from app.database import get_db
from app.auth.deps import get_current_user, get_own_farm, require_role
from app.models import AIPrediction, Discount, Farm, IoTSensorReading, MilkBatch, Product, Subscription, User
from app.models.enums import BATCH_STATUS
from app.routers._helpers import get_or_404, notify
from app.services import ai_service

router = APIRouter(tags=["batches"])


def _utcnow():
    return datetime.now(timezone.utc)


def _batch_out(db: Session, b: MilkBatch, with_prediction: bool = True) -> s.BatchOut:
    pred_out = None
    freshness = spoilage = None
    if with_prediction and b.predictions:
        latest = max(b.predictions, key=lambda pr: pr.predicted_at or _utcnow())
        freshness = float(latest.freshness_score) if latest.freshness_score is not None else None
        pred_out = s.PredictionOut(
            id=latest.prediction_id,
            batch_id=latest.batch_id,
            predicted_shelf_life_hours=float(latest.predicted_shelf_life_hours) if latest.predicted_shelf_life_hours is not None else None,
            freshness_score=freshness,
            quality_class=latest.quality_class,
            anomaly_flag=latest.anomaly_flag,
            model_version=latest.model_version,
            predicted_at=latest.predicted_at,
        )
    return s.BatchOut(
        id=b.batch_id,
        batch_code=b.batch_code,
        farm_id=b.farm_id,
        farm_name=b.farm.farm_name if b.farm else None,
        milking_time=b.milking_time,
        collection_time=b.collection_time,
        quantity_liters=float(b.quantity_liters),
        initial_storage_temp=float(b.initial_storage_temp) if b.initial_storage_temp is not None else None,
        status=b.status,
        created_at=b.created_at,
        freshness_score=freshness,
        spoilage_risk=spoilage,
        latest_prediction=pred_out,
    )


def _check_batch_access(user: User, batch: MilkBatch) -> None:
    """Owner farmer or admin. Everyone else gets 403/404."""
    if user.role in ("admin", "superadmin"):
        return
    if batch.farm.user_id != user.user_id:
        raise HTTPException(status_code=404, detail="Batch not found")


@router.get("/batches", response_model=list[s.BatchOut])
def list_batches(
    farm_id: int | None = None,
    status_: str | None = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin", "superadmin")),
):
    q = db.query(MilkBatch).options(joinedload(MilkBatch.farm), joinedload(MilkBatch.predictions))
    if user.role == "farmer":
        farm = get_own_farm(user, db)
        q = q.filter(MilkBatch.farm_id == farm.farm_id)
    elif farm_id:
        q = q.filter(MilkBatch.farm_id == farm_id)
    if status_:
        if status_ not in BATCH_STATUS:
            raise HTTPException(400, f"status must be one of {BATCH_STATUS}")
        q = q.filter(MilkBatch.status == status_)
    batches = q.order_by(MilkBatch.created_at.desc()).offset(skip).limit(limit).all()
    return [_batch_out(db, b) for b in batches]


@router.get("/batches/{batch_id}", response_model=s.BatchOut)
def get_batch(batch_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    b = get_or_404(db, MilkBatch, batch_id, "Batch")
    _check_batch_access(user, b)
    return _batch_out(db, b)


@router.post("/batches", response_model=s.BatchOut, status_code=201)
def create_batch(
    body: s.BatchCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer")),  # admin can NEVER create batches
):
    farm = get_own_farm(user, db)
    if body.farm_id is not None and body.farm_id != farm.farm_id:
        raise HTTPException(403, "You can only create batches for your own farm.")
    code = (body.batch_code or f"B-{farm.farm_id}-{secrets.token_hex(3).upper()}").strip()
    if db.query(MilkBatch).filter(MilkBatch.batch_code == code).first():
        raise HTTPException(409, "Batch code already exists.")
    b = MilkBatch(
        farm_id=farm.farm_id,
        batch_code=code,
        milking_time=body.milking_time,
        collection_time=body.collection_time,
        quantity_liters=body.quantity_liters,
        initial_storage_temp=body.initial_storage_temp,
        status="recorded",
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    # Notify active subscribers of this farm about the new batch (scope: subscriber alerts).
    for sub in db.query(Subscription).filter(Subscription.farm_id == farm.farm_id, Subscription.status == "active").all():
        notify(db, sub.user_id, "subscription", f"New batch {code} ({float(body.quantity_liters):.1f} L) is available from {farm.farm_name}.")
    db.commit()
    return _batch_out(db, b)


@router.patch("/batches/{batch_id}", response_model=s.BatchOut)
def update_batch(
    batch_id: int,
    body: s.BatchUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin", "superadmin")),
):
    b = get_or_404(db, MilkBatch, batch_id, "Batch")
    if user.role in ("admin", "superadmin"):
        # Admins moderate status only — they never own the batch.
        if body.status is None:
            raise HTTPException(400, "Admins can only moderate batch status.")
        if body.status not in BATCH_STATUS:
            raise HTTPException(400, f"status must be one of {BATCH_STATUS}")
        b.status = body.status
    else:
        if b.farm.user_id != user.user_id:
            raise HTTPException(404, "Batch not found")
        if body.status is not None:
            if body.status not in BATCH_STATUS:
                raise HTTPException(400, f"status must be one of {BATCH_STATUS}")
            b.status = body.status
        if body.quantity_liters is not None:
            b.quantity_liters = body.quantity_liters
        if body.collection_time is not None:
            b.collection_time = body.collection_time
    db.commit()
    db.refresh(b)
    return _batch_out(db, b)


@router.delete("/batches/{batch_id}", response_model=s.MessageOut)
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer")),
):
    b = get_or_404(db, MilkBatch, batch_id, "Batch")
    if b.farm.user_id != user.user_id:
        raise HTTPException(404, "Batch not found")
    if b.status not in ("recorded",):
        raise HTTPException(400, "Only newly recorded batches can be deleted.")
    db.delete(b)
    db.commit()
    return s.MessageOut(message="Batch deleted.")


# ---------------------------------------------------------------------------
# Public batch trace
# ---------------------------------------------------------------------------

@router.get("/batches/trace/{batch_code}", response_model=s.BatchTraceOut)
def trace_batch(batch_code: str, db: Session = Depends(get_db)):
    b = db.query(MilkBatch).options(joinedload(MilkBatch.farm), joinedload(MilkBatch.predictions)).filter(MilkBatch.batch_code == batch_code).first()
    if b is None:
        raise HTTPException(404, "No batch found for this code.")
    freshness = spoilage = None
    if b.predictions:
        latest = max(b.predictions, key=lambda pr: pr.predicted_at or _utcnow())
        freshness = float(latest.freshness_score) if latest.freshness_score is not None else None
    reading_count = db.query(IoTSensorReading).filter(IoTSensorReading.batch_id == b.batch_id).count()
    return s.BatchTraceOut(
        batch_code=b.batch_code,
        farm_name=b.farm.farm_name,
        farm_location=b.farm.location,
        milking_time=b.milking_time,
        quantity_liters=float(b.quantity_liters),
        status=b.status,
        freshness_score=freshness,
        spoilage_risk=spoilage,
        reading_count=reading_count,
    )


# ---------------------------------------------------------------------------
# AI scoring: aggregate IoT → features → models → AI_PREDICTION row
# ---------------------------------------------------------------------------

def _apply_freshness_pricing(db: Session, batch: MilkBatch, quality_class: str) -> None:
    """Automatic dynamic pricing: freshness-driven discounts (scope module 10).

    When the AI classifies a batch as Near Expiry, products made from that
    batch automatically get a time-limited 15% discount (reason prefixed
    "auto: freshness"). When the batch scores Fresh again, those automatic
    discounts are expired. Manual farmer discounts are never touched.
    """
    now = _utcnow()
    products = db.query(Product).filter(Product.batch_id == batch.batch_id).all()
    if not products:
        return
    if quality_class == "Near Expiry":
        for p in products:
            existing = (
                db.query(Discount)
                .filter(
                    Discount.product_id == p.product_id,
                    Discount.reason.like("auto: freshness%"),
                    Discount.valid_until >= now,
                )
                .first()
            )
            if existing is None:
                db.add(
                    Discount(
                        product_id=p.product_id,
                        discount_percent=Decimal("15.00"),
                        reason="auto: freshness — Near Expiry (demonstration)",
                        valid_from=now,
                        valid_until=now + timedelta(hours=48),
                    )
                )
                notify(
                    db,
                    batch.farm.user_id,
                    "pricing",
                    f"Automatic 15% freshness discount applied to '{p.name}' (batch {batch.batch_code} scored Near Expiry).",
                )
    else:
        # Fresh (or Medium): expire any automatic freshness discounts.
        db.query(Discount).filter(
            Discount.product_id.in_([p.product_id for p in products]),
            Discount.reason.like("auto: freshness%"),
            Discount.valid_until >= now,
        ).update({"valid_until": now}, synchronize_session=False)


@router.post("/batches/{batch_id}/score", response_model=s.FreshnessResponse, status_code=201)
def score_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("farmer", "admin", "superadmin")),
):
    b = get_or_404(db, MilkBatch, batch_id, "Batch")
    if user.role not in ("admin", "superadmin") and b.farm.user_id != user.user_id:
        raise HTTPException(404, "Batch not found")

    readings = (
        db.query(IoTSensorReading)
        .filter(
            IoTSensorReading.batch_id == batch_id,
            IoTSensorReading.sensor_type == "temperature",
        )
        .order_by(IoTSensorReading.recorded_at)
        .all()
    )
    if len(readings) < 2:
        raise HTTPException(
            400,
            "Not enough temperature readings to score this batch (need at least 2). "
            "Generate some via POST /iot/batches/{id}/simulate.",
        )
    features = ai_service.aggregate_iot_features(
        [(r.recorded_at, float(r.reading_value)) for r in readings],
        b.milking_time,
    )
    try:
        result = ai_service.predict_freshness(features)
    except FileNotFoundError as exc:
        raise HTTPException(503, f"AI models are not installed on the server: {exc}")

    pred = AIPrediction(
        batch_id=batch_id,
        predicted_shelf_life_hours=result["remaining_shelf_life_hours"],
        freshness_score=result["freshness_score"],
        quality_class=result["quality_class"],
        anomaly_flag=result["anomaly_detected"],
        model_version=result["model_version"],
    )
    db.add(pred)
    _apply_freshness_pricing(db, b, result["quality_class"])
    db.commit()
    return s.FreshnessResponse(**result)


@router.get("/batches/{batch_id}/predictions", response_model=list[s.PredictionOut])
def batch_predictions(
    batch_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    b = get_or_404(db, MilkBatch, batch_id, "Batch")
    _check_batch_access(user, b)
    rows = (
        db.query(AIPrediction)
        .filter(AIPrediction.batch_id == batch_id)
        .order_by(AIPrediction.predicted_at.desc())
        .all()
    )
    return [
        s.PredictionOut(
            id=r.prediction_id,
            batch_id=r.batch_id,
            predicted_shelf_life_hours=float(r.predicted_shelf_life_hours) if r.predicted_shelf_life_hours is not None else None,
            freshness_score=float(r.freshness_score) if r.freshness_score is not None else None,
            quality_class=r.quality_class,
            anomaly_flag=r.anomaly_flag,
            model_version=r.model_version,
            predicted_at=r.predicted_at,
        )
        for r in rows
    ]
