"""Request/response contracts for Super Admin governance APIs."""

from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.base import CamelModel


class AdminApplicationCreate(CamelModel):
    applicant_user_id: int
    reason: str | None = Field(default=None, max_length=4000)


class AdminApplicationDecision(CamelModel):
    status: str
    review_notes: str | None = Field(default=None, max_length=4000)


class AssignmentCreate(CamelModel):
    admin_id: int
    farm_id: int


class CaseCreate(CamelModel):
    case_type: str
    category: str = Field(min_length=2, max_length=128)
    title: str = Field(min_length=4, max_length=255)
    description: str = Field(min_length=10, max_length=10000)
    priority: str = "normal"
    farm_id: int | None = None
    batch_id: int | None = None
    user_id: int | None = None
    complaint_id: int | None = None
    admin_remarks: str | None = Field(default=None, max_length=4000)


class CaseUpdate(CamelModel):
    status: str | None = None
    priority: str | None = None
    assigned_to_superadmin_id: int | None = None
    admin_remarks: str | None = Field(default=None, max_length=4000)
    resolution_notes: str | None = Field(default=None, max_length=4000)


class ComplaintEscalate(CamelModel):
    category: str = Field(default="complaint", min_length=2, max_length=128)
    priority: str = "normal"
    admin_remarks: str | None = Field(default=None, max_length=4000)


class PlatformSettingUpdate(CamelModel):
    value: Any = None


class SupportContact(CamelModel):
    name: str
    email: str
    phone: str | None = None
    role: str | None = None


class SuperAdminUserUpdate(CamelModel):
    status: str | None = None
    is_verified: bool | None = None

