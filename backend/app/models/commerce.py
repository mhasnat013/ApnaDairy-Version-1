"""Commerce models: Product, PriceHistory, Discount, Cart, Order, Payment,
Delivery, DeliveryTracking. Table/column names follow ERD_TRANSCRIPTION.md."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

from .enums import (
    DELIVERY_STATUS,
    ORDER_STATUS,
    PAYMENT_METHOD,
    PAYMENT_STATUS,
    PRODUCT_STATUS,
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


class Product(Base):
    __tablename__ = "product"

    product_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farm.farm_id"), index=True)
    batch_id: Mapped[int | None] = mapped_column(
        ForeignKey("milk_batch.batch_id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), index=True)
    category: Mapped[str] = mapped_column(String(128), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit_of_measure: Mapped[str] = mapped_column(String(32), default="liter")
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    quantity_available: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[str] = mapped_column(_enum(PRODUCT_STATUS), default="draft")
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    farm: Mapped[Farm] = relationship(back_populates="products")
    batch: Mapped[MilkBatch | None] = relationship(back_populates="products")
    price_history: Mapped[list[PriceHistory]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    discounts: Mapped[list[Discount]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    bulk_requests: Mapped[list[BulkPurchaseRequest]] = relationship(
        back_populates="product"
    )
    subscriptions: Mapped[list[Subscription]] = relationship(back_populates="product")
    reviews: Mapped[list[Review]] = relationship(back_populates="product")


class PriceHistory(Base):
    __tablename__ = "price_history"

    history_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("product.product_id"), index=True
    )
    old_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    new_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reason: Mapped[str | None] = mapped_column(String(512), nullable=True)

    product: Mapped[Product] = relationship(back_populates="price_history")


class Discount(Base):
    __tablename__ = "discount"

    discount_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("product.product_id"), index=True
    )
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    reason: Mapped[str | None] = mapped_column(String(512), nullable=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    product: Mapped[Product] = relationship(back_populates="discounts")


class Cart(Base):
    __tablename__ = "cart"

    cart_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.user_id"), unique=True, index=True
    )
    cart_data: Mapped[dict[str, Any]] = mapped_column(JSONB_COL, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="cart")


class Order(Base):
    __tablename__ = "order"

    order_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    order_items: Mapped[dict[str, Any]] = mapped_column(JSONB_COL, default=dict)
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(
        _enum(ORDER_STATUS), default="pending", index=True
    )
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="orders")
    payment: Mapped[Payment | None] = relationship(
        back_populates="order", uselist=False, cascade="all, delete-orphan"
    )
    delivery: Mapped[Delivery | None] = relationship(
        back_populates="order", uselist=False, cascade="all, delete-orphan"
    )
    complaints: Mapped[list[Complaint]] = relationship(back_populates="order")


class Payment(Base):
    __tablename__ = "payment"

    payment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("order.order_id"), unique=True, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    method: Mapped[str] = mapped_column(_enum(PAYMENT_METHOD))
    status: Mapped[str] = mapped_column(_enum(PAYMENT_STATUS), default="pending")
    transaction_ref: Mapped[str | None] = mapped_column(
        String(128), nullable=True, unique=True
    )
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    order: Mapped[Order] = relationship(back_populates="payment")


class Delivery(Base):
    __tablename__ = "delivery"

    delivery_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("order.order_id"), unique=True, index=True
    )
    delivery_person_id: Mapped[int | None] = mapped_column(
        ForeignKey("user.user_id"), nullable=True, index=True
    )
    address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    scheduled_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(
        _enum(DELIVERY_STATUS), default="scheduled", index=True
    )

    order: Mapped[Order] = relationship(back_populates="delivery")
    rider: Mapped[User | None] = relationship(
        back_populates="deliveries", foreign_keys=[delivery_person_id]
    )
    tracking_updates: Mapped[list[DeliveryTracking]] = relationship(
        back_populates="delivery", cascade="all, delete-orphan"
    )


class DeliveryTracking(Base):
    __tablename__ = "delivery_tracking"

    tracking_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    delivery_id: Mapped[int] = mapped_column(
        ForeignKey("delivery.delivery_id"), index=True
    )
    status_update: Mapped[str] = mapped_column(String(512))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    delivery: Mapped[Delivery] = relationship(back_populates="tracking_updates")
