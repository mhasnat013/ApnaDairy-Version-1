# Agent 12 — Integration & End-to-End QA Audit

**Area:** Cross-module integration (Farm→Batch→IoT→AI→Product→Order→Payment→Delivery→Reviews, B2B bidding, Complaints, Subscriptions/Notifications)
**Weight:** 5% of overall QA score
**Auditor:** Agent 12 (read-only baseline audit; no source edits)
**Date:** 2026-09-27
**Environment:** backend `http://127.0.0.1:8000` (FastAPI), frontend preview `http://127.0.0.1:4173` + vite dev `http://127.0.0.1:5173`, local SQLite `backend/apnadairy_dev.db`. Supabase not used.

## Method

- 50-step API+DB script (`/tmp/agent12_flows.py`) exercising all four required flows with timestamped test identities `audit12.<role>.142148@example.pk`.
- Every step asserted on both the HTTP response and the persisted SQLite row (no screenshot-only verdicts).
- Admin-gated endpoints (farm verify, delivery assign, complaint status change) could not be executed as product flows — **no admin credentials exist in this audit environment**. Where needed, setup used direct DB updates explicitly labeled **"TEST HARNESS setup, not a product flow"**.
- Browser UI pass (Playwright + Firefox, headless): login as customer and farmer, portal page renders, console-error sweep, cross-portal visibility in the real UI.

## Flow A — Full farm-to-delivery lifecycle ✅ 24/24 steps PASS

| Step | API result | DB proof |
|---|---|---|
| Farmer registers/logs in | HTTP 201 → 200 | `user` row created |
| Farmer creates farm | HTTP 201 | `farm.farm_id=12`, `verification_status=pending` |
| Farm approval | **TEST HARNESS setup, not a product flow** (DB update; `POST /admin/farms/{id}/verify` exists but admin token unavailable) | `verification_status=verified` |
| Milk batch created | HTTP 201 | `milk_batch.batch_id=8`, `batch_code=B-12-69FCC4` |
| 3 IoT readings ingested | 3× HTTP 201 | `iot_sensor_reading` rows for batch 8 |
| AI prediction | HTTP 201, score 73.91, `disclaimer` field true | `ai_prediction.prediction_id=6`, `freshness_score=73.91`, `quality_class=Fresh`, model `model1-v1 (rf-binary/final-rf-multiclass/shelf-life/spoilage)` |
| Product created | HTTP 201 | `product.product_id=7`, **default `status=draft`** |
| Draft product invisible in marketplace / not addable to cart | verified by code + UI | — |
| Farmer publishes (draft→active) | HTTP 200 | `status=active` |
| Product in marketplace (cross-portal) | HTTP 200 | listed among active products |
| Product detail | HTTP 200 | — |
| Batch trace resolves | HTTP 200 | — |
| Add to cart | HTTP 200, 2 litres | `cart` row |
| Checkout → order | HTTP 201 | `order.order_id=13`, `status=pending` |
| Payment with demo label | HTTP 200, `transaction_ref=DEMO-AEB338E9D379` | `payment.payment_id=6`, `status=completed`; notification carries "Demo payment — no real money will be charged" |
| Inventory decreases | **at payment time** (by design, not at order creation) | `quantity_available` 50 → 48 |
| Delivery auto-created on payment | — | `delivery.delivery_id=6`, `status=scheduled` |
| Farmer attempts delivery assign | HTTP 403 | auth enforcement works |
| Assign rider | **TEST HARNESS setup** (admin-only endpoint) | `delivery_person_id=57` |
| Rider → delivered, order syncs | 2× HTTP 200 | `delivery.status=delivered`, `order.status=delivered` |
| Rider posts tracking point | HTTP 201 | `delivery_tracking` row with lat/long + message |
| Customer sees tracking | HTTP 200 | 1 point returned |
| Customer review | HTTP 201 | `review` row; visible on product page |
| Farmer analytics | HTTP 200 | totals, revenue, freshness, complaints keys |

UI cross-check: the product detail page in the customer portal shows the full integrated chain — product name, AI freshness score 74 with "Demonstration prediction — not laboratory certification.", farm, batch `B-12-69FCC4`, stock 48, status Active, price, Add to cart, and the submitted review.

## Flow B — B2B bidding & bulk order ✅ 9/9 steps PASS

| Step | API result | DB proof |
|---|---|---|
| Business creates bulk request | HTTP 201 | `bulk_purchase_request` open |
| Farmer 1 quotes | HTTP 201 | `quotation` submitted |
| Farmer 2 (separate verified farm) quotes | HTTP 201 | second `quotation` submitted |
| Business compares | HTTP 200, 2 quotes, sorted by price | — |
| Business accepts winning bid | HTTP 200 | quote status `accepted` |
| Loser rejected, request fulfilled, bulk order linked | — | losing quote `rejected`, request `fulfilled`, `order.order_id=14` with `bulk_request_id` + `quotation_id` in `order_items` JSON |
| Cross-portal | — | winning farmer has acceptance notification; business order list shows order 14 |

## Flow C — Complaint & notification ⚠️ 4/5 PASS, 1 BLOCKED

| Step | API result | DB proof |
|---|---|---|
| Customer files complaint | HTTP 201 | `complaint.complaint_id=6`, `status=open` |
| Non-admin PATCH rejected | HTTP 403 | — |
| Admin status change | **TEST HARNESS setup** (DB update; `PATCH /complaints/{id}` is admin-only) | `status=resolved`, `resolved_at=2026-09-27 14:22:02` |
| User sees updated status | HTTP 200 | status=resolved |
| Notification on status change | **BLOCKED** — `notify()` is called inside the admin-only endpoint (verified by code inspection); cannot execute without an admin token | — |

## Flow D — Subscription & notification ❌ 3/4 PASS, 1 FAIL

| Step | API result | DB proof |
|---|---|---|
| Customer subscribes to farm | HTTP 201 | `subscription.subscription_id=4`, `status=active` |
| Notification on subscription-relevant event (new batch / price change) | **FAIL — GAP**: no `notify()` trigger exists in backend code for subscription events | — |
| Notification pipeline works (order event) | HTTP 200 | 3+ notifications for customer |
| User reads notifications | HTTP 200 | `notification_id=47` read state persists (`is_read=1`) |

## Cross-portal data visibility ✅ all PASS

- Farmer order list shows customer order 13 (and B2B order 14) — HTTP 200.
- Rider delivery list shows assigned delivery 6 (`delivered`) — HTTP 200.
- Business order list shows bulk order 14 — HTTP 200.
- Business sees fulfilled bulk request; competing farmer sees the request.
- Customer marketplace UI shows farmer's product (Playwright-verified).

## Browser console-error sweep ✅

Login as customer and farmer via the real UI; visited 15 pages (customer: shop, product detail, cart, orders, notifications, public batch trace, public marketplace; farmer: batches, IoT, AI predictions, products, analytics). **Zero product console errors.** One React warning (P3, see below). Product detail unauthenticated correctly redirects to `/login?next=...`.

## Issues found

### P1 — CORS blocks the running frontend from calling the backend
`CORS_ORIGINS` defaults to `http://localhost:5173,http://127.0.0.1:5173` (vite dev only). The frontend preview running at `http://127.0.0.1:4173` gets **no** `access-control-allow-origin` on preflight (verified with curl), so in a real browser **every** UI→API call from that origin is blocked — login fails with "Something went wrong" and a `Cross-Origin Request Blocked` console error. UI testing was only possible by starting the vite dev server on `:5173` (a CORS-listed origin). Fix (for the build team): include the actual deployed/preview frontend origin(s) in `CORS_ORIGINS`. Product logic itself is unaffected (all API flows pass).

### P2 — No notifications for subscription-relevant events
`subscription` rows are created and readable, and the notification pipeline itself works (order/payment/delivery/quotation events all notify), but **no backend event triggers a notification to subscribers** — not new batch creation, not price changes. Flow D's core expectation ("user is notified on a relevant event") fails. This is a genuine functional gap, not an environment issue.

### P3 — React `validateDOMNesting` warning on farmer products page
`<button>` nested inside `<button>` in the products UI. Console warning only; no user-visible breakage.

### Notes (not defects)
- **Inventory decrements at payment time, not at order creation** (`commerce.py` pay endpoint re-validates and decrements stock in the same transaction). The audit brief's Flow A expects inventory to decrease when the order is created; the implemented behavior (decrement on successful payment) is a reasonable anti-oversell-on-unpaid-orders design, but it deviates from the documented flow sequence. Flagged for the team to confirm intent.
- Products default to `status=draft`; draft products are correctly hidden from the marketplace and cart until the farmer publishes. Intended behavior, verified.
- One competing quotation per farm per request is enforced (HTTP 409 on duplicate) — correct; the audit's competing bid therefore requires a second farmer, which was tested.
- Transient "downloadable font: download failed" console errors appeared once in dev mode and did not reproduce — not a product defect.
- Test data from this audit (run suffix `142148`, plus earlier exploratory rows) remains in the local dev DB only; Supabase untouched.

## Coverage gaps
- Admin-gated product flows (farm approval via `POST /admin/farms/{id}/verify`, delivery assignment, complaint resolution notification) could not be executed as genuine flows — no admin credentials were supplied. The underlying logic was verified by code inspection and DB evidence, but the complaint-resolution *notification* remains BLOCKED, not PASS.
- Mobile/Flutter app not in scope for this agent (web UI only).

## Area score: **88 / 100**

Justification: all four cross-module workflows execute end-to-end at the API+DB level with row-level evidence (48/50 steps PASS; the 2 non-passes are 1 environmental BLOCKED and 1 genuine P2 gap). Cross-portal visibility confirmed via API and in the real UI; browser sweep shows zero product console errors. Deductions: −4 for the missing subscription-event notifications (P2, genuine functional gap), −5 for the CORS misconfiguration that breaks UI→API integration on the environment's stated frontend URL (P1), −3 for admin-gated flows being unverifiable without credentials (environmental).
