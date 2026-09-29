# ApnaDairy — API Contract (single source of truth)

> Auto-generated from the running backend's OpenAPI spec on 2026-09-27.
> Regenerate with: `cd backend && .venv/bin/python -c "from app.main import app; import json; json.dump(app.openapi(), open('/tmp/openapi.json','w'))"`
> then re-run the generator. Do NOT hand-edit endpoint rows — fix the code instead.

Base URL: `/api/v1`. JSON everywhere (multipart for `POST /uploads`).
Auth: JWT Bearer token (`Authorization: Bearer <access_token>`). Login returns access + refresh tokens;
`POST /auth/refresh` rotates them. Logout is client-side (token discard).
Roles: `customer | farmer | business | rider | admin`. Public signup allows customer, farmer,
business, rider only — there is no public admin registration. Rider accounts start `pending` and
need admin activation before login works.
Errors: `{detail: "..."}`. Rate limit on login/register: 30 attempts/minute per IP → HTTP 429.
Currency: PKR. Datetimes: ISO 8601 UTC. IDs: integers.
Honesty labels served by the API: payments are simulated (`"Demo payment — no real money will be charged"`),
IoT readings may be simulated (`"Simulated IoT reading"`), AI output is a demonstration prediction
(`"Demonstration prediction — not laboratory certification."`).

## auth
- `POST /api/v1/auth/forgot-password` — Forgot Password (body: `ForgotPasswordRequest`; → `object`)
- `POST /api/v1/auth/login` — Login (body: `LoginRequest`; → `TokenResponse`)
- `GET /api/v1/auth/me` — Me (→ `UserOut`)
- `POST /api/v1/auth/refresh` — Refresh (body: `RefreshRequest`; → `RefreshResponse`)
- `POST /api/v1/auth/register` — Register (body: `RegisterRequest`; → `TokenResponse`)
- `POST /api/v1/auth/reset-password` — Reset Password (body: `ResetPasswordRequest`; → `MessageOut`)

## catalog
- `DELETE /api/v1/discounts/{discount_id}` — Delete Discount (params: discount_id (path, required); → `MessageOut`)
- `GET /api/v1/farms` — List Farms (params: search (query, optional), verification_status (query, optional), skip (query, optional), limit (query, optional); → `list[FarmOut]`)
- `POST /api/v1/farms` — Create Farm (body: `FarmCreate`; → `FarmOut`)
- `GET /api/v1/farms/{farm_id}` — Get Farm (params: farm_id (path, required); → `FarmOut`)
- `PATCH /api/v1/farms/{farm_id}` — Update Farm (params: farm_id (path, required); body: `FarmUpdate`; → `FarmOut`)
- `POST /api/v1/farms/{farm_id}/verification-documents` — Add Farm Verification Document (params: farm_id (path, required); body: `FarmDocumentAdd`; → `FarmOut`)
- `GET /api/v1/pricing/rules` — Pricing Rules (→ `PricingRulesOut`)
- `GET /api/v1/products` — List Products (params: search (query, optional), category (query, optional), farm_id (query, optional), status (query, optional), skip (query, optional), limit (query, optional); → `list[ProductOut]`)
- `POST /api/v1/products` — Create Product (body: `ProductCreate`; → `ProductOut`)
- `GET /api/v1/products/{product_id}` — Get Product (params: product_id (path, required); → `ProductOut`)
- `PATCH /api/v1/products/{product_id}` — Update Product (params: product_id (path, required); body: `ProductUpdate`; → `ProductOut`)
- `DELETE /api/v1/products/{product_id}` — Archive Product (params: product_id (path, required); → `MessageOut`)
- `GET /api/v1/products/{product_id}/discounts` — List Discounts (params: product_id (path, required); → `list[DiscountOut]`)
- `POST /api/v1/products/{product_id}/discounts` — Create Discount (params: product_id (path, required); body: `DiscountCreate`; → `DiscountOut`)
- `PATCH /api/v1/products/{product_id}/price` — Change Price (params: product_id (path, required); body: `PriceChangeRequest`; → `ProductOut`)
- `GET /api/v1/products/{product_id}/price-history` — Get Price History (params: product_id (path, required); → `list[PriceHistoryOut]`)
- `GET /api/v1/reviews` — List Reviews (params: farm_id (query, optional), product_id (query, optional), skip (query, optional), limit (query, optional); → `list[ReviewOut]`)
- `POST /api/v1/reviews` — Create Review (body: `ReviewCreate`; → `ReviewOut`)

## batches
- `GET /api/v1/batches` — List Batches (params: farm_id (query, optional), status (query, optional), skip (query, optional), limit (query, optional); → `list[BatchOut]`)
- `POST /api/v1/batches` — Create Batch (body: `BatchCreate`; → `BatchOut`)
- `GET /api/v1/batches/trace/{batch_code}` — Trace Batch (params: batch_code (path, required); → `BatchTraceOut`)
- `GET /api/v1/batches/{batch_id}` — Get Batch (params: batch_id (path, required); → `BatchOut`)
- `PATCH /api/v1/batches/{batch_id}` — Update Batch (params: batch_id (path, required); body: `BatchUpdate`; → `BatchOut`)
- `DELETE /api/v1/batches/{batch_id}` — Delete Batch (params: batch_id (path, required); → `MessageOut`)
- `GET /api/v1/batches/{batch_id}/predictions` — Batch Predictions (params: batch_id (path, required); → `list[PredictionOut]`)
- `POST /api/v1/batches/{batch_id}/score` — Score Batch (params: batch_id (path, required); → `FreshnessResponse`)

## commerce
- `GET /api/v1/cart` — Get Cart (→ `CartOut`)
- `PUT /api/v1/cart` — Update Cart (body: `CartUpdate`; → `CartOut`)
- `DELETE /api/v1/cart` — Clear Cart (→ `MessageOut`)
- `GET /api/v1/deliveries` — List Deliveries (params: status (query, optional), skip (query, optional), limit (query, optional); → `list[DeliveryOut]`)
- `GET /api/v1/deliveries/{delivery_id}` — Get Delivery (params: delivery_id (path, required); → `DeliveryOut`)
- `PATCH /api/v1/deliveries/{delivery_id}/assign` — Assign Delivery (params: delivery_id (path, required); body: `DeliveryAssign`; → `DeliveryOut`)
- `PATCH /api/v1/deliveries/{delivery_id}/status` — Update Delivery Status (params: delivery_id (path, required); body: `DeliveryStatusUpdate`; → `DeliveryOut`)
- `GET /api/v1/deliveries/{delivery_id}/tracking` — List Tracking (params: delivery_id (path, required); → `list[TrackingOut]`)
- `POST /api/v1/deliveries/{delivery_id}/tracking` — Add Tracking (params: delivery_id (path, required); body: `TrackingCreate`; → `TrackingOut`)
- `GET /api/v1/orders` — List Orders (params: status (query, optional), skip (query, optional), limit (query, optional); → `list[OrderOut]`)
- `POST /api/v1/orders` — Create Order (body: `OrderCreate`; → `OrderOut`)
- `GET /api/v1/orders/{order_id}` — Get Order (params: order_id (path, required); → `OrderOut`)
- `POST /api/v1/orders/{order_id}/pay` — Pay Order (params: order_id (path, required); body: `PayRequest`; → `PaymentOut`)
- `PATCH /api/v1/orders/{order_id}/status` — Update Order Status (params: order_id (path, required); body: `OrderStatusUpdate`; → `OrderOut`)
- `GET /api/v1/payments` — List Payments (params: skip (query, optional), limit (query, optional); → `list[PaymentOut]`)
- `GET /api/v1/payments/{payment_id}` — Get Payment (params: payment_id (path, required); → `PaymentOut`)

## b2b
- `GET /api/v1/b2b/quotations` — My Quotations (params: skip (query, optional), limit (query, optional); → `list[QuotationOut]`)
- `POST /api/v1/b2b/quotations/{quotation_id}/accept` — Accept Quotation (params: quotation_id (path, required); → `QuotationOut`)
- `POST /api/v1/b2b/quotations/{quotation_id}/reject` — Reject Quotation (params: quotation_id (path, required); → `QuotationOut`)
- `GET /api/v1/b2b/requests` — List Requests (params: status (query, optional), skip (query, optional), limit (query, optional); → `list[BulkRequestOut]`)
- `POST /api/v1/b2b/requests` — Create Request (body: `BulkRequestCreate`; → `BulkRequestOut`)
- `GET /api/v1/b2b/requests/{request_id}` — Get Request (params: request_id (path, required); → `BulkRequestOut`)
- `PATCH /api/v1/b2b/requests/{request_id}` — Update Request (params: request_id (path, required); body: `object`; → `BulkRequestOut`)
- `GET /api/v1/b2b/requests/{request_id}/quotations` — List Quotations (params: request_id (path, required); → `list[QuotationOut]`)
- `POST /api/v1/b2b/requests/{request_id}/quotations` — Submit Quotation (params: request_id (path, required); body: `QuotationCreate`; → `QuotationOut`)

## engagement
- `GET /api/v1/complaints` — List Complaints (params: status (query, optional), skip (query, optional), limit (query, optional); → `list[ComplaintOut]`)
- `POST /api/v1/complaints` — Create Complaint (body: `ComplaintCreate`; → `ComplaintOut`)
- `GET /api/v1/complaints/{complaint_id}` — Get Complaint (params: complaint_id (path, required); → `ComplaintOut`)
- `PATCH /api/v1/complaints/{complaint_id}` — Update Complaint (params: complaint_id (path, required); body: `ComplaintUpdate`; → `ComplaintOut`)
- `GET /api/v1/notifications` — List Notifications (params: unread_only (query, optional), skip (query, optional), limit (query, optional); → `list[NotificationOut]`)
- `POST /api/v1/notifications/read-all` — Mark All Read (→ `MessageOut`)
- `GET /api/v1/notifications/unread-count` — Unread Count (→ `object`)
- `POST /api/v1/notifications/{notification_id}/read` — Mark Read (params: notification_id (path, required); → `MessageOut`)
- `DELETE /api/v1/reviews/{review_id}` — Delete Review (params: review_id (path, required); → `MessageOut`)
- `GET /api/v1/subscriptions` — List Subscriptions (params: skip (query, optional), limit (query, optional); → `list[SubscriptionOut]`)
- `POST /api/v1/subscriptions` — Create Subscription (body: `SubscriptionCreate`; → `SubscriptionOut`)
- `PATCH /api/v1/subscriptions/{subscription_id}` — Update Subscription (params: subscription_id (path, required); body: `SubscriptionUpdate`; → `SubscriptionOut`)

## support
- `POST /api/v1/support/chat` — Chat (body: `ChatMessageCreate`; → `ChatReply`)
- `GET /api/v1/support/chat/history` — Chat History (params: session_id (query, optional), skip (query, optional), limit (query, optional); → `list[ChatMessageOut]`)

## admin
- `GET /api/v1/admin/action-logs` — Action Logs (params: action (query, optional), skip (query, optional), limit (query, optional); → `list[ActionLogOut]`)
- `GET /api/v1/admin/analytics/farms` — Farm Analytics (params: skip (query, optional), limit (query, optional); → `list[object]`)
- `GET /api/v1/admin/analytics/overview` — Platform Overview (→ `object`)
- `GET /api/v1/admin/chat/sessions` — Chat Sessions (→ `list[object]`)
- `GET /api/v1/admin/chat/sessions/{session_id}` — Chat Session Messages (params: session_id (path, required); → `list[object]`)
- `GET /api/v1/admin/farms/pending` — Pending Farms (params: skip (query, optional), limit (query, optional); → `list[FarmOut]`)
- `POST /api/v1/admin/farms/{farm_id}/verify` — Verify Farm (params: farm_id (path, required); body: `FarmVerifyRequest`; → `FarmOut`)
- `GET /api/v1/admin/users` — List Users (params: role (query, optional), status (query, optional), skip (query, optional), limit (query, optional); → `list[UserOut]`)
- `GET /api/v1/admin/users/{user_id}` — Get User (params: user_id (path, required); → `UserOut`)
- `PATCH /api/v1/admin/users/{user_id}/status` — Set User Status (params: user_id (path, required); body: `AdminUserUpdate`; → `UserOut`)

## analytics
- `GET /api/v1/analytics/admin/overview` — Admin Overview (→ `AdminOverviewOut`)
- `GET /api/v1/analytics/business/overview` — Business Overview (→ `BusinessOverviewOut`)
- `GET /api/v1/analytics/farmer/overview` — Farmer Overview (→ `FarmerOverviewOut`)
- `GET /api/v1/analytics/farms/{farm_id}/snapshots` — List Snapshots (params: farm_id (path, required), skip (query, optional), limit (query, optional); → `list[FarmAnalyticsOut]`)
- `POST /api/v1/analytics/farms/{farm_id}/snapshots` — Create Snapshot (params: farm_id (path, required); body: `FarmAnalyticsSnapshot`; → `FarmAnalyticsOut`)

## uploads
- `POST /api/v1/uploads` — Upload Image (→ `UploadOut`)

## health
- `GET /api/v1/health` — Health V1
- `GET /health` — Health

## iot
- `GET /api/v1/ai/status` — Ai Status (→ `object`)
- `GET /api/v1/iot/batches/{batch_id}/readings` — List Readings (params: batch_id (path, required), sensor_type (query, optional), skip (query, optional), limit (query, optional); → `list[ReadingOut]`)
- `POST /api/v1/iot/batches/{batch_id}/simulate` — Simulate Readings (params: batch_id (path, required); body: `SimulateRequest`; → `SimulateResponse`)
- `POST /api/v1/iot/readings` — Ingest Reading (body: `ReadingIngest`; → `ReadingOut`)
- `POST /api/v1/predict/adulteration` — Predict Adulteration (body: `AdulterationRequest`; → `AdulterationResponse`)
- `POST /api/v1/predict/freshness` — Predict Freshness (body: `FreshnessRequest`; → `FreshnessResponse`)

## Business rules enforced server-side
- B2B accepted quotations create orders with status `pending` so the standard pay → stock-decrement →
  delivery pipeline runs; competing bidders are auto-rejected with a notification.
- Delivery status is a forward-only state machine:
  `scheduled → assigned → picked_up → in_transit → delivered`, with `failed` allowed from
  `assigned/picked_up/in_transit` and retryable via `failed → assigned`; `delivered` is terminal.
  A failed delivery flips its order back to `confirmed` and notifies the customer.
- Dynamic pricing: AI scoring a batch `Near Expiry` auto-creates a 15% time-limited discount
  (`reason: auto: freshness …`) on that batch's products; checkout applies the best active discount.
- New batches and product price changes notify active subscribers of the farm.
- Complaint status changes are audit-logged (`admin_action_log`) and notify the complainant.
- Enum columns carry DB-level CHECK constraints (see migration `b7c3a1f0e4d2`).
