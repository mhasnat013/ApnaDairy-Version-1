"""farm verification documents + DB-level enum CHECK constraints

Revision ID: b7c3a1f0e4d2
Revises: fae0062d7af9
Create Date: 2026-09-27
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Portable JSON: JSONB on PostgreSQL, plain JSON on SQLite (tests only).
JSONB_COL = postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")

revision: str = 'b7c3a1f0e4d2'
down_revision: str | Sequence[str] | None = 'fae0062d7af9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (table, column, allowed values) — mirrors app/models/enums.py
CHECKS: list[tuple[str, str, list[str]]] = [
    ("user", "role", ["customer", "farmer", "business", "rider", "admin"]),
    ("user", "status", ["active", "pending", "suspended", "deactivated"]),
    ("farm", "verification_status", ["pending", "verified", "rejected"]),
    ("milk_batch", "status", ["recorded", "testing", "approved", "rejected", "expired"]),
    ("ai_prediction", "quality_class", ["Fresh", "Medium", "Near Expiry"]),
    ("bulk_purchase_request", "status", ["open", "fulfilled", "expired", "cancelled"]),
    ("chatbot_message", "sender", ["user", "bot"]),
    ("complaint", "status", ["open", "in_review", "resolved", "closed"]),
    ("delivery", "status", ["scheduled", "assigned", "picked_up", "in_transit", "delivered", "failed"]),
    ("notification", "type", ["order", "payment", "delivery", "promotion", "system", "subscription", "pricing"]),
    ("order", "status", ["pending", "paid", "confirmed", "preparing", "in_transit", "delivered", "cancelled", "refunded"]),
    ("payment", "method", ["card", "bank_transfer", "wallet", "cash_on_delivery"]),
    ("payment", "status", ["pending", "completed", "failed", "refunded"]),
    ("product", "status", ["draft", "active", "out_of_stock", "archived"]),
    ("quotation", "status", ["submitted", "accepted", "rejected", "withdrawn"]),
    ("subscription", "frequency", ["daily", "weekly", "monthly"]),
    ("subscription", "status", ["active", "paused", "cancelled"]),
]


def _ck_name(table: str, column: str) -> str:
    return f"ck_{table}_{column}_enum"


def upgrade() -> None:
    # Idempotent on live DBs: skip if the column already exists. Offline
    # (--sql) mode has no connection to inspect, so always emit the ADD.
    try:
        cols = [c["name"] for c in sa.inspect(op.get_bind()).get_columns("farm")]
    except Exception:
        cols = []
    if "verification_documents" not in cols:
        op.add_column("farm", sa.Column("verification_documents", JSONB_COL, nullable=True))
    # SQLite cannot ALTER constraints in place; batch mode recreates the table
    # (copy-and-move) so the same revision works on SQLite and Postgres.
    tables = sorted({t for t, _, _ in CHECKS})
    for table in tables:
        with op.batch_alter_table(table) as batch:
            for t, column, values in CHECKS:
                if t != table:
                    continue
                quoted = ", ".join(f"'{v}'" for v in values)
                batch.create_check_constraint(_ck_name(table, column), f"{column} IN ({quoted})")


def downgrade() -> None:
    tables = sorted({t for t, _, _ in CHECKS})
    for table in tables:
        with op.batch_alter_table(table) as batch:
            for t, column, _ in CHECKS:
                if t == table:
                    batch.drop_constraint(_ck_name(table, column), type_="check")
    op.drop_column("farm", "verification_documents")
