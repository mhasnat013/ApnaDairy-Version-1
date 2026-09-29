"""AI prediction service — wraps the 4 audited sklearn models.

Models (AI_MODEL_AUDIT.md):
- random_forest_binary.joblib      → adulterated vs raw (composition, 12 features)
- final_random_forest_multiclass.joblib → adulterant class (composition, 12 features)
- shelf_life_model.pkl             → remaining shelf-life hours (IoT, 8 features)
- spoilage_model.pkl               → Low/Medium/High spoilage risk (IoT, 8 features)

Freshness score + quality bands use the MODEL TEAM'S OWN formula recovered
from reference-code/model1/predict.py (plan §9.5) — NOT the auditor's proposal:
    freshness_score = clamp(0, 100, (predicted_shelf_life_hours / 125.75) * 100)
    quality = "Near Expiry" if spoilage == "High"
              else "Fresh" / "Medium" / "Near Expiry" at score ≥ 70 / ≥ 30.

Anomaly rule (plan §9.4, product rule — no ML model exists):
    anomaly = (spoilage_risk == "High") OR (adulteration_status == "adulterated")
              OR (temperature_excursions > 0 AND max_temperature_c > 10)

Every public output carries the "Demonstration prediction" disclaimer and
per-class probabilities; top-class probability < 0.6 is flagged uncertain.
"""

from __future__ import annotations

import threading
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np

# ---------------------------------------------------------------------------
# Feature specs (exact order, AI_MODEL_AUDIT.md §2)
# ---------------------------------------------------------------------------

ADULTERATION_FEATURES = [
    "Cells", "QValue", "Fat", "Protein", "Lactose", "Solids",
    "FFA", "Citrate", "FrzPoint", "SNF", "MUN", "Casein",
]

FRESHNESS_FEATURES = [
    "time_since_milking_hours", "avg_temperature_c", "min_temperature_c",
    "max_temperature_c", "temperature_std_c", "time_above_5c_hours",
    "time_above_10c_hours", "temperature_excursions",
]

MAX_SHELF_LIFE = 125.75  # dataset max of remaining_shelf_life_hours (team's constant)

DISCLAIMER = "Demonstration prediction — not laboratory certification."

MODEL_VERSION = "model1-v1 (rf-binary/final-rf-multiclass/shelf-life/spoilage)"

MODELS_DIR = Path(__file__).resolve().parent.parent / "ml_models"

_lock = threading.Lock()
_models: dict[str, object] = {}


def _load(name: str, filename: str):
    if name not in _models:
        with _lock:
            if name not in _models:
                path = MODELS_DIR / filename
                if not path.exists():
                    raise FileNotFoundError(f"Model file missing: {path}")
                _models[name] = joblib.load(path)
    return _models[name]


def load_models() -> dict[str, object]:
    return {
        "binary": _load("binary", "random_forest_binary.joblib"),
        "multiclass": _load("multiclass", "final_random_forest_multiclass.joblib"),
        "shelf": _load("shelf", "shelf_life_model.pkl"),
        "spoilage": _load("spoilage", "spoilage_model.pkl"),
    }


def models_loaded() -> bool:
    return all(k in _models for k in ("binary", "multiclass", "shelf", "spoilage"))


def _predict_proba(model, X: np.ndarray) -> tuple[str, dict[str, float]]:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        proba = model.predict_proba(X)[0]
    classes = [str(c) for c in model.classes_]
    probs = {c: float(p) for c, p in zip(classes, proba)}
    top = max(probs, key=probs.get)
    return top, probs


# ---------------------------------------------------------------------------
# Adulteration (Family A — 12 composition features)
# ---------------------------------------------------------------------------

def predict_adulteration(features: dict) -> dict:
    models = load_models()
    X = np.array([[float(features[f]) for f in ADULTERATION_FEATURES]], dtype=float)

    bin_top, bin_probs = _predict_proba(models["binary"], X)
    mc_top, mc_probs = _predict_proba(models["multiclass"], X)

    adulteration_status = "adulterated" if bin_top == "adulterated" else "raw"
    uncertain = max(bin_probs.values()) < 0.6 or max(mc_probs.values()) < 0.6

    return {
        "adulteration_status": adulteration_status,
        "adulteration_probabilities": bin_probs,
        "adulterant": mc_top,
        "adulterant_probabilities": mc_probs,
        "is_uncertain": uncertain,
        "uncertainty_note": (
            "Low confidence — retest recommended." if uncertain else None
        ),
        "model_version": MODEL_VERSION,
        "disclaimer": DISCLAIMER,
    }


# ---------------------------------------------------------------------------
# Freshness (Family B — 8 IoT aggregate features)
# ---------------------------------------------------------------------------

def quality_class(spoilage_risk: str, freshness_score: float) -> str:
    if spoilage_risk == "High":
        return "Near Expiry"
    if freshness_score >= 70:
        return "Fresh"
    if freshness_score >= 30:
        return "Medium"
    return "Near Expiry"


def anomaly_check(
    spoilage_risk: str,
    adulteration_status: str | None,
    temperature_excursions: float,
    max_temperature_c: float,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if spoilage_risk == "High":
        reasons.append("Spoilage risk predicted High")
    if adulteration_status == "adulterated":
        reasons.append("Milk predicted adulterated")
    if temperature_excursions > 0 and max_temperature_c > 10:
        reasons.append(
            f"Cold-chain breach: {int(temperature_excursions)} excursion(s), "
            f"max temp {max_temperature_c:.1f}°C"
        )
    return (len(reasons) > 0, reasons)


def predict_freshness(features: dict, adulteration_status: str | None = None) -> dict:
    models = load_models()
    X = np.array([[float(features[f]) for f in FRESHNESS_FEATURES]], dtype=float)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        shelf_life = float(models["shelf"].predict(X)[0])
    shelf_life = max(0.0, shelf_life)

    risk, risk_probs = _predict_proba(models["spoilage"], X)

    freshness_score = max(0.0, min(100.0, (shelf_life / MAX_SHELF_LIFE) * 100))
    quality = quality_class(risk, freshness_score)
    uncertain = max(risk_probs.values()) < 0.6

    anomaly, reasons = anomaly_check(
        risk,
        adulteration_status,
        float(features["temperature_excursions"]),
        float(features["max_temperature_c"]),
    )

    return {
        "remaining_shelf_life_hours": round(shelf_life, 2),
        "spoilage_risk": risk,
        "spoilage_probabilities": risk_probs,
        "freshness_score": round(freshness_score, 2),
        "quality_class": quality,
        "anomaly_detected": anomaly,
        "anomaly_reasons": reasons,
        "is_uncertain": uncertain,
        "uncertainty_note": (
            "Low confidence — retest recommended." if uncertain else None
        ),
        "features_used": {f: float(features[f]) for f in FRESHNESS_FEATURES},
        "model_version": MODEL_VERSION,
        "disclaimer": DISCLAIMER,
    }


# ---------------------------------------------------------------------------
# IoT time-series → 8 model features (aggregation)
# ---------------------------------------------------------------------------

def aggregate_iot_features(
    readings: list[tuple[datetime, float]],
    milking_time: datetime,
    now: datetime | None = None,
) -> dict[str, float]:
    """Aggregate raw temperature readings into the 8 freshness-model features.

    readings: list of (recorded_at, temp_c), unsorted OK.
    time_above thresholds use linear interpolation between consecutive points.
    excursions = number of upward crossings of the 5°C cold-chain threshold.
    """
    now = now or datetime.now(timezone.utc)
    if milking_time.tzinfo is None:
        milking_time = milking_time.replace(tzinfo=timezone.utc)
    pts = sorted(
        (
            r if r.tzinfo else r.replace(tzinfo=timezone.utc),
            float(v),
        )
        for r, v in readings
    )
    if not pts:
        raise ValueError("No readings to aggregate")
    temps = [v for _, v in pts]
    n = len(temps)

    avg = sum(temps) / n
    tmin, tmax = min(temps), max(temps)
    std = (sum((t - avg) ** 2 for t in temps) / (n - 1)) ** 0.5 if n > 1 else 0.0

    above5 = above10 = 0.0
    excursions = 0
    for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
        dt = (t1 - t0).total_seconds() / 3600.0
        if dt <= 0:
            continue
        for thresh in (5.0, 10.0):
            if v0 >= thresh and v1 >= thresh:
                frac = 1.0
            elif v0 < thresh and v1 < thresh:
                frac = 0.0
            else:
                # linear interpolation of the crossing point; the fraction of
                # the segment above the threshold is the same for rising and
                # falling crossings: (max - thresh) / |v1 - v0|
                frac = (max(v0, v1) - thresh) / abs(v1 - v0) if v1 != v0 else 0.0
            if thresh == 5.0:
                above5 += dt * frac
            else:
                above10 += dt * frac
        # upward crossing of 5°C = excursion event
        if v0 <= 5.0 < v1:
            excursions += 1

    time_since = max(0.0, (now - milking_time).total_seconds() / 3600.0)

    return {
        "time_since_milking_hours": round(time_since, 2),
        "avg_temperature_c": round(avg, 2),
        "min_temperature_c": round(tmin, 2),
        "max_temperature_c": round(tmax, 2),
        "temperature_std_c": round(std, 3),
        "time_above_5c_hours": round(above5, 2),
        "time_above_10c_hours": round(above10, 2),
        "temperature_excursions": float(excursions),
    }
