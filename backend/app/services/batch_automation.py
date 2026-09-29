"""Rate-bounded local-demo IoT and freshness automation.

This is deliberately a simulator, not a hardware ingestion service. Each run
uses persisted timestamps to remain idempotent across application restarts and
an in-process lock to prevent overlapping local scheduler/manual runs.
"""

from __future__ import annotations

import asyncio
import math
import random
import threading
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import AIPrediction, IoTSensorReading, MilkBatch
from app.services import ai_service

SIMULATION_LABEL = "Simulated IoT reading"
PREDICTION_LABEL = "Demonstration prediction — not laboratory certification."
ACTIVE_BATCH_STATUSES = ("recorded", "testing", "approved")
MAX_READINGS_PER_PREDICTION = 500

_cycle_lock = threading.Lock()


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _seconds(value: int, minimum: int) -> int:
    """Clamp environment values so a typo cannot create a tight write loop."""
    return max(minimum, int(value))


def _simulated_temperature(batch_id: int, at: datetime, base: float) -> float:
    """Stable value for a batch/time bucket, with occasional mild excursions."""
    bucket = int(at.timestamp()) // 300
    rng = random.Random(f"apnadairy-demo:{batch_id}:{bucket}")
    daily_wave = math.sin((at.hour * 60 + at.minute) / 1440 * math.tau) * 0.35
    excursion = rng.uniform(2.0, 5.5) if rng.random() < 0.06 else 0.0
    return round(max(-2.0, min(15.0, base + daily_wave + rng.uniform(-0.25, 0.25) + excursion)), 2)


def automation_status(db: Session, settings: Settings, batch_id: int | None = None) -> dict:
    q = db.query(MilkBatch).filter(MilkBatch.status.in_(ACTIVE_BATCH_STATUSES))
    if batch_id is not None:
        q = q.filter(MilkBatch.batch_id == batch_id)
    batch_count = q.count()
    readings = db.query(IoTSensorReading)
    predictions = db.query(AIPrediction)
    if batch_id is not None:
        readings = readings.filter(IoTSensorReading.batch_id == batch_id)
        predictions = predictions.filter(AIPrediction.batch_id == batch_id)
    latest_reading = readings.order_by(IoTSensorReading.recorded_at.desc()).first()
    latest_prediction = predictions.order_by(AIPrediction.predicted_at.desc()).first()
    return {
        "enabled": bool(settings.IOT_AI_AUTOMATION_ENABLED and settings.DEMO_MODE),
        "mode": "simulated-demonstration",
        "simulation_label": SIMULATION_LABEL,
        "prediction_disclaimer": PREDICTION_LABEL,
        "scheduler_interval_seconds": _seconds(settings.IOT_AI_AUTOMATION_INTERVAL_SECONDS, 30),
        "reading_interval_seconds": _seconds(settings.IOT_AI_READING_INTERVAL_SECONDS, 30),
        "prediction_interval_seconds": _seconds(settings.IOT_AI_PREDICTION_INTERVAL_SECONDS, 60),
        "max_batches_per_cycle": max(1, min(int(settings.IOT_AI_MAX_BATCHES_PER_CYCLE), 100)),
        "eligible_batch_count": batch_count,
        "latest_reading_at": latest_reading.recorded_at if latest_reading else None,
        "latest_prediction_at": latest_prediction.predicted_at if latest_prediction else None,
    }


def run_cycle(
    db: Session,
    settings: Settings,
    *,
    batch_id: int | None = None,
    now: datetime | None = None,
    triggered_by: str = "scheduler",
) -> dict:
    """Run one bounded cycle; due-time checks make repeated calls no-ops."""
    now = _aware(now) or datetime.now(timezone.utc)
    if not _cycle_lock.acquire(blocking=False):
        return {
            "triggered_by": triggered_by,
            "simulation_label": SIMULATION_LABEL,
            "prediction_disclaimer": PREDICTION_LABEL,
            "scanned": 0,
            "readings_created": 0,
            "predictions_created": 0,
            "skipped_reason": "another automation cycle is already running",
            "batches": [],
        }

    try:
        reading_interval = timedelta(seconds=_seconds(settings.IOT_AI_READING_INTERVAL_SECONDS, 30))
        prediction_interval = timedelta(seconds=_seconds(settings.IOT_AI_PREDICTION_INTERVAL_SECONDS, 60))
        limit = max(1, min(int(settings.IOT_AI_MAX_BATCHES_PER_CYCLE), 100))
        # Oldest/never-updated batches go first, so the per-cycle cap remains
        # fair instead of permanently favoring the lowest batch IDs.
        last_reading = (
            db.query(
                IoTSensorReading.batch_id.label("batch_id"),
                func.max(IoTSensorReading.recorded_at).label("last_at"),
            )
            .filter(IoTSensorReading.sensor_type == "temperature")
            .group_by(IoTSensorReading.batch_id)
            .subquery()
        )
        q = (
            db.query(MilkBatch)
            .outerjoin(last_reading, last_reading.c.batch_id == MilkBatch.batch_id)
            .filter(MilkBatch.status.in_(ACTIVE_BATCH_STATUSES))
        )
        if batch_id is not None:
            q = q.filter(MilkBatch.batch_id == batch_id)
        batches = q.order_by(last_reading.c.last_at.asc().nullsfirst(), MilkBatch.batch_id).limit(limit).all()

        output: list[dict] = []
        readings_created = predictions_created = 0
        for batch in batches:
            latest_reading = (
                db.query(IoTSensorReading)
                .filter(IoTSensorReading.batch_id == batch.batch_id, IoTSensorReading.sensor_type == "temperature")
                .order_by(IoTSensorReading.recorded_at.desc())
                .first()
            )
            reading_due = latest_reading is None or now - _aware(latest_reading.recorded_at) >= reading_interval
            made_reading = False
            if reading_due:
                base = float(batch.initial_storage_temp) if batch.initial_storage_temp is not None else 4.0
                latest_reading = IoTSensorReading(
                    batch_id=batch.batch_id,
                    sensor_type="temperature",
                    reading_value=_simulated_temperature(batch.batch_id, now, base),
                    unit="°C",
                    recorded_at=now,
                )
                db.add(latest_reading)
                db.flush()
                made_reading = True
                readings_created += 1

            latest_prediction = (
                db.query(AIPrediction)
                .filter(AIPrediction.batch_id == batch.batch_id)
                .order_by(AIPrediction.predicted_at.desc())
                .first()
            )
            prediction_due = latest_prediction is None or now - _aware(latest_prediction.predicted_at) >= prediction_interval
            temp_rows = list(reversed(
                db.query(IoTSensorReading)
                .filter(IoTSensorReading.batch_id == batch.batch_id, IoTSensorReading.sensor_type == "temperature")
                .order_by(IoTSensorReading.recorded_at.desc())
                .limit(MAX_READINGS_PER_PREDICTION)
                .all()
            ))
            newest_is_unscored = bool(
                temp_rows
                and (latest_prediction is None or _aware(temp_rows[-1].recorded_at) > _aware(latest_prediction.predicted_at))
            )
            made_prediction = False
            detail = "up to date"
            if prediction_due and newest_is_unscored and len(temp_rows) >= 2:
                features = ai_service.aggregate_iot_features(
                    [(row.recorded_at, float(row.reading_value)) for row in temp_rows],
                    batch.milking_time,
                    now=now,
                )
                result = ai_service.predict_freshness(features)
                db.add(AIPrediction(
                    batch_id=batch.batch_id,
                    predicted_shelf_life_hours=result["remaining_shelf_life_hours"],
                    freshness_score=result["freshness_score"],
                    quality_class=result["quality_class"],
                    anomaly_flag=result["anomaly_detected"],
                    model_version=result["model_version"],
                    predicted_at=now,
                ))
                made_prediction = True
                predictions_created += 1
                detail = "simulated reading and demonstration prediction stored" if made_reading else "demonstration prediction stored"
            elif made_reading:
                detail = "simulated reading stored; prediction awaits two readings or its due interval"

            output.append({
                "batch_id": batch.batch_id,
                "batch_code": batch.batch_code,
                "reading_created": made_reading,
                "prediction_created": made_prediction,
                "detail": detail,
            })

        db.commit()
        return {
            "triggered_by": triggered_by,
            "simulation_label": SIMULATION_LABEL,
            "prediction_disclaimer": PREDICTION_LABEL,
            "scanned": len(batches),
            "readings_created": readings_created,
            "predictions_created": predictions_created,
            "skipped_reason": None,
            "batches": output,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        _cycle_lock.release()


async def scheduler_loop(session_factory, settings: Settings) -> None:
    """Run until application shutdown; failures never terminate the API."""
    interval = _seconds(settings.IOT_AI_AUTOMATION_INTERVAL_SECONDS, 30)
    while True:
        try:
            def _run() -> None:
                with session_factory() as db:
                    run_cycle(db, settings)
            await asyncio.to_thread(_run)
        except asyncio.CancelledError:
            raise
        except Exception:
            # The next bounded interval retries. API availability must not
            # depend on optional demo models or simulator data.
            pass
        await asyncio.sleep(interval)
