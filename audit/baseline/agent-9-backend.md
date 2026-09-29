# Agent 9 — Backend & API Baseline Audit (read-only)

**Auditor role:** Backend & API auditor · **Phase:** read-only baseline (no source edits, no test-data writes)
**Date:** 2026-09-27 · **Backend:** FastAPI 1.0.0, live at `http://127.0.0.1:8000`
**Code:** `~/workspace/apnadairy/backend/app` · **Routers:** admin, analytics, auth, b2b, batches, catalog, commerce, engagement, iot_ai, support, uploads (+ `_helpers`)
**OpenAPI:** 71 paths, **92 operations** · `/docs` reachable (200) · `/openapi.json` valid

---

## 1. Endpoint inventory

Role key: `PUB` = public, `A` = any authenticated user, roles as named. Ownership = owner-or-admin scoping verified in code.

| # | Method | Path | Role | Status codes (observed/coded) | Stub? | Issues |
|---|--------|------|------|-------------------------------|-------|--------|
| 1 | POST | /api/v1/auth/register | PUB | 201/400/403/409/422 | No | admin role → 403 verified live |
| 2 | POST | /api/v1/auth/login | PUB | 200/401/403 | No | No rate limiting (P2-1) |
| 3 | POST | /api/v1/auth/refresh | PUB | 200/401 | No | Rotates pair; type-checked |
| 4 | POST | /api/v1/auth/forgot-password | PUB | 200 always | No | reset_token returned only in DEMO_MODE, labeled |
| 5 | POST | /api/v1/auth/reset-password | PUB | 200/400 | No | Token type + expiry enforced |
| 6 | GET | /api/v1/auth/me | A | 200/401 | No | — |
| 7 | GET | /api/v1/farms | PUB | 200 | No | Owner PII not exposed |
| 8 | GET | /api/v1/farms/{farm_id} | PUB | 200/404 | No | Exposes internal owner `userId` (P3-6) |
| 9 | POST | /api/v1/farms | farmer | 201/403/409 | No | One farm per user enforced |
| 10 | PATCH | /api/v1/farms/{farm_id} | owner/admin | 200/403/404 | No | — |
| 11 | GET | /api/v1/products | PUB | 200 | No | Defaults to active only |
| 12 | GET | /api/v1/products/{product_id} | PUB | 200/404 | No | — |
| 13 | POST | /api/v1/products | farmer,admin | 201/400/403 | No | Batch must belong to farm; writes PriceHistory |
| 14 | PATCH | /api/v1/products/{product_id} | owner/admin | 200/400/403/404 | No | Price change logged |
| 15 | PATCH | /api/v1/products/{product_id}/price | owner/admin | 200/403/404 | No | — |
| 16 | DELETE | /api/v1/products/{product_id} | owner/admin | 200/403/404 | No | Soft archive, not hard delete |
| 17 | GET | /api/v1/products/{product_id}/price-history | PUB | 200/404 | No | — |
| 18 | POST | /api/v1/products/{product_id}/discounts | owner/admin | 201/400/403 | No | Date-range validated |
| 19 | GET | /api/v1/products/{product_id}/discounts | PUB | 200/404 | No | — |
| 20 | DELETE | /api/v1/discounts/{discount_id} | owner/admin | 200/403/404 | No | — |
| 21 | GET | /api/v1/pricing/rules | PUB | 200 | No | Live active discounts |
| 22 | GET | /api/v1/batches | farmer,admin | 200/403 | No | Farmer scoped to own farm |
| 23 | POST | /api/v1/batches | farmer only | 201/403/404/409 | No | **Admin can never create batches** — 403 verified in code |
| 24 | GET | /api/v1/batches/{batch_id} | owner/admin | 200/403/404 | No | Non-owner gets 404 (no IDOR leak) |
| 25 | PATCH | /api/v1/batches/{batch_id} | farmer,admin | 200/400/403/404 | No | Admin = status-only moderation |
| 26 | DELETE | /api/v1/batches/{batch_id} | owner farmer | 200/400/403/404 | No | Only `recorded` status deletable |
| 27 | GET | /api/v1/batches/trace/{batch_code} | PUB | 200/404 | No | Verified live; freshness included |
| 28 | GET | /api/v1/batches/{batch_id}/predictions | owner/admin | 200/403/404 | No | — |
| 29 | POST | /api/v1/batches/{batch_id}/score | farmer,admin | 201/400/404/503 | No | Needs ≥2 readings; 503 if models missing; persists AIPrediction |
| 30 | POST | /api/v1/iot/readings | farmer,admin | 201/403/404 | No | Ownership-checked |
| 31 | POST | /api/v1/iot/batches/{batch_id}/simulate | farmer,admin | 201/403/404 | No | Labeled "Simulated IoT reading" |
| 32 | GET | /api/v1/iot/batches/{batch_id}/readings | owner/admin | 200/403/404 | No | — |
| 33 | POST | /api/v1/predict/adulteration | A | 200/503 | No | Real sklearn model (verified load) |
| 34 | POST | /api/v1/predict/freshness | A | 200/503 | No | Real sklearn models; disclaimer in schema |
| 35 | GET | /api/v1/ai/status | A | 200 | No | Reports models_loaded + disclaimer |
| 36 | GET | /api/v1/cart | customer | 200/401/403 | No | 401 without token verified live |
| 37 | PUT | /api/v1/cart | customer | 200/400/403 | No | Stock-validated; invalid product → 400 |
| 38 | DELETE | /api/v1/cart | customer | 200/403 | No | — |
| 39 | POST | /api/v1/orders | customer,business | 201/400/403 | No | Stock re-validated; cart cleared |
| 40 | GET | /api/v1/orders | A (scoped) | 200 | No | Farmer filtered by farm involvement |
| 41 | GET | /api/v1/orders/{order_id} | owner/farmer/rider/admin | 200/403/404 | No | Cross-role returns 404 |
| 42 | PATCH | /api/v1/orders/{order_id}/status | farmer,admin | 200/400/403/404 | No | Farmer limited to confirm/prepare/cancel |
| 43 | POST | /api/v1/orders/{order_id}/pay | owner customer,business | 200/400/403/404/409 | No | **Simulated**: decrements stock, creates delivery, disclaimer in schema + notification |
| 44 | GET | /api/v1/payments | own/admin | 200 | No | — |
| 45 | GET | /api/v1/payments/{payment_id} | own/admin | 200/403/404 | No | — |
| 46 | GET | /api/v1/deliveries | A (scoped) | 200 | No | — |
| 47 | GET | /api/v1/deliveries/{delivery_id} | scoped | 200/403/404 | No | — |
| 48 | PATCH | /api/v1/deliveries/{delivery_id}/assign | admin | 200/400/403/404 | No | Rider must be active rider role |
| 49 | PATCH | /api/v1/deliveries/{delivery_id}/status | rider,admin | 200/400/403/404 | No | Rider bound to own delivery; no transition validation (P3-5) |
| 50 | POST | /api/v1/deliveries/{delivery_id}/tracking | rider,admin | 201/403/404 | No | — |
| 51 | GET | /api/v1/deliveries/{delivery_id}/tracking | scoped | 200/403/404 | No | — |
| 52 | POST | /api/v1/b2b/requests | business | 201/400/403/404 | No | Product must be active |
| 53 | GET | /api/v1/b2b/requests | business/farmer/admin | 200/403 | No | Farmers see open only |
| 54 | GET | /api/v1/b2b/requests/{request_id} | visible | 200/403/404 | No | Quoting farmer retains visibility |
| 55 | PATCH | /api/v1/b2b/requests/{request_id} | owner business | 200/400/403/404 | No | Cancel/expire only; untyped `dict` body (P3-7) |
| 56 | POST | /api/v1/b2b/requests/{request_id}/quotations | farmer (verified) | 201/400/403/404/409 | No | One quote per farm; unverified → 403 |
| 57 | GET | /api/v1/b2b/requests/{request_id}/quotations | visible | 200/403/404 | No | Farmers see only own quote |
| 58 | GET | /api/v1/b2b/quotations | farmer/business/admin | 200/403 | No | — |
| 59 | POST | /api/v1/b2b/quotations/{quotation_id}/accept | buyer business | 200/400/403/404 | No | Creates bulk Order; rejects other bids |
| 60 | POST | /api/v1/b2b/quotations/{quotation_id}/reject | buyer business | 200/400/403/404 | No | — |
| 61 | POST | /api/v1/subscriptions | customer | 201/400/403/404/409 | No | Farm must be verified; dedupe 409 |
| 62 | GET | /api/v1/subscriptions | customer,admin | 200/403 | No | 500 fixed earlier (sent_at/created_at) |
| 63 | PATCH | /api/v1/subscriptions/{subscription_id} | owner customer | 200/400/403/404 | No | — |
| 64 | POST | /api/v1/reviews | A | 201/400 | No | Must target farm and/or product |
| 65 | GET | /api/v1/reviews | PUB | 200 | No | — |
| 66 | DELETE | /api/v1/reviews/{review_id} | owner/admin | 200/403/404 | No | — |
| 67 | POST | /api/v1/complaints | A | 201/400 | No | Order ref validated against owner |
| 68 | GET | /api/v1/complaints | own/admin | 200 | No | — |
| 69 | GET | /api/v1/complaints/{complaint_id} | own/admin | 200/403/404 | No | — |
| 70 | PATCH | /api/v1/complaints/{complaint_id} | admin | 200/400/403/404 | No | Sets resolved_at; notifies user |
| 71 | GET | /api/v1/notifications | A (own) | 200 | No | 500 fixed earlier (sent_at ordering) |
| 72 | GET | /api/v1/notifications/unread-count | A | 200 | No | — |
| 73 | POST | /api/v1/notifications/{notification_id}/read | owner | 200/403/404 | No | — |
| 74 | POST | /api/v1/notifications/read-all | A | 200 | No | — |
| 75 | POST | /api/v1/support/chat | A | 200/401 | No | 401 enforced despite `User|None` annotation (P3-4) |
| 76 | GET | /api/v1/support/chat/history | A (own) | 200 | No | — |
| 77 | GET | /api/v1/admin/users | admin | 200/403 | No | 401 without token verified live |
| 78 | GET | /api/v1/admin/users/{user_id} | admin | 200/403/404 | No | — |
| 79 | PATCH | /api/v1/admin/users/{user_id}/status | admin | 200/400/403/404 | No | Can't suspend self/other admins; audit-logged |
| 80 | GET | /api/v1/admin/farms/pending | admin | 200/403 | No | — |
| 81 | POST | /api/v1/admin/farms/{farm_id}/verify | admin | 200/400/403/404 | No | Sets owner is_verified; audit-logged + notified |
| 82 | GET | /api/v1/admin/action-logs | admin | 200/403 | No | — |
| 83 | GET | /api/v1/admin/analytics/overview | admin | 200/403 | No | **Duplicates #86** (P3-3) |
| 84 | GET | /api/v1/admin/analytics/farms | admin | 200/403 | No | Live per-farm aggregates |
| 85 | GET | /api/v1/analytics/farmer/overview | farmer | 200/403 | No | Live aggregates incl. avg freshness |
| 86 | GET | /api/v1/analytics/admin/overview | admin | 200/403 | No | Typed AdminOverviewOut |
| 87 | GET | /api/v1/analytics/business/overview | business | 200/403 | No | — |
| 88 | POST | /api/v1/analytics/farms/{farm_id}/snapshots | farmer,admin | 201/400/403/404 | No | Farmer scoped to own farm |
| 89 | GET | /api/v1/analytics/farms/{farm_id}/snapshots | owner/admin | 200/403/404 | No | — |
| 90 | POST | /api/v1/uploads | A | 201/400/413 | No | 5MB cap + magic-number sniffing + uuid names + path-traversal guard (code-verified) |
| 91 | GET | /health | PUB | 200 | No | — |
| 92 | GET | /api/v1/health | PUB | 200 | No | — |

**Stub/hardcoded scan:** zero `pass`/`TODO`/`FIXME`/`NotImplementedError` in routers; zero bare `except:`; zero hardcoded response payloads or placeholder arrays. All write paths execute real DB transactions. Demo aspects (payment, IoT, reset-token) are explicitly labeled, never presented as live.

---

## 2. Live verification results (read-only + negative tests, no writes)

| Test | Result |
|------|--------|
| `GET /health`, `GET /api/v1/health` | 200 `{"status":"ok","service":"apnadairy-api"}` |
| `GET /docs`, `/openapi.json` | 200, valid (71 paths / 92 ops) |
| `GET /api/v1/products?limit=2` (public) | 200, real DB rows (QA/Demo seed data) |
| `GET /api/v1/farms?limit=2` (public) | 200; owner PII withheld |
| `GET /api/v1/batches/trace/B-1-F171CF` (public) | 200 with farm/milking/reading_count |
| `GET /api/v1/batches/trace/NOPE-123` | 404 `{"detail":"No batch found for this code."}` |
| `POST /auth/register` malformed body | **422** with field-level Pydantic v2 errors |
| `POST /auth/register` role=admin (valid shape) | **403** "Admin accounts cannot be created via public registration." |
| `PUT /api/v1/cart` no token | **401** "Not authenticated" |
| `GET /api/v1/admin/users` no token | **401** |
| `GET /api/v1/auth/me` malformed token | **401** "Invalid or expired token" |
| `POST /api/v1/support/chat` no token | **401** (auth required despite `User\|None` annotation) |
| CORS preflight from `http://localhost:5173` | 200 |
| AI models load (`ai_service.load_models()`) | **OK** — all 4 artifacts present and loadable |
| Backend pytest suite | **15/15 passed** (run separately this session) |

Auth surface audit (from openapi.json security): the **only** unauthenticated operations are auth endpoints, `/health`, and the intended public reads (farms, products, discounts, price-history, pricing rules, reviews, batch trace). No private dashboard data is publicly reachable.

---

## 3. Contract drift — `~/workspace/apnadairy/API_CONTRACT.md` is stale/superseded

The contract describes an **earlier design iteration** and does **not** match the implemented system. It must not be used as a requirements source; regenerate from `/openapi.json`. Material drift:

| Contract claims | Implementation (actual) |
|---|---|
| Base URL `/api` | `/api/v1` |
| JWT in httpOnly cookie `ad_session` + CSRF (`GET /api/auth/csrf`, `X-CSRF-Token`) | Bearer JWT in `Authorization` header; no CSRF endpoints exist |
| Role-scoped paths (`/api/farmer/batches`, `/api/customer/orders`, `/api/rider/deliveries`, `/api/business/bulk-requests`, `/api/public/...`) | Flat resource paths (`/batches`, `/orders`, `/deliveries`, `/b2b/...`, public reads without prefix) |
| Role names `ADMIN\|FARMER\|CUSTOMER\|DELIVERY_RIDER\|BUSINESS` | lowercase `admin\|farmer\|customer\|rider\|business` |
| Human-readable codes (`FRM-XXXXXX`, `AP-0001`, `ORD-000001`, `BRQ-…`, `DLV-…`) | Integer IDs everywhere |
| Register = multipart, does NOT log in, returns `PENDING` | Register = JSON, returns tokens immediately, `status:"active"` |
| Account approval workflow (`ACCOUNT_PENDING/REJECTED/SUSPENDED`, admin approve/reject/request-changes) | No account-approval flow; farm verification is the approval gate; admin can suspend via status endpoint |
| Cattle endpoints (`/api/farmer/cattle`) | Do not exist |
| `GET /api/public/network` stats, `POST /api/public/contact`, `GET /api/public/contact-info` | Do not exist (contact → `POST /complaints` when logged in) |
| Documents via `/api/documents/{id}` with authz, uploads NOT static | Uploads served via static `/uploads/files/{uuid}` (public URLs) |
| Passwords: argon2 | bcrypt via passlib (acceptable, but drift) |
| Login rate-limited 5/min/IP + lockout after 10 fails | **No rate limiting implemented** (see P2-1) |
| `POST /api/admin/deliveries` (admin creates delivery) | Does not exist; deliveries auto-created on payment |
| Every mutation writes an audit log row | Only selected admin actions logged (status changes, farm verify) — not every mutation |

---

## 4. Issue register

### P2 — High
- **P2-1 · No rate limiting on auth endpoints.** `POST /auth/login` and `POST /auth/register` have no throttle/lockout. Brute-force exposure. Contract required 5/min/IP + lockout. Fix: add slowapi (or middleware) with login lockout; low complexity, no dependencies on other modules. Acceptance: 6th rapid bad login → 429.
- **P2-2 · `API_CONTRACT.md` is stale and contradicts the implementation** (§3 above). Risk: future agents/teams build against the wrong contract. Fix: regenerate contract from `/openapi.json` (or mark the file superseded). Acceptance: contract matches live routes 1:1.

### P3 — Low
- **P3-1 · Dead `spoilage` variable** in `batches._batch_out`: `spoilage_risk` is always `null` in batch/trace responses (`freshness = spoilage = None`, never assigned). Either compute it from `spoilage_risk` in the latest prediction or drop the field.
- **P3-2 · `log_admin_action` duplicated**: `app/auth/deps.py` defines a version taking `admin: User` (dead code, never imported) while `app/routers/_helpers.py` defines the used version taking `admin_id: int`. Remove the dead one.
- **P3-3 · Duplicate admin overview**: `GET /admin/analytics/overview` (dict) and `GET /analytics/admin/overview` (typed) return overlapping data. Keep one; redirect/alias the other.
- **P3-4 · Misleading annotation** in `support.py`: `user: User | None = Depends(get_current_user)` — `get_current_user` never returns `None` (raises 401). Verified live: unauthenticated chat → 401. Fix annotation to `User` or document that chat requires login.
- **P3-5 · Delivery status transitions not validated**: `PATCH /deliveries/{delivery_id}/status` accepts any `DELIVERY_STATUS` value in any order (e.g. `scheduled` → `delivered`). Add a legal-transition map server-side.
- **P3-6 · Public farm detail leaks internal owner `userId`** (`GET /farms/{farm_id}` detail=True). Not PII, but an internal identifier; consider nulling it in public context like the list endpoint does.
- **P3-7 · Untyped body** in `PATCH /b2b/requests/{request_id}` (`body: dict`). Works (status validated manually), but bypasses Pydantic validation; replace with a schema.

**No P0 or P1 issues found.** No auth bypass, no cross-role data exposure (ownership checks return 404 to non-owners across batches/orders/deliveries/complaints/subscriptions/reviews), no stub endpoints, no fake data, no unhandled-exception paths observed, all 22 models present.

---

## 5. Area score — Backend APIs & business logic: **92 / 100**

Justification:
- **+** 92/92 operations implemented with real logic; zero stubs/TODOs/hardcoded responses.
- **+** JWT auth on all protected routes; role guards (`require_role`) + ownership checks verified in code and via live 401/403/404 probes; admin cannot create farmer-owned batches (403 in code).
- **+** Pydantic v2 validation with correct 422/400/409 status codes, verified live.
- **+** Genuine ML integration: 4 model artifacts present, load successfully, endpoints persist `AIPrediction` rows; 503 when models absent.
- **+** Honesty labels embedded in response schemas (Demonstration prediction / Demo payment / Simulated IoT reading).
- **+** Upload security: 5 MB cap, magic-number sniffing, uuid filenames, path-traversal guard.
- **−3** no login/register rate limiting (P2-1).
- **−2** `API_CONTRACT.md` stale and contradictory (P2-2).
- **−3** accumulation of P3 code smells (dead variable, duplicated helper, duplicate endpoint, unvalidated transitions, untyped body, misleading annotation, minor id leak).

**Not scored here (other agents):** DB/ERD comparison, frontend integration, E2E workflows, deployment readiness (CORS allowlist is dev-only: `http://localhost:5173,http://127.0.0.1:5173` — production domain must be added before deployment; `DEMO_MODE=true` default).
