"""Super Admin governance models.

These tables hold approval and escalation workflow state only. Core user,
farm, complaint, notification and audit data remain in their existing tables.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from .enums import (
    ADMIN_APPLICATION_STATUS,
    ESCALATION_CASE_TYPES,
    ESCALATION_PRIORITIES,
    ESCALATION_STATUS,
)


def _enum(values: list[str]):
    return Enum(*values, native_enum=False, validate_strings=True, create_constraint=True, length=40)


JSONB_COL = JSONB().with_variant(JSON(), "sqlite")


class AdminApplication(Base):
    __tablename__ = "admin_application"

    application_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    applicant_user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    requested_role: Mapped[str] = mapped_column(String(40), default="admin")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(_enum(ADMIN_APPLICATION_STATUS), default="pending", index=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_by_superadmin_id: Mapped[int | None] = mapped_column(ForeignKey("user.user_id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class AdminFarmAssignment(Base):
    __tablename__ = "admin_farm_assignment"
    __table_args__ = (UniqueConstraint("admin_id", "farm_id", name="uq_admin_farm_assignment"),)

    assignment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farm.farm_id"), index=True)
    assigned_by_superadmin_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class EscalationCase(Base):
    __tablename__ = "escalation_case"

    case_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    case_type: Mapped[str] = mapped_column(_enum(ESCALATION_CASE_TYPES), index=True)
    category: Mapped[str] = mapped_column(String(128), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(_enum(ESCALATION_PRIORITIES), default="normal", index=True)
    status: Mapped[str] = mapped_column(_enum(ESCALATION_STATUS), default="pending", index=True)
    raised_by_admin_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    assigned_to_superadmin_id: Mapped[int | None] = mapped_column(ForeignKey("user.user_id"), nullable=True)
    farm_id: Mapped[int | None] = mapped_column(ForeignKey("farm.farm_id"), nullable=True, index=True)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("milk_batch.batch_id"), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("user.user_id"), nullable=True, index=True)
    complaint_id: Mapped[int | None] = mapped_column(ForeignKey("complaint.complaint_id"), nullable=True, index=True)
    admin_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PlatformSetting(Base):
    __tablename__ = "platform_setting"

    setting_key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value_json: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSONB_COL, nullable=True)
    updated_by: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
