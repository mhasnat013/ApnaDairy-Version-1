"""Import all model modules so SQLAlchemy registers every table."""

from app.models.core import AIPrediction, Farm, IoTSensorReading, MilkBatch, User
from app.models.commerce import (
    Cart,
    Delivery,
    DeliveryTracking,
    Discount,
    Order,
    Payment,
    PriceHistory,
    Product,
)
from app.models.engagement import (
    AdminActionLog,
    BulkPurchaseRequest,
    ChatbotMessage,
    Complaint,
    FarmAnalytics,
    Notification,
    Quotation,
    Review,
    Subscription,
)
from app.models.governance import AdminApplication, AdminFarmAssignment, EscalationCase, PlatformSetting

__all__ = [
    "AIPrediction",
    "AdminActionLog",
    "AdminApplication",
    "AdminFarmAssignment",
    "BulkPurchaseRequest",
    "Cart",
    "ChatbotMessage",
    "Complaint",
    "Delivery",
    "DeliveryTracking",
    "Discount",
    "Farm",
    "FarmAnalytics",
    "EscalationCase",
    "IoTSensorReading",
    "MilkBatch",
    "Notification",
    "Order",
    "Payment",
    "PriceHistory",
    "Product",
    "PlatformSetting",
    "Quotation",
    "Review",
    "Subscription",
    "User",
]
