"""Pydantic v2 schemas with camelCase JSON (frontend contract)."""

from datetime import date, datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


def to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


T = TypeVar("T")


class Page(CamelModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")


# ---------------------------------------------------------------------------
# Auth / users
# ---------------------------------------------------------------------------

class RegisterRequest(CamelModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: str = Field(max_length=255)
    phone: str = Field(min_length=7, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str
    role: str


class LoginRequest(CamelModel):
    email: str
    password: str


class RefreshRequest(CamelModel):
    refresh_token: str


class ForgotPasswordRequest(CamelModel):
    email: str


class ResetPasswordRequest(CamelModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class UserOut(CamelModel):
    id: int = Field(alias="id")
    full_name: str
    email: str
    phone: str | None = None
    role: str
    is_verified: bool
    status: str | None = None
    address_line: str | None = None
    city: str | None = None

    @classmethod
    def from_orm_user(cls, u) -> "UserOut":
        return cls(
            id=u.user_id,
            full_name=u.full_name,
            email=u.email,
            phone=u.phone,
            role=u.role,
            is_verified=u.is_verified,
            status=u.status,
            address_line=u.address_line,
            city=u.city,
        )


class TokenResponse(CamelModel):
    access_token: str
    refresh_token: str
    user: UserOut


class RefreshResponse(CamelModel):
    access_token: str
    refresh_token: str


class UserUpdate(CamelModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, min_length=7, max_length=32)
    address_line: str | None = Field(default=None, max_length=512)
    city: str | None = Field(default=None, max_length=128)


class AdminUserUpdate(CamelModel):
    is_verified: bool | None = None
    status: str | None = None
    role: str | None = None


class MessageOut(CamelModel):
    message: str


# ---------------------------------------------------------------------------
# Farms
# ---------------------------------------------------------------------------

class FarmCreate(CamelModel):
    farm_name: str = Field(min_length=2, max_length=255)
    location: str = Field(min_length=2, max_length=512)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    capacity_liters: Decimal | None = Field(default=None, ge=0)
    established_date: date | None = None
    description: str | None = None


class FarmDocumentAdd(CamelModel):
    """Attach a verification document (an /uploads file URL) to a farm."""
    file_url: str = Field(min_length=8, max_length=1024)


class FarmUpdate(CamelModel):
    farm_name: str | None = Field(default=None, min_length=2, max_length=255)
    location: str | None = Field(default=None, min_length=2, max_length=512)
    description: str | None = None
    capacity_liters: Decimal | None = Field(default=None, ge=0)
    latitude: Decimal | None = None
    longitude: Decimal | None = None


class FarmVerifyRequest(CamelModel):
    verification_status: str  # pending | verified | rejected


class FarmOut(CamelModel):
    id: int
    name: str
    location: str
    description: str | None = None
    verification_status: str
    rating_avg: float | None = None
    verification_documents: list[str] | None = None
    # detail fields (present on detail endpoints)
    user_id: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    capacity_liters: float | None = None
    established_date: date | None = None
    created_at: datetime | None = None

    @classmethod
    def from_orm_farm(cls, f, detail: bool = False, private: bool = False) -> "FarmOut":
        base = dict(
            id=f.farm_id,
            name=f.farm_name,
            location=f.location,
            description=f.description,
            verification_status=f.verification_status,
            rating_avg=float(f.rating_avg) if f.rating_avg is not None else None,
        )
        if detail:
            base.update(
                latitude=float(f.latitude) if f.latitude is not None else None,
                longitude=float(f.longitude) if f.longitude is not None else None,
                capacity_liters=float(f.capacity_liters) if f.capacity_liters is not None else None,
                established_date=f.established_date,
                created_at=f.created_at,
            )
        if private:
            # Owner/admin-only fields: never exposed on the public farm detail.
            base.update(
                user_id=f.user_id,
                verification_documents=list(f.verification_documents or []),
            )
        return cls(**base)


# ---------------------------------------------------------------------------
# Batches
# ---------------------------------------------------------------------------

class BatchCreate(CamelModel):
    farm_id: int | None = None  # admin/farmer explicit; defaults to caller's farm
    batch_code: str | None = Field(default=None, max_length=64)
    milking_time: datetime
    collection_time: datetime | None = None
    quantity_liters: Decimal = Field(ge=0)
    initial_storage_temp: Decimal | None = None


class BatchUpdate(CamelModel):
    status: str | None = None
    quantity_liters: Decimal | None = Field(default=None, ge=0)
    collection_time: datetime | None = None


class PredictionOut(CamelModel):
    id: int
    batch_id: int
    predicted_shelf_life_hours: float | None = None
    freshness_score: float | None = None
    quality_class: str | None = None
    anomaly_flag: bool = False
    model_version: str | None = None
    predicted_at: datetime | None = None


class BatchOut(CamelModel):
    id: int
    batch_code: str
    farm_id: int
    farm_name: str | None = None
    milking_time: datetime
    collection_time: datetime | None = None
    quantity_liters: float
    initial_storage_temp: float | None = None
    status: str
    created_at: datetime | None = None
    freshness_score: float | None = None
    spoilage_risk: str | None = None
    latest_prediction: PredictionOut | None = None


class BatchTraceOut(CamelModel):
    batch_code: str
    farm_name: str
    farm_location: str
    milking_time: datetime
    quantity_liters: float
    status: str
    freshness_score: float | None = None
    spoilage_risk: str | None = None
    reading_count: int = 0


# ---------------------------------------------------------------------------
# IoT
# ---------------------------------------------------------------------------

class ReadingIngest(CamelModel):
    batch_id: int
    sensor_type: str = Field(min_length=1, max_length=64)
    reading_value: Decimal
    unit: str | None = Field(default=None, max_length=32)
    recorded_at: datetime | None = None


class ReadingOut(CamelModel):
    id: int
    batch_id: int
    sensor_type: str
    reading_value: float
    unit: str | None = None
    recorded_at: datetime | None = None
    simulated_label: str = "Simulated IoT reading"


class SimulateRequest(CamelModel):
    hours_back: float = Field(default=24.0, ge=0.5, le=720)
    interval_minutes: float = Field(default=30.0, ge=1, le=1440)
    base_temp_c: float = Field(default=4.0, ge=-30, le=60)
    excursion_count: int = Field(default=0, ge=0, le=20)


class SimulateResponse(CamelModel):
    label: str = "Simulated IoT reading"
    count: int
    readings: list[ReadingOut]


class AutomationRunRequest(CamelModel):
    batch_id: int | None = Field(default=None, ge=1)


class AutomationBatchResult(CamelModel):
    batch_id: int
    batch_code: str
    reading_created: bool
    prediction_created: bool
    detail: str


class AutomationRunResponse(CamelModel):
    triggered_by: str
    simulation_label: str
    prediction_disclaimer: str
    scanned: int
    readings_created: int
    predictions_created: int
    skipped_reason: str | None = None
    batches: list[AutomationBatchResult]


class AutomationStatus(CamelModel):
    enabled: bool
    mode: str
    simulation_label: str
    prediction_disclaimer: str
    scheduler_interval_seconds: int
    reading_interval_seconds: int
    prediction_interval_seconds: int
    max_batches_per_cycle: int
    eligible_batch_count: int
    latest_reading_at: datetime | None = None
    latest_prediction_at: datetime | None = None


# ---------------------------------------------------------------------------
# AI
# ---------------------------------------------------------------------------

class AdulterationRequest(CamelModel):
    cells: float = Field(alias="Cells")
    qvalue: float = Field(alias="QValue")
    fat: float = Field(alias="Fat")
    protein: float = Field(alias="Protein")
    lactose: float = Field(alias="Lactose")
    solids: float = Field(alias="Solids")
    ffa: float = Field(alias="FFA")
    citrate: float = Field(alias="Citrate")
    frz_point: float = Field(alias="FrzPoint")
    snf: float = Field(alias="SNF")
    mun: float = Field(alias="MUN")
    casein: float = Field(alias="Casein")

    def to_feature_dict(self) -> dict:
        return {
            "Cells": self.cells, "QValue": self.qvalue, "Fat": self.fat,
            "Protein": self.protein, "Lactose": self.lactose, "Solids": self.solids,
            "FFA": self.ffa, "Citrate": self.citrate, "FrzPoint": self.frz_point,
            "SNF": self.snf, "MUN": self.mun, "Casein": self.casein,
        }


class AdulterationResponse(CamelModel):
    adulteration_status: str
    adulteration_probabilities: dict[str, float]
    adulterant: str
    adulterant_probabilities: dict[str, float]
    is_uncertain: bool
    uncertainty_note: str | None = None
    model_version: str
    disclaimer: str = "Demonstration prediction — not laboratory certification."


class FreshnessRequest(CamelModel):
    time_since_milking_hours: float = Field(ge=0)
    avg_temperature_c: float
    min_temperature_c: float
    max_temperature_c: float
    temperature_std_c: float = Field(ge=0)
    time_above_5c_hours: float = Field(ge=0)
    time_above_10c_hours: float = Field(ge=0)
    temperature_excursions: float = Field(ge=0)

    def to_feature_dict(self) -> dict:
        return {
            "time_since_milking_hours": self.time_since_milking_hours,
            "avg_temperature_c": self.avg_temperature_c,
            "min_temperature_c": self.min_temperature_c,
            "max_temperature_c": self.max_temperature_c,
            "temperature_std_c": self.temperature_std_c,
            "time_above_5c_hours": self.time_above_5c_hours,
            "time_above_10c_hours": self.time_above_10c_hours,
            "temperature_excursions": self.temperature_excursions,
        }


class FreshnessResponse(CamelModel):
    remaining_shelf_life_hours: float
    spoilage_risk: str
    spoilage_probabilities: dict[str, float]
    freshness_score: float
    quality_class: str
    anomaly_detected: bool
    anomaly_reasons: list[str]
    is_uncertain: bool
    uncertainty_note: str | None = None
    features_used: dict[str, float] | None = None
    model_version: str
    disclaimer: str = "Demonstration prediction — not laboratory certification."
