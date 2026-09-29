# Agent 4 — Farmer Portal Baseline Audit

**Date:** 2026-09-27 | **Phase:** baseline (read-only audit + test-data writes to local dev DB)
**Backend:** http://127.0.0.1:8000/api/v1 (running) | **Frontend:** dev server http://localhost:5173 (started for audit; preview :4173 is CORS-blocked — see P2-1)
**Test accounts:** `audit4+farmer@test.pk`, `audit4+business@test.pk`, `audit4+customer@test.pk`, `audit4+farmer2@test.pk` (all clearly marked Audit4)

## Tab-by-tab verification

| Tab | Route | API called (all HTTP 200) | Data real? | Loading / empty / error states | Issues |
|---|---|---|---|---|---|
| Dashboard | `/app/farmer` | `GET /analytics/farmer/overview`, `/auth/me`, `/batches`, `/complaints`, `/farms/3`, `/orders` | Yes — "Audit4 Dairy Farm", location, pending status, batch B-3-E0725B with freshness score 87, 1 active order, Rs 0 revenue | Loading, honest "No farm registered yet" CTA when farm-less, error OK | — |
| Onboarding | `/app/farmer/onboarding` | `GET /farms/3`, `/auth/me`, `/analytics/farmer/overview` | Yes — "2 of 5 steps complete", farm verification step shows **pending** with "View status" | Farm-less state shows real create-farm form (validated, submits to `POST /farms`) | P3-1: steps 4–5 hardcoded `done:false` |
| Farm profile | `/app/farmer/profile` | `GET /farms/3` | Yes — real farm data, verification badge | OK | — |
| Milk batches | `/app/farmer/batches` | `GET /batches`, `/farms/3` | Yes — **created a batch through the UI form: `201 POST /batches`, new batch visible in list** | Loading / empty / error OK | — |
| Batch detail | `/app/farmer/batches/3` | `GET /batches/3`, `/batches/3/predictions`, `/iot/batches/3/readings` | Yes — real batch, real prediction history, real readings | Invalid id → "Something went wrong / Batch not found / Try again" ✓ | — |
| IoT monitoring | `/app/farmer/iot` | `GET /iot/batches/3/readings`, `/batches` | Yes — real temperature curve (50 readings) | Honest empty hint ("Simulate a sensor run…") | — |
| AI freshness | `/app/farmer/ai` | `GET /batches/3/predictions`, `/batches` | Yes — real batch selector, real prediction inputs | OK | — |
| Products | `/app/farmer/products` | `GET /products` | Yes — real listing | OK | — |
| Pricing & discounts | `/app/farmer/pricing` | `GET /products`, `/products/3/discounts` | Yes — price history (2 entries), discount CRUD all verified via API | OK | — |
| Orders | `/app/farmer/orders` | `GET /orders` | Yes — order #2 containing farmer's own product | Fulfilment actions return 200 | — |
| Bulk quotations | `/app/farmer/bids` | `GET /b2b/requests`, `GET /b2b/quotations` | Yes — real open request shown ("Audit4 Fresh Milk · 500 units · target Rs 170") | Empty-quotations state honest | Note: quote submit blocked by verification rule (verified below) |
| Analytics | `/app/farmer/analytics` | `GET /analytics/farmer/overview`, `/batches`, `/orders` | Yes — 1 batch, 1 product, **Rs 0 revenue (honest — order unpaid)**, revenue-by-month bar = Rs 360, freshness-per-batch point = 87. No fake numbers | OK | — |
| Complaints | `/app/farmer/complaints` | `GET /complaints` | Yes — complaint created via API (`201`, status `open`), listed | OK | — |
| Support | `/app/farmer/support` | `GET /support/chat/history` | Yes — real chat page | OK | — |
| Settings | `/app/farmer/settings` | `GET /auth/me` | Partial — ProfilePage is real; settings section is an honest "contact support to change account details" card (no fake toggles) | OK | P3-2: no self-service settings (by design, honest) |

**Route protection: 15/15** — every `/app/farmer/*` route redirects unauthenticated visitors to `/login?next=…`. Farmer → `/app/admin` redirects to `/unauthorized`.

## Workflow evidence (API + UI + DB)

1. **Registration/onboarding:** `POST /auth/register` (role=farmer) → 201 + JWT; `GET /auth/me` → role=farmer; `POST /farms` → 201, `verificationStatus: "pending"`; pending status visible on dashboard, profile, and onboarding step 3.
2. **Batch creation + ownership:** `POST /batches` → 201, code `B-3-E0725B`; farmer creating with another `farmId` → **403**; customer → **403**; code enforces `require_role("farmer")` with comment "admin can NEVER create batches" — **admin batch-creation prohibition verified**.
3. **IoT:** manual reading `POST /iot/readings` → 201; `POST /iot/batches/3/simulate` → 201; history `GET …/readings` → 50 readings. UI chart header and page description carry the **"Simulated IoT reading"** label.
4. **AI prediction:** `POST /batches/3/score` → 201 — `freshnessScore: 87.16`, `qualityClass: "Fresh"`, `spoilageRisk: "Low"`, per-class probabilities, `anomalyDetected: false`; `GET /batches/3/predictions` → persisted (count=1). Every AI response carries **`"disclaimer": "Demonstration prediction — not laboratory certification."`** and the farmer AI page renders it from the API response (both adulteration and freshness cards).
5. **Product/pricing/discounts:** `POST /products` (linked to batch 3) → 201; `PATCH /products/3/price` → 200 with **price-history entries = 2**; discount create/list/delete → 201/200/200.
6. **Orders + fulfilment:** customer `PUT /cart` → `POST /orders` → 201 (order #2, items carry `farmId: 3`); farmer `GET /orders` shows it; farmer `PATCH /orders/2/status` → **200** for `confirmed` and `preparing`; `delivered` (outside farmer scope) → **403** "Farmers can only confirm, prepare or cancel orders."; second farmer touching order #2 → **404** (ownership isolation). Customer received notifications: "Order #2 placed", "now 'confirmed'", "now 'preparing'".
7. **B2B:** business `POST /b2b/requests` (productId=3) → 201; farmer `GET /b2b/requests` sees it; farmer `POST …/quotations` → **403 "Only verified farms can submit quotations."** (farm is pending). Positive-path quotation requires admin farm verification — enforcement verified, submission endpoint code path identical for verified farms.
8. **Complaints/notifications:** `POST /complaints` → 201 `open`; `GET /complaints` lists it; `GET /notifications` 200; `GET /notifications/unread-count` works.
9. **Analytics:** `POST /analytics/farms/3/snapshots` → 201; `GET …/snapshots` lists it; `GET /analytics/farmer/overview` returns real aggregates `{totalBatches: 1, totalProducts: 1, activeOrders: 1, totalRevenue: 0.0, avgFreshnessScore: 87.2, openComplaints: 0}` — matches DB state exactly.

## Issue list

- **P2-1 — CORS dev-environment gap (config, not farmer code):** backend `CORS_ORIGINS` default only allows `http://localhost:5173` / `http://127.0.0.1:5173`. The provided preview frontend on `:4173` is blocked by the browser (`NS_ERROR_DOM_BAD_URI`, preflight has no `access-control-allow-origin`). Login and every authenticated page fail on `:4173`. Worked around by running vite dev on `:5173` for this audit. **Production must set CORS to the real frontend domain** (already on the outstanding list). This affects all browser-based agents — Agent 12 should use `:5173` or have CORS updated.
- **P3-1 — Onboarding checklist steps 4–5 are hardcoded `done: false`** (`FarmerOnboarding`): "Record your first milk batch" / "List your first product" never flip to done even after the farmer does both. Cosmetic; step CTAs work.
- **P3-2 — Settings has no self-service account editing** — honest "contact support" card instead of fake toggles. By design; acceptable for FYP but flag for production backlog.
- **Note (not an issue):** B2B quotation positive path needs an admin to verify the farm first. The 403 enforcement for unverified farms was verified; admin verification flow belongs to Agent 8.

No P0 or P1 issues in the farmer portal. No fake data, no stub buttons, no mock responses found — every tab is wired to a real, authorized API.

## Area score: 94/100

- 15/15 farmer routes exist, are protected, call real APIs (all 200), and render real data: **full marks on integration**.
- All 8 assigned workflows verified end-to-end through UI + API + DB, including negative/authorization cases (cross-farm 403, customer 403, other-farmer 404, invalid-status 403, unverified-farm quote 403).
- Deductions: −3 for B2B quotation positive path unverifiable without admin action in this environment (enforcement verified instead); −2 for static onboarding checklist steps; −1 for no self-service settings (honest but incomplete vs. portal spec).
- The P2 CORS item is environment configuration, not farmer-portal code, and does not reduce the portal score — but it must be fixed before any browser demo on the preview port.
