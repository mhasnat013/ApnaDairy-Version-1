"""Simulated IoT sensor-reading generator.

The platform's IoT layer is a simulator (scope document: "Simulated IoT API").
Every payload produced here is labelled "Simulated IoT reading" — never present
simulated data as live hardware telemetry.
"""

from __future__ import annotations

import math
import random
from datetime import datetime, timedelta, timezone

SIMULATED_LABEL = "Simulated IoT reading"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_temperature_series(
    *,
    hours_back: float = 24.0,
    interval_minutes: float = 30.0,
    base_temp_c: float = 4.0,
    noise_std: float = 0.3,
    excursions: list[dict] | None = None,
    end_at: datetime | None = None,
    seed: int | None = None,
) -> list[tuple[datetime, float]]:
    """Generate a synthetic cold-chain temperature series.

    excursions: list of {"start_hour": h (hours before end), "peak_temp": °C,
    "duration_hours": h} — each adds a smooth bump (raised cosine) to the series.
    Returns a list of (recorded_at, temp_c) sorted ascending.
    """
    rng = random.Random(seed)
    end_at = end_at or _utcnow()
    start = end_at - timedelta(hours=hours_back)
    step = timedelta(minutes=interval_minutes)

    pts: list[tuple[datetime, float]] = []
    t = start
    while t <= end_at:
        temp = base_temp_c + rng.gauss(0, noise_std)
        elapsed_h = (t - start).total_seconds() / 3600.0
        for exc in excursions or []:
            s = hours_back - float(exc.get("start_hour", 0))
            dur = float(exc.get("duration_hours", 1.0))
            peak = float(exc.get("peak_temp", 8.0))
            if s <= elapsed_h <= s + dur:
                # raised-cosine bump peaking mid-excursion
                phase = (elapsed_h - s) / dur * math.pi
                temp += (peak - base_temp_c) * (0.5 - 0.5 * math.cos(phase))
        pts.append((t, round(temp, 2)))
        t += step
    return pts


def simulate_batch_readings(
    *,
    batch_id: int,
    hours_back: float = 24.0,
    interval_minutes: float = 30.0,
    base_temp_c: float = 4.0,
    excursion_count: int = 0,
    seed: int | None = None,
) -> list[dict]:
    """Build simulator output rows ready for IoTSensorReading inserts."""
    rng = random.Random(seed)
    excursions = []
    for _ in range(max(0, excursion_count)):
        excursions.append(
            {
                "start_hour": rng.uniform(1, max(1.5, hours_back - 1)),
                "peak_temp": rng.uniform(7.0, 12.0),
                "duration_hours": rng.uniform(0.5, 2.0),
            }
        )
    series = generate_temperature_series(
        hours_back=hours_back,
        interval_minutes=interval_minutes,
        base_temp_c=base_temp_c,
        excursions=excursions,
        seed=seed,
    )
    return [
        {
            "batch_id": batch_id,
            "sensor_type": "temperature",
            "reading_value": temp,
            "unit": "°C",
            "recorded_at": ts,
            "simulated_label": SIMULATED_LABEL,
        }
        for ts, temp in series
    ]
