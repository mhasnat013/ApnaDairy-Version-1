"""Commerce + engagement schemas."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from .base import CamelModel

# ---------------------------------------------------------------------------
# Products / pricing
# ---------------------------------------------------------------------------

class ProductCreate(CamelModel):
    farm_id: int | None = None
    name: str = Field(min_length=2, max_length=255)
    category: str = Field(min_length=1, max_length=128)
    description: str | None = None
    unit_of_measure: str = Field(default="liter", max_length=32)
    price: Decimal = Field(ge=0)
    quantity_available: Decimal = Field(default=0, ge=0)
    batch_id: int | None = None
    image_url: str | None = Field(default=None, max_length=1024)
    status: str = "draft"


class ProductUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    category: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = None
    unit_of_measure: str | None = Field(default=None, max_length=32)
    price: Decimal | None = Field(default=None, ge=0)
    quantity_available: Decimal | None = Field(default=None, ge=0)
    batch_id: int | None = None
    image_url: str | None = Field(default=None, max_length=1024)
    status: str | None = None


class ProductOut(CamelModel):
    id: int
    name: str
    category: str
    description: str | None = None
    unit_of_measure: str
    price: float
    quantity_available: float
    status: str
    image_url: str | None = None
    farm_id: int
    farm_name: str | None = None
    batch_id: int | None = None
    batch_code: str | None = None
    freshness_score: float | None = None


class PriceChangeRequest(CamelModel):
    new_price: Decimal = Field(ge=0)
    reason: str | None = Field(default=None, max_length=512)


class PriceHistoryOut(CamelModel):
    id: int
    product_id: int
    old_price: float
    new_price: float
    changed_at: datetime | None = None
    reason: str | None = None


class DiscountCreate(CamelModel):
    discount_percent: Decimal = Field(ge=0, le=100)
    reason: str | None = Field(default=None, max_length=512)
    valid_from: datetime
    valid_until: datetime


class DiscountOut(CamelModel):
    id: int
    product_id: int
    discount_percent: float
    reason: str | None = None
    valid_from: datetime
    valid_until: datetime


class PricingRulesOut(CamelModel):
    note: str
    active_discounts: list[DiscountOut]


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------

class CartItemIn(CamelModel):
    product_id: int
    quantity: Decimal = Field(gt=0)


class CartUpdate(CamelModel):
    items: list[CartItemIn]


class CartItemOut(CamelModel):
    product_id: int
    quantity: float
    name: str
    price: float
    image_url: str | None = None
    farm_name: str | None = None


class CartOut(CamelModel):
    items: list[CartItemOut]
    total: float


# ---------------------------------------------------------------------------
# Orders / payments / deliveries
# ---------------------------------------------------------------------------

class OrderCreate(CamelModel):
    delivery_address: str | None = None


class OrderItemOut(CamelModel):
    product_id: int
    quantity: float
    name: str
    price: float
    farm_id: int | None = None


class PaymentOut(CamelModel):
    id: int
    order_id: int
    amount: float
    method: str
    status: str
    transaction_ref: str | None = None
    paid_at: datetime | None = None
    disclaimer: str = "Demo payment — no real money will be charged"


class DeliveryOut(CamelModel):
    id: int
    order_id: int
    rider_id: int | None = None
    rider_name: str | None = None
    address: str | None = None
    scheduled_time: datetime | None = None
    delivered_time: datetime | None = None
    status: str


class OrderOut(CamelModel):
    id: int
    user_id: int
    items: list[OrderItemOut]
    order_date: datetime | None = None
    total_amount: float
    status: str
    delivery_address: str | None = None
    payment: PaymentOut | None = None
    delivery: DeliveryOut | None = None


class OrderStatusUpdate(CamelModel):
    status: str


class PayRequest(CamelModel):
    method: str = "card"


class DeliveryAssign(CamelModel):
    rider_id: int


class DeliveryStatusUpdate(CamelModel):
    status: str


class TrackingCreate(CamelModel):
    status_update: str = Field(min_length=1, max_length=512)
    latitude: Decimal | None = None
    longitude: Decimal | None = None


class TrackingOut(CamelModel):
    id: int
    delivery_id: int
    status_update: str
    latitude: float | None = None
    longitude: float | None = None
    timestamp: datetime | None = None


# ---------------------------------------------------------------------------
# B2B
# ---------------------------------------------------------------------------

class BulkRequestCreate(CamelModel):
    product_id: int
    quantity_requested: Decimal = Field(gt=0)
    target_price: Decimal | None = Field(default=None, ge=0)
    deadline: datetime | None = None


class BulkRequestOut(CamelModel):
    id: int
    buyer_id: int
    buyer_name: str | None = None
    product_id: int
    product_name: str | None = None
    quantity_requested: float
    target_price: float | None = None
    deadline: datetime | None = None
    status: str
    created_at: datetime | None = None
    quotation_count: int = 0


class QuotationCreate(CamelModel):
    bid_price: Decimal = Field(ge=0)
    quantity_offered: Decimal = Field(gt=0)


class QuotationOut(CamelModel):
    id: int
    request_id: int
    farm_id: int
    farm_name: str | None = None
    bid_price: float
    quantity_offered: float
    status: str
    submitted_at: datetime | None = None


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

class SubscriptionCreate(CamelModel):
    farm_id: int
    product_id: int | None = None
    frequency: str


class SubscriptionUpdate(CamelModel):
    frequency: str | None = None
    status: str | None = None


class SubscriptionOut(CamelModel):
    id: int
    user_id: int
    farm_id: int
    farm_name: str | None = None
    product_id: int | None = None
    product_name: str | None = None
    frequency: str
    status: str
    created_at: datetime | None = None


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------

class ReviewCreate(CamelModel):
    farm_id: int | None = None
    product_id: int | None = None
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewOut(CamelModel):
    id: int
    user_id: int
    user_name: str | None = None
    farm_id: int | None = None
    product_id: int | None = None
    rating: int
    comment: str | None = None
    created_at: datetime | None = None


# ---------------------------------------------------------------------------
# Complaints
# ---------------------------------------------------------------------------

class ComplaintCreate(CamelModel):
    subject: str = Field(min_length=4, max_length=255)
    description: str = Field(min_length=10)
    order_id: int | None = None


class ComplaintUpdate(CamelModel):
    status: str | None = None
    description: str | None = None


class ComplaintOut(CamelModel):
    id: int
    user_id: int
    order_id: int | None = None
    subject: str
    description: str
    status: str
    category: str | None = None
    priority: str = "normal"
    farm_id: int | None = None
    batch_id: int | None = None
    escalated_by_admin_id: int | None = None
    escalated_at: datetime | None = None
    admin_remarks: str | None = None
    resolution_notes: str | None = None
    created_at: datetime | None = None
    resolved_at: datetime | None = None
    updated_at: datetime | None = None


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationCreate(CamelModel):
    user_id: int | None = None  # None = broadcast to all users (admin)
    type: str = "system"
    message: str = Field(min_length=1)


class NotificationOut(CamelModel):
    id: int
    user_id: int
    type: str
    message: str
    is_read: bool
    sent_at: datetime | None = None


# ---------------------------------------------------------------------------
# Chatbot / support
# ---------------------------------------------------------------------------

class ChatMessageCreate(CamelModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: str | None = Field(default=None, max_length=64)


class ChatMessageOut(CamelModel):
    id: int
    session_id: str
    sender: str
    message_text: str
    sent_at: datetime | None = None


class ChatReply(CamelModel):
    reply: str
    session_id: str
    configured: bool
    messages: list[ChatMessageOut]


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class FarmAnalyticsSnapshot(CamelModel):
    product_category: str = Field(min_length=1, max_length=128)
    period_start: date
    period_end: date
    quantity_produced: Decimal = Field(default=0, ge=0)
    quantity_sold: Decimal = Field(default=0, ge=0)
    quantity_wasted: Decimal = Field(default=0, ge=0)
    revenue: Decimal = Field(default=0, ge=0)
    cost: Decimal = Field(default=0, ge=0)
    profit: Decimal = Field(default=0)
    loss: Decimal = Field(default=0, ge=0)


class FarmAnalyticsOut(FarmAnalyticsSnapshot):
    id: int
    farm_id: int
    created_at: datetime | None = None


class FarmerOverviewOut(CamelModel):
    farm_id: int
    total_batches: int
    total_products: int
    active_orders: int
    total_revenue: float
    avg_freshness_score: float | None = None
    open_complaints: int


class AdminOverviewOut(CamelModel):
    total_users: int
    total_farms: int
    pending_farms: int
    total_batches: int
    total_orders: int
    total_revenue: float
    open_complaints: int
    active_subscriptions: int


class BusinessOverviewOut(CamelModel):
    open_requests: int
    total_quotations: int
    accepted_quotations: int
    total_spent: float


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

class ActionLogOut(CamelModel):
    id: int
    admin_id: int
    admin_name: str | None = None
    action: str
    entity_type: str
    entity_id: int | None = None
    description: str | None = None
    created_at: datetime | None = None


# ---------------------------------------------------------------------------
# Uploads
# ---------------------------------------------------------------------------

class UploadOut(CamelModel):
    url: str
    filename: str
    size_bytes: int
