"""Engagement models: BulkPurchaseRequest, Quotation, Subscription, Review,
Notification, Complaint, ChatbotMessage, FarmAnalytics, AdminActionLog.
Table/column names follow ERD_TRANSCRIPTION.md."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

from .enums import (
    CHATBOT_SENDER,
    COMPLAINT_STATUS,
    NOTIFICATION_TYPE,
    QUOTATION_STATUS,
    REQUEST_STATUS,
    SUBSCRIPTION_FREQUENCY,
    SUBSCRIPTION_STATUS,
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


class BulkPurchaseRequest(Base):
    __tablename__ = "bulk_purchase_request"

    request_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("product.product_id"), index=True
    )
    quantity_requested: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    target_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(
        _enum(REQUEST_STATUS), default="open", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    buyer: Mapped[User] = relationship(back_populates="bulk_requests")
    product: Mapped[Product] = relationship(back_populates="bulk_requests")
    quotations: Mapped[list[Quotation]] = relationship(
        back_populates="request", cascade="all, delete-orphan"
    )


class Quotation(Base):
    __tablename__ = "quotation"

    quotation_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(
        ForeignKey("bulk_purchase_request.request_id"), index=True
    )
    farm_id: Mapped[int] = mapped_column(ForeignKey("farm.farm_id"), index=True)
    bid_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    quantity_offered: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(
        _enum(QUOTATION_STATUS), default="submitted", index=True
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    request: Mapped[BulkPurchaseRequest] = relationship(back_populates="quotations")
    farm: Mapped[Farm] = relationship(back_populates="quotations")


class Subscription(Base):
    __tablename__ = "subscription"

    subscription_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farm.farm_id"), index=True)
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("product.product_id"), nullable=True
    )
    frequency: Mapped[str] = mapped_column(_enum(SUBSCRIPTION_FREQUENCY))
    status: Mapped[str] = mapped_column(
        _enum(SUBSCRIPTION_STATUS), default="active", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="subscriptions")
    farm: Mapped[Farm] = relationship(back_populates="subscriptions")
    product: Mapped[Product | None] = relationship(back_populates="subscriptions")


class Review(Base):
    __tablename__ = "review"

    review_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    farm_id: Mapped[int | None] = mapped_column(
        ForeignKey("farm.farm_id"), nullable=True, index=True
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("product.product_id"), nullable=True, index=True
    )
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="reviews")
    farm: Mapped[Farm | None] = relationship(back_populates="reviews")
    product: Mapped[Product | None] = relationship(back_populates="reviews")


class Notification(Base):
    __tablename__ = "notification"

    notification_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    type: Mapped[str] = mapped_column(_enum(NOTIFICATION_TYPE), default="system")
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="notifications")


class Complaint(Base):
    __tablename__ = "complaint"

    complaint_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("order.order_id"), nullable=True, index=True
    )
    subject: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        _enum(COMPLAINT_STATUS), default="open", index=True
    )
    category: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    priority: Mapped[str] = mapped_column(String(20), default="normal", index=True)
    farm_id: Mapped[int | None] = mapped_column(ForeignKey("farm.farm_id"), nullable=True, index=True)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("milk_batch.batch_id"), nullable=True, index=True)
    escalated_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("user.user_id"), nullable=True, index=True)
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="complaints", foreign_keys=[user_id])
    order: Mapped[Order | None] = relationship(back_populates="complaints")


class ChatbotMessage(Base):
    __tablename__ = "chatbot_message"

    message_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user.user_id"), nullable=True, index=True
    )
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    sender: Mapped[str] = mapped_column(_enum(CHATBOT_SENDER))
    message_text: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User | None] = relationship(back_populates="chatbot_messages")


class FarmAnalytics(Base):
    __tablename__ = "farm_analytics"

    analytics_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farm.farm_id"), index=True)
    product_category: Mapped[str] = mapped_column(String(128))
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    quantity_produced: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    quantity_sold: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    quantity_wasted: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    revenue: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    profit: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    loss: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    farm: Mapped[Farm] = relationship(back_populates="analytics")


class AdminActionLog(Base):
    __tablename__ = "admin_action_log"

    log_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    action: Mapped[str] = mapped_column(String(128), index=True)
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    admin: Mapped[User] = relationship(back_populates="admin_actions")
