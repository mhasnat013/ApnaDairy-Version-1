"""Super Admin governance, role hierarchy and case workflow.

Revision ID: c9e4f2a7d1b3
Revises: b7c3a1f0e4d2
Create Date: 2026-09-27
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c9e4f2a7d1b3"
down_revision: str | Sequence[str] | None = "b7c3a1f0e4d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JSON_COL = postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    with op.batch_alter_table("user") as batch:
        batch.drop_constraint("ck_user_role_enum", type_="check")
        batch.create_check_constraint(
            "ck_user_role_enum",
            "role IN ('customer', 'farmer', 'business', 'rider', 'admin', 'superadmin')",
        )

    with op.batch_alter_table("complaint") as batch:
        batch.add_column(sa.Column("category", sa.String(128), nullable=True))
        batch.add_column(sa.Column("priority", sa.String(20), nullable=False, server_default="normal"))
        batch.add_column(sa.Column("farm_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("batch_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("escalated_by_admin_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("admin_remarks", sa.Text(), nullable=True))
        batch.add_column(sa.Column("resolution_notes", sa.Text(), nullable=True))
        batch.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
        batch.create_foreign_key("fk_complaint_farm", "farm", ["farm_id"], ["farm_id"])
        batch.create_foreign_key("fk_complaint_batch", "milk_batch", ["batch_id"], ["batch_id"])
        batch.create_foreign_key("fk_complaint_escalated_by", "user", ["escalated_by_admin_id"], ["user_id"])
        batch.create_index("ix_complaint_category", ["category"])
        batch.create_index("ix_complaint_priority", ["priority"])
        batch.create_index("ix_complaint_farm_id", ["farm_id"])
        batch.create_index("ix_complaint_batch_id", ["batch_id"])
        batch.create_index("ix_complaint_escalated_by_admin_id", ["escalated_by_admin_id"])

    op.create_table(
        "admin_application",
        sa.Column("application_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("applicant_user_id", sa.Integer(), sa.ForeignKey("user.user_id"), nullable=False),
        sa.Column("requested_role", sa.String(40), nullable=False, server_default="admin"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(40), nullable=False, server_default="pending"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("reviewed_by_superadmin_id", sa.Integer(), sa.ForeignKey("user.user_id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.CheckConstraint("status IN ('pending', 'approved', 'rejected', 'withdrawn')", name="ck_admin_application_status_enum"),
    )
    op.create_index("ix_admin_application_applicant_user_id", "admin_application", ["applicant_user_id"])
    op.create_index("ix_admin_application_status", "admin_application", ["status"])

    op.create_table(
        "admin_farm_assignment",
        sa.Column("assignment_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("user.user_id"), nullable=False),
        sa.Column("farm_id", sa.Integer(), sa.ForeignKey("farm.farm_id"), nullable=False),
        sa.Column("assigned_by_superadmin_id", sa.Integer(), sa.ForeignKey("user.user_id"), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("admin_id", "farm_id", name="uq_admin_farm_assignment"),
    )
    op.create_index("ix_admin_farm_assignment_admin_id", "admin_farm_assignment", ["admin_id"])
    op.create_index("ix_admin_farm_assignment_farm_id", "admin_farm_assignment", ["farm_id"])
    op.create_index("ix_admin_farm_assignment_assigned_by_superadmin_id", "admin_farm_assignment", ["assigned_by_superadmin_id"])
    op.create_index("ix_admin_farm_assignment_is_active", "admin_farm_assignment", ["is_active"])

    op.create_table(
        "escalation_case",
        sa.Column("case_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("case_code", sa.String(64), nullable=False, unique=True),
        sa.Column("case_type", sa.String(40), nullable=False),
        sa.Column("category", sa.String(128), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("priority", sa.String(40), nullable=False, server_default="normal"),
        sa.Column("status", sa.String(40), nullable=False, server_default="pending"),
        sa.Column("raised_by_admin_id", sa.Integer(), sa.ForeignKey("user.user_id"), nullable=False),
        sa.Column("assigned_to_superadmin_id", sa.Integer(), sa.ForeignKey("user.user_id"), nullable=True),
        sa.Column("farm_id", sa.Integer(), sa.ForeignKey("farm.farm_id"), nullable=True),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("milk_batch.batch_id"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.user_id"), nullable=True),
        sa.Column("complaint_id", sa.Integer(), sa.ForeignKey("complaint.complaint_id"), nullable=True),
        sa.Column("admin_remarks", sa.Text(), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("case_type IN ('farm', 'batch', 'account', 'technical', 'complaint')", name="ck_escalation_case_case_type_enum"),
        sa.CheckConstraint("priority IN ('low', 'normal', 'high', 'urgent')", name="ck_escalation_case_priority_enum"),
        sa.CheckConstraint("status IN ('pending', 'in_review', 'awaiting_admin', 'resolved', 'closed')", name="ck_escalation_case_status_enum"),
    )
    for column in ("case_code", "case_type", "category", "priority", "status", "raised_by_admin_id", "farm_id", "batch_id", "user_id", "complaint_id", "created_at"):
        op.create_index(f"ix_escalation_case_{column}", "escalation_case", [column])

    op.create_table(
        "platform_setting",
        sa.Column("setting_key", sa.String(128), primary_key=True),
        sa.Column("value_json", JSON_COL, nullable=True),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("user.user_id"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_platform_setting_updated_by", "platform_setting", ["updated_by"])


def downgrade() -> None:
    op.drop_table("platform_setting")
    op.drop_table("escalation_case")
    op.drop_table("admin_farm_assignment")
    op.drop_table("admin_application")
    with op.batch_alter_table("complaint") as batch:
        for name in ("ix_complaint_escalated_by_admin_id", "ix_complaint_batch_id", "ix_complaint_farm_id", "ix_complaint_priority", "ix_complaint_category"):
            batch.drop_index(name)
        batch.drop_constraint("fk_complaint_escalated_by", type_="foreignkey")
        batch.drop_constraint("fk_complaint_batch", type_="foreignkey")
        batch.drop_constraint("fk_complaint_farm", type_="foreignkey")
        for column in ("updated_at", "resolution_notes", "admin_remarks", "escalated_at", "escalated_by_admin_id", "batch_id", "farm_id", "priority", "category"):
            batch.drop_column(column)
    with op.batch_alter_table("user") as batch:
        batch.drop_constraint("ck_user_role_enum", type_="check")
        batch.create_check_constraint("ck_user_role_enum", "role IN ('customer', 'farmer', 'business', 'rider', 'admin')")
