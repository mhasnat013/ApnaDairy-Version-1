# Agent 8 — Administration Portal Audit (Baseline)

**Date:** 2026-09-27 · **Auditor:** Agent 8 (Administration) · **Phase:** baseline (read-only code + live API tests against local dev DB; no source edits, no Supabase)
**Backend:** http://127.0.0.1:8000/api/v1 (FastAPI, restarted during audit — see §8) · **Frontend:** http://127.0.0.1:4173 (code-inspected; live-browser checks out of scope for this agent)

## 1. Admin access setup (documented as required)

- A local admin `qa_admin@test.pk` existed in the dev DB, but its password was unknown, so per the task brief I created a clearly-marked audit admin directly in SQLite:
  - `INSERT INTO "user" (full_name, email, phone, password_hash, role, is_verified, status)` → `audit8+admin@test.pk` / `Audit Eight Admin` / `+920000000008`, `role='admin'`, `is_verified=1`, `status='active'` → **user_id 22**. Password was hashed with the backend's own `hash_password()` (passlib) and used only transiently via `/auth/login`; the plaintext was never stored and the temp file was deleted after the audit.
- Login verified: `POST /api/v1/auth/login` → 200, `GET /api/v1/auth/me` → `audit8+admin@test.pk / admin / active`.
- Test fixtures created in the **local dev DB only** (backup exists at `apnadairy_dev.db.pre-audit-bak`): users `audit8+farmer/farmer2/biz/rider/cust@test.pk`, farms 9 (verified) & 10 (rejected), batch 7, product 6, complaint 4. Supabase was not touched.

## 2. Tab audit table

| Tab | Route | API called | Real data? | Actions work? |
|---|---|---|---|---|
| Dashboard | `/app/admin` | `GET /admin/analytics/overview`, `GET /admin/farms/pending` | ⚠️ **No** — all 8 stat cards render `0` (contract mismatch, ISSUE-1); pending queue is real | Pending approve/reject works |
| Users | `/app/admin/users` | `GET /admin/users`, `GET /admin/users/{id}`, `PATCH /admin/users/{id}/status` | ✅ Yes — live user rows, role/status filters | ✅ Suspend/restore verified live (login blocked 403 while suspended, works after restore) |
| Farms | `/app/admin/farms` | `GET /admin/farms/pending`, `GET /farms`, `POST /admin/farms/{id}/verify` | ⚠️ Partial — pending queue real; "All farms" tab actually shows **verified only** (ISSUE-5); rejected farms invisible | ✅ Approve **and** reject verified live |
| Operations | `/app/admin/operations` | `GET /batches|/orders|/deliveries|/payments`, `PATCH /orders/{id}/status`, `PATCH /deliveries/{id}/assign`, `PATCH /deliveries/{id}/status` | ✅ Yes — real rows | ✅ All verified live (order→in_transit, delivery assigned to rider, →picked_up) |
| Commerce | `/app/admin/commerce` | `GET /products`, pricing rules, discount CRUD, `GET /subscriptions`, `PATCH /subscriptions/{id}` | ✅ Yes | ✅ Discount create/view/delete verified; ❌ **"Cancel subscription" → 403** (ISSUE-2) |
| B2B | `/app/admin/b2b` | `GET /b2b/requests`, `GET /b2b/quotations` | ✅ Yes — real requests (n=3) & quotations (n=5) | Read-only by design; page honestly labels itself "read-only oversight" |
| AI & IoT | `/app/admin/ai-iot` | `GET /ai/status`, `GET /batches`, `GET /iot/batches/{id}/readings` | ✅ Yes — real model status (`models_loaded: true`, version string), real readings | ✅ Simulated readings ingested, batch scored (81.33/Fresh), prediction **persisted** and viewable |
| Analytics | `/app/admin/analytics` | `GET /admin/analytics/overview`, `GET /admin/analytics/farms` | ⚠️ Partial — stat cards all `0` (same ISSUE-1); raw "Platform metrics"/"Metric values" list renders real keys | Charts render from raw data |
| Support | `/app/admin/support` | `GET /complaints`, `GET /complaints/{id}`, `PATCH /complaints/{id}`, `GET /admin/action-logs` | ✅ Yes | ✅ Status change open→in_review→resolved verified; user notified each time; user sees updated status |
| Chat | `/app/admin/chat` | `POST /support/chat`, `GET /chat/history` | ⚠️ **No** — shows only the admin's own conversation (ISSUE-3) | No real chatbot oversight exists |
| Notifications | `/app/admin/notifications` | none | N/A | Honest "Not available" placeholder (no broadcast endpoint) — not fake, but a gap (ISSUE-6) |
| Profile | `/app/admin/profile` | shared profile endpoints | ✅ Yes | Standard |

Frontend route guards: `portal("admin", …)` wraps every tab in `RequireAuth` + `RequireRole roles=["admin"]`; wrong role → `/unauthorized`, guest → `/login?next=…` (code-verified in `app/router.tsx` + `app/guards.tsx`).

## 3. Approval workflow evidence

**Farm approve (happy path):**
1. `POST /auth/register` (farmer) → 201, `isVerified=false`
2. `POST /farms` → 201, `verificationStatus=pending` (farm 9)
3. `GET /admin/farms/pending` → 200, farm 9 present (5 pending)
4. `POST /admin/farms/9/verify {verified}` → 200
5. DB confirms: `farm.verification_status='verified'`, owner `is_verified=1`
6. `notification` row exists: *"Your farm 'Audit Eight Dairy Farm' has been verified."* and farmer's `GET /notifications` returns it
7. `GET /admin/action-logs?action=farm_verified` → entry present

**Farm reject path:** second farmer → farm 10 → `verify {rejected}` → 200 → farmer notified ("has been rejected") → `farm_rejected` action-log entry present.

**User suspend/restore:** `PATCH /admin/users/39/status {suspended}` → 200 → login attempt → **403 "Account is not active."** → restore → 200 → login works. Self-suspend and admin-suspend are correctly rejected (400).

**Complaint workflow:** customer `POST /complaints` → 201 open → admin `PATCH` → in_review → resolved → customer receives **both** notifications and sees `resolved`. Statuses validated against `['open','in_review','resolved','closed']` (400 on invalid).

**AI/IoT admin visibility:** farmer batch → `POST /iot/readings` → 201 → `POST /batches/7/score` → 201 (freshness 81.33, Fresh, disclaimer present) → `GET /batches/7/predictions` as admin → 200, persisted row with model version. `GET /ai/status` → real model health.

**Analytics honesty:** `/admin/analytics/overview` returns **live aggregations verified against the DB** (`farms:9 = 9`, `verifiedFarms:6 = 6`, `batches:5 = 5`, `orders:7 = 7`, `usersByRole` sums to 42 = 42 users). No hardcoded numbers anywhere in the admin backend.

## 4. Negative tests (all pass)

| # | Test | Result |
|---|---|---|
| N1 | Admin `POST /batches` (farmer-owned) | **403** "Requires role: farmer" ✅ |
| N2 | Customer/farmer/rider/business `GET /admin/users`, `/admin/action-logs` | **403** "Requires role: admin" ✅ |
| N3 | No token on `/admin/*` | **401** ✅ |
| N4 | Customer `POST /admin/farms/{id}/verify`, `PATCH /admin/users/{id}/status` | **403** ✅ |
| N5 | Public `POST /auth/register` with `role=admin` | **403** "Admin accounts cannot be created via public registration." ✅ |
| N6 | One farm per user (ERD 1–1) | **409** on second farm ✅ |

## 5. Issue register

**ISSUE-1 — P1 — Dashboard/Analytics stat cards all show 0 (frontend/backend contract mismatch).**
Repro: log in as admin, open `/app/admin` or `/app/admin/analytics` — Users/Farms/Batches/Orders/Revenue/Pending farms/Open complaints/Subscriptions cards all display 0 despite real data.
Cause: `AdminOverview` TS interface + pages expect `totalUsers, totalFarms, pendingFarms, totalBatches, totalOrders, totalRevenue, openComplaints, activeSubscriptions`, but `GET /admin/analytics/overview` returns `usersByRole (dict), farms, verifiedFarms, batches, products, orders, revenue`. All reads fall through to `?? 0`.
Fix: align the endpoint response (or the frontend mapping) to one contract.

**ISSUE-2 — P2 — Commerce → Subscriptions "Cancel subscription" button always fails.**
Repro: as admin, `/app/admin/commerce` → Subscriptions tab → Cancel → **403** (verified live).
Cause: `PATCH /subscriptions/{id}` requires `require_role("customer")` + ownership; the admin UI exposes the action anyway.
Fix: allow `admin` in the role guard (keeping the ownership bypass for admins) or hide/disable the button for admins.

**ISSUE-3 — P2 — Chatbot oversight is not real.**
Repro: `/app/admin/chat` renders the shared `ChatPage` with the admin's own session; `GET /chat/history` filters `user_id == current user`. There is no admin endpoint to list all chat sessions/messages, so "Conversations routed to administrators" cannot be overseen.
Fix: add `GET /admin/chat/sessions` (+ messages) or re-scope the tab honestly.

**ISSUE-4 — P2 — Admin complaint status changes are not audit-logged.**
Repro: resolve a complaint as admin → user notified ✅, but `GET /admin/action-logs?action=complaint` → empty. Only `user_status:*` and `farm_verified/farm_rejected` call `log_admin_action`.
Fix: add `log_admin_action(...)` in `update_complaint` (engagement.py).

**ISSUE-5 — P2 — Admin "All farms" tab hides pending/rejected farms.**
Repro: `/app/admin/farms` → "All farms" tab uses `GET /farms` with no status filter; backend defaults to `verification_status="verified"`. Rejected farms are invisible everywhere in the admin UI.
Fix: pass `verificationStatus=all` from the "All farms" tab (backend already supports it).

**ISSUE-6 — P3 — No admin notification broadcast; tab is an honest placeholder.**
The Notifications tab correctly explains no broadcast endpoint exists. Not fake, but the tab adds no capability. Optional: add `POST /admin/notifications/broadcast`.

**ISSUE-7 — P3 — Analytics "Metric values" renders `usersByRole` object as "[object Object]".**
Cosmetic; filter non-scalar values in the list (the chart already filters to numbers).

**ENV-1 — (resolved during audit, not a code defect):** the running uvicorn (started 13:40) predated the `engagement.py` 500-fixes (14:03), so live `GET /notifications` and `GET /subscriptions` returned 500 while the code on disk was already correct (proven via in-process TestClient → 200). I restarted the backend with the same command; all endpoints now serve current code. Recommend the orchestrator restart services after any source change.

## 6. Area score: **78/100**

Justification (per-tab, evidence above): Users 100 · Operations 100 · Security/negatives 100 · AI/IoT 95 · Support 90 · Farms 90 · B2B 90 · Commerce 85 · Dashboard 55 · Analytics 60 · Chat 40 · Notifications 30 → mean ≈ 78.
Core admin workflows (approvals, user management, operations, complaints, B2B/AI oversight, audit logs for key actions) are **genuinely implemented and live-verified**; deductions come from the P1 dashboard contract mismatch, one broken action (subscription cancel), missing chat oversight, incomplete audit logging for complaints, and the placeholder notifications tab. No P0 issues; backend authorization is correctly enforced throughout (403/401/409 all verified).

## 7. Remaining work for this area (handover)

1. **P1:** Align `/admin/analytics/overview` response with the frontend `AdminOverview` contract (or vice versa) — Dashboard + Analytics stat cards currently show 0. (backend `app/routers/admin.py::platform_overview`, frontend `features/portal/types.ts` + `pages/app/admin/Dashboard.tsx`/`Analytics.tsx`)
2. **P2:** Allow admin (or hide for admin) the subscription-cancel action (`PATCH /subscriptions/{id}`).
3. **P2:** Add admin chat-oversight endpoint or re-scope the Chat tab.
4. **P2:** Add `log_admin_action` to complaint status updates.
5. **P2:** Pass `verificationStatus=all` on the admin Farms "All farms" tab.
6. **P3:** Optional broadcast endpoint; fix "[object Object]" rendering.
7. Non-code: production hosting/CORS decision and admin password rotation remain with the parent.
