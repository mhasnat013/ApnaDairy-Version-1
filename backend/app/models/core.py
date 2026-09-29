"""Core models: User, Farm, MilkBatch, IoTSensorReading, AIPrediction.

Table/column names follow ERD_TRANSCRIPTION.md exactly. "user" and "order"
are reserved words in PostgreSQL — SQLAlchemy quotes them automatically.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

from .enums import (
    BATCH_STATUS,
    FARM_VERIFICATION,
    QUALITY_CLASS,
    USER_ROLES,
    USER_STATUS,
)


def _enum(values: list[str], **kwargs):
    return Enum(
        *values,
        native_enum=False,
        validate_strings=True,
        create_constraint=True,
        length=40,
        **kwargs,
    )


JSONB_COL = JSONB().with_variant(JSON(), "sqlite")


class User(Base):
    __tablename__ = "user"

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(32), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(_enum(USER_ROLES), index=True)
    address_line: Mapped[str | None] = mapped_column(String(512), nullable=True)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(_enum(USER_STATUS), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    farm: Mapped[Farm | None] = relationship(back_populates="owner", uselist=False)
    cart: Mapped[Cart | None] = relationship(back_populates="user", uselist=False)
    orders: Mapped[list[Order]] = relationship(back_populates="user")
    bulk_requests: Mapped[list[BulkPurchaseRequest]] = relationship(back_populates="buyer")
    subscriptions: Mapped[list[Subscription]] = relationship(back_populates="user")
    reviews: Mapped[list[Review]] = relationship(back_populates="user")
    notifications: Mapped[list[Notification]] = relationship(back_populates="user")
    complaints: Mapped[list[Complaint]] = relationship(
        back_populates="user", foreign_keys="Complaint.user_id"
    )
    chatbot_messages: Mapped[list[ChatbotMessage]] = relationship(back_populates="user")
    deliveries: Mapped[list[Delivery]] = relationship(
        back_populates="rider", foreign_keys="Delivery.delivery_person_id"
    )
    admin_actions: Mapped[list[AdminActionLog]] = relationship(back_populates="admin")


class Farm(Base):
    __tablename__ = "farm"

    farm_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.user_id"), unique=True, index=True
    )
    farm_name: Mapped[str] = mapped_column(String(255))
    location: Mapped[str] = mapped_column(String(512))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    capacity_liters: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    established_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(
        _enum(FARM_VERIFICATION), default="pending", index=True
    )
    verification_documents: Mapped[list | None] = mapped_column(JSONB_COL, nullable=True, default=None)
    rating_avg: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    owner: Mapped[User] = relationship(back_populates="farm")
    batches: Mapped[list[MilkBatch]] = relationship(back_populates="farm")
    products: Mapped[list[Product]] = relationship(back_populates="farm")
    quotations: Mapped[list[Quotation]] = relationship(back_populates="farm")
    subscriptions: Mapped[list[Subscription]] = relationship(back_populates="farm")
    reviews: Mapped[list[Review]] = relationship(back_populates="farm")
    analytics: Mapped[list[FarmAnalytics]] = relationship(back_populates="farm")


class MilkBatch(Base):
    __tablename__ = "milk_batch"

    batch_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farm.farm_id"), index=True)
    batch_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    milking_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    collection_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    quantity_liters: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    initial_storage_temp: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )
    status: Mapped[str] = mapped_column(_enum(BATCH_STATUS), default="recorded")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    farm: Mapped[Farm] = relationship(back_populates="batches")
    readings: Mapped[list[IoTSensorReading]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    predictions: Mapped[list[AIPrediction]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    products: Mapped[list[Product]] = relationship(back_populates="batch")


class IoTSensorReading(Base):
    __tablename__ = "iot_sensor_reading"

    reading_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("milk_batch.batch_id"), index=True
    )
    sensor_type: Mapped[str] = mapped_column(String(64), index=True)
    reading_value: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    batch: Mapped[MilkBatch] = relationship(back_populates="readings")


class AIPrediction(Base):
    __tablename__ = "ai_prediction"

    prediction_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("milk_batch.batch_id"), index=True
    )
    predicted_shelf_life_hours: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    freshness_score: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )
    quality_class: Mapped[str | None] = mapped_column(
        _enum(QUALITY_CLASS), nullable=True
    )
    anomaly_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    model_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    predicted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    batch: Mapped[MilkBatch] = relationship(back_populates="predictions")
