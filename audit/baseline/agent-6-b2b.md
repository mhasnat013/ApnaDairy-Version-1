# Agent 6 — Business/B2B Portal: Baseline Audit Report

**Date:** 2026-09-27 · **Phase:** baseline (read-only except test-data writes to local dev DB)
**Backend:** http://127.0.0.1:8000/api/v1 (uvicorn, fresh code) · **Frontend:** http://127.0.0.1:4173
**Test accounts:** `audit6+biz@test.pk`, `audit6+biz2@test.pk` (businesses) · `audit6+farmer1@test.pk`, `audit6+farmer2@test.pk` (farmers, farms 6/7 "Audit6 Farm One/Two") · `audit6+cust@test.pk` (customer, negative tests)
Tokens redacted everywhere. No source edits, no Supabase.

## 1. Workflow evidence table (live API, dev DB)

| # | Step | Evidence | Result |
|---|---|---|---|
| 1 | Business registration | `POST /auth/register` role=business → 201; `role=admin` → 403 (no public admin registration) | ✅ Pass |
| 2 | Farmer onboarding + approval visibility | `POST /farms` → 201, `verificationStatus: pending`; farmer `GET /farms/6` sees pending; after approval → verified | ✅ Pass |
| 3 | Bulk request creation | `POST /b2b/requests` product_id=1 qty=500 target=170 → 201, id=3, status=open | ✅ Pass |
| 4 | Farmers discover request | `GET /b2b/requests` as farmer1/farmer2 → 200, includes request 3 | ✅ Pass |
| 5 | Two quotations submitted | `POST /b2b/requests/3/quotations` → 201 (168×500 farm6; 165×480 farm7) | ✅ Pass |
| 6 | Duplicate quotation blocked | second quote same farm → **409** "already quoted" | ✅ Pass |
| 7 | Quote on fulfilled request blocked | → **400** "no longer open" | ✅ Pass |
| 8 | Business compares quotations | `GET /b2b/requests/3/quotations` → 200, price-sorted, both bids visible | ✅ Pass |
| 9 | Accept winning bid | `POST /b2b/quotations/3/accept` → 200 accepted; loser → rejected; request → **fulfilled**; Order #3 created (confirmed, 79,200 = 480×165; `order_items` JSON carries `bulk_request_id:3, quotation_id:3`) | ✅ Pass |
| 10 | Manual reject path | new request 4 → quote → `POST …/reject` → 200 rejected; request stays **open**; farmer notified | ✅ Pass |
| 11 | Cancel request | `PATCH /b2b/requests/4` {cancelled} → 200 | ✅ Pass |
| 12 | Notifications | business: 2× "New quotation…"; winner: "ACCEPTED." → 200 | ✅ Pass (see P2-1) |
| 13 | Cross-business isolation | biz2 `GET /b2b/requests/3` → **404**; quotations → **404**; accept → **404**; list excludes req 3 | ✅ Pass |
| 14 | Cross-role enforcement | customer `POST /b2b/requests` → **403**; customer quote → **403** | ✅ Pass |
| 15 | **Pay for accepted bulk order** | `POST /orders/3/pay` → **400** "Order cannot be paid in status 'confirmed'." | ❌ **Fail — P1-1** |
| 16 | Inventory adjustment | product 1 `quantity_available` stayed **100** after 480-unit acceptance | ❌ **Fail — P1-1** |
| 17 | Delivery for bulk order | `GET /deliveries` → 200 [] (no delivery ever created) | ❌ **Fail — P1-1** |
| 18 | Procurement spend | `GET /analytics/business/overview` → 200 but `totalSpent: 0.0` despite confirmed 79,200 order | ⚠️ Partial — P3-2 |

**Root cause of P1-1:** `b2b.py::_accept_or_reject` creates the Order with `status="confirmed"`, but `commerce.py::pay_order` only pays orders in `status == "pending"` (stock decrement also lives in `pay_order`). So every B2B order is permanently unpayable → no payment record, no delivery, no inventory movement, spend analytics stuck at 0. (Suggested fix for remediation: create the B2B order as `"pending"` so the standard pay flow works; do NOT widen `pay_order` without review.)

## 2. Business tab audit (routes under `/app/business`, all guarded by `portal()` → RequireAuth + RequireRole(['business']))

| Tab | Route | Protected | Real API | Empty state | Notes |
|---|---|---|---|---|---|
| Dashboard | `` | ✅ | ✅ `GET /analytics/business/overview`, requests, orders, payments | ✅ honest | P3-1: "Orders" stat shows `totalQuotations` (copy-paste) |
| Buyer onboarding | `/onboarding` | ✅ | ✅ shared OnboardingPage | ✅ stepper | — |
| Bulk requests | `/requests` | ✅ | ✅ list/create/cancel via `apiCommerce` hooks | ✅ "No requests" + CTA | create modal: product/qty/target/deadline |
| Request detail / compare bids | `/requests/:id` | ✅ | ✅ request + quotations, accept/reject | ✅ "No quotations yet" | price/date sort, lowest-bid highlight; P3-3 |
| Suppliers | `/suppliers` | ✅ | ✅ `GET /farms` paginated | ✅ "No suppliers" | verified badges, ratings |
| Orders | `/orders` | ✅ | ✅ `GET /orders` + status filter | ✅ honest | **no Pay button anywhere in business portal** (hook exists, customer-only) |
| Payments | `/payments` | ✅ | ✅ `GET /payments`, demo label shown | ✅ honest | permanently empty while P1-1 open |
| Delivery tracking | `/tracking`, `/tracking/:deliveryId` | ✅ | ✅ `GET /deliveries` | ✅ honest | permanently empty while P1-1 open |
| Analytics | `/analytics` | ✅ | ✅ computed from orders | ✅ "No orders yet" | P3-2: spend math differs from backend overview |
| Support | `/support` | ✅ | ✅ shared ChatPage | ✅ | — |
| Profile | `/profile` | ✅ | ✅ shared ProfilePage | ✅ | — |

All 11 routes return HTTP 200 (SPA shell); unauthenticated `/app/*` redirects to `/login?next=…` (verified live). No notifications/complaints tabs exist in business nav by design (support chat covers it) — not a gap.

## 3. Issue list

**P1-1 — High · B2B orders unpayable: post-acceptance chain dead.**
Repro: accept any quotation → `POST /orders/{id}/pay` → 400. Cause: order created `confirmed`; pay requires `pending`. Impact: no payments, no deliveries, no inventory decrement, `totalSpent=0`. Status: open, needs remediation.

**P2-1 — Medium · Losing bidders not notified on accept.**
Repro: accept bid → loser status=rejected but no notification row (farmer1 got none; manual reject *does* notify). Cause: `_accept_or_reject` accept-branch skips `notify()` for losers. Status: open.

**P2-2 — Medium (environment, source already fixed) · Stale backend process served pre-fix notifications code.**
Observed `GET /notifications` → 500 (`Notification has no attribute 'created_at'`) because the running uvicorn (started 13:40 UTC) predated the 14:03 `sent_at` fix. A sibling agent restarted the backend with current code; endpoint now 200 with real rows. Lesson: restart dev server after backend edits. Status: resolved (no code change needed).

**P3-1 — Low · Dashboard "Orders" stat card shows `totalQuotations` instead of order count** (`Dashboard.tsx`).
**P3-2 — Low · Inconsistent "spend" definitions:** backend overview counts only paid/in_transit/delivered (0.0), frontend Analytics sums all non-cancelled orders (would show 79,200 unpaid) — same label, different numbers.
**P3-3 — Low · RequestDetail shows Accept/Reject on already-decided quotations** (backend correctly 400s; buttons should hide/disable).
**P3-4 — Low · B2B order `delivery_address` is null** (business `address_line` not required at signup) — future deliveries would carry a null address.

No P0 issues. No fake data, no stubbed endpoints, no hardcoded responses in the B2B path. Honest labels present (demo payment disclaimer on Payments tab).

## 4. Area score: **78/100**

- Registration / onboarding / approval visibility: 100
- Bulk request CRUD: 100
- Quotation flow incl. validation (409/400/403/404): 100
- Compare / accept / reject / cancel: 100
- Cross-business & cross-role isolation: 100
- Order creation from accepted bid: 100
- Notifications: 85 (loser-notification gap)
- Business tabs (11/11 real, guarded, honest empty states): 95
- Payment of B2B orders: **0** (P1-1)
- Delivery tracking for B2B: **0** (P1-1)
- Inventory adjustment on B2B: **0** (P1-1)
- Procurement analytics: 60 (works, but spend stuck at 0 while P1-1 open + P3-2)

The core procurement loop (request → bids → accept → order) is fully real and verified end-to-end; the fulfillment tail (pay → deliver → track → spend → stock) is broken by the single `confirmed`-vs-`pending` status mismatch. Fixing P1-1 unlocks ~15 of the missing points; P2-1 and the P3 nits cover the rest.
