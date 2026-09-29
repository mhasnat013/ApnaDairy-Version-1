"""Shared enum value lists — stored as VARCHAR with CHECK constraints (plan §9)."""

USER_ROLES = ["customer", "farmer", "business", "rider", "admin", "superadmin"]
PUBLIC_ROLES = ["customer", "farmer", "business", "rider"]
USER_STATUS = ["active", "pending", "suspended", "deactivated"]

FARM_VERIFICATION = ["pending", "verified", "rejected"]

BATCH_STATUS = ["recorded", "testing", "approved", "rejected", "expired"]

PRODUCT_STATUS = ["draft", "active", "out_of_stock", "archived"]

ORDER_STATUS = [
    "pending",
    "paid",
    "confirmed",
    "preparing",
    "in_transit",
    "delivered",
    "cancelled",
    "refunded",
]

PAYMENT_STATUS = ["pending", "completed", "failed", "refunded"]
PAYMENT_METHOD = ["card", "bank_transfer", "wallet", "cash_on_delivery"]

DELIVERY_STATUS = ["scheduled", "assigned", "picked_up", "in_transit", "delivered", "failed"]

REQUEST_STATUS = ["open", "fulfilled", "expired", "cancelled"]
QUOTATION_STATUS = ["submitted", "accepted", "rejected", "withdrawn"]

SUBSCRIPTION_STATUS = ["active", "paused", "cancelled"]
SUBSCRIPTION_FREQUENCY = ["daily", "weekly", "monthly"]

COMPLAINT_STATUS = ["open", "in_review", "resolved", "closed"]

ADMIN_APPLICATION_STATUS = ["pending", "approved", "rejected", "withdrawn"]
ESCALATION_CASE_TYPES = ["farm", "batch", "account", "technical", "complaint"]
ESCALATION_PRIORITIES = ["low", "normal", "high", "urgent"]
ESCALATION_STATUS = ["pending", "in_review", "awaiting_admin", "resolved", "closed"]

NOTIFICATION_TYPE = ["order", "payment", "delivery", "promotion", "system", "subscription", "pricing"]

CHATBOT_SENDER = ["user", "bot"]

# Quality bands from the model team's own predict.py (plan §9.5).
QUALITY_CLASS = ["Fresh", "Medium", "Near Expiry"]
