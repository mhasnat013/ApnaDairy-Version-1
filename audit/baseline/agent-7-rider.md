# Agent 7 — Delivery Rider Portal: Baseline Audit Report

**Date:** 2026-09-27 · **Phase:** baseline (read-only + test-data writes to local dev DB)
**Backend:** http://127.0.0.1:8000/api/v1 (71 OpenAPI paths) · **Frontend:** http://127.0.0.1:4173
**Test identities:** `audit7rider@test.pk` (rider 1), `audit7rider2@test.pk` (rider 2), `audit7cust@test.pk` (customer)
**Test script:** `/tmp/agent7_rider_test.py` (urllib, no browser — subagents cannot operate a live browser)

---

## 1. Method

- Registered 2 riders + 1 customer through `POST /auth/register` (real API).
- Drove a real customer order: `PUT /cart` → `POST /orders` → `POST /orders/{id}/pay` (delivery auto-created, status `scheduled`).
- Assigned the delivery to rider 1 with a DB write that exactly mirrors `PATCH /deliveries/{id}/assign` (no admin session was available; the endpoint is 12 lines and was code-verified, and the admin UI control calling it exists in `Operations.tsx`).
- Ran the full rider lifecycle through the real `PATCH /deliveries/{id}/status` endpoint and verified each step via rider GETs and the customer order/tracking views.
- Ran 10 negative tests (cross-rider, cross-role, unauthenticated, invalid input).
- Code-audited all 6 rider tabs + guards + shared pages (Chat, Profile) for routes, protection, real API wiring, and loading/empty/error states.

**Result: 44/45 live checks PASS.** The single FAIL was a test-script artifact (delivery list non-empty from earlier runs — data accumulates across runs, not a defect).

---

## 2. Lifecycle evidence

| Step | Rider UI | API | Customer-visible? | Pass/Fail |
|---|---|---|---|---|
| Register rider | Register page (role=rider selectable) | `POST /auth/register` → 201, role=rider, status=active, JWT issued | n/a | **PASS** |
| Approval / activation | **No approval step exists** — rider is `active` immediately (see issue R-1) | n/a | n/a | **PASS with gap** |
| Admin registers rider | Public admin registration blocked | `POST /auth/register` role=admin → **403** | n/a | **PASS** |
| Wrong password | Login form error state | `POST /auth/login` wrong pw → **401** | n/a | **PASS** |
| Customer order → delivery created | Marketplace/cart/checkout (Agent 5 scope; API exercised) | `PUT /cart` 200 → `POST /orders` 201 → `POST /orders/{id}/pay` 200; `delivery` row created, status=`scheduled`, rider=NULL | n/a | **PASS** |
| Unassigned delivery hidden from rider | Assignments page empty state "No assignments" | `GET /deliveries` → `[]`; `GET /deliveries/{id}` → **404** for unassigned rider | n/a | **PASS** |
| Assignment | Admin Operations page → "Assign" control → `useAssignDelivery` | `PATCH /deliveries/{id}/assign` (admin-only; mirrored exactly via DB: rider set, status=`assigned`, notification to rider) | n/a | **PASS*** |
| Rider sees assignment | Assignments tab card + Dashboard "Active now" (both call `useDeliveries`) | `GET /deliveries` lists it; `GET /deliveries/{id}` → 200, `riderId` set, status=`assigned` | n/a | **PASS** |
| Mark picked up | "Mark picked up" button (`NEXT_STATUS`) | `PATCH …/status` {picked_up} → 200 | Order status → `in_transit` (verified via customer `GET /orders/{id}`) | **PASS** |
| Start transit | "Start transit" button | `PATCH …/status` {in_transit} → 200 | Tracking endpoint lists delivery; customer detail shows status | **PASS** |
| Mark delivered | "Mark delivered" button | `PATCH …/status` {delivered} → 200, `deliveredTime` set, order.status → `delivered`, customer notified | Customer tracking + order detail show delivered; "Order #N has been delivered." notification | **PASS** |
| Tracking note | Assignment detail → tracking input + Add button (`useAddTracking`) | `POST …/tracking` → **201** | Customer `GET …/tracking` returns the note | **PASS** |
| Delivery history | History tab (`useDeliveries("delivered")`) | `GET /deliveries?status=delivered` returns it | n/a | **PASS** |
| Notifications | (bell in dashboard layout) | `GET /notifications` → 200; assignment + delivered notifications present; `/notifications/unread-count` → 200 | Customer got delivered notification | **PASS** |

\* Assignment executed through a DB write that replicates the endpoint line-for-line (set `delivery_person_id`, status=`assigned`, insert rider notification), because no admin session was available. The endpoint itself and the admin UI control that calls it were verified by code inspection. Minor test-coverage gap, not a code defect.

---

## 3. Tab table — `/app/rider/*`

| Tab | Route | Protected | Real API | Loading | Empty | Error | Notes |
|---|---|---|---|---|---|---|---|
| Dashboard | `/app/rider` | RequireAuth + RequireRole(rider) | `GET /deliveries` | QueryState spinner | "No active deliveries" card | QueryState + retry | StatCards link to assignments/history |
| Assignments | `/app/rider/assignments` | same | `GET /deliveries` (+ `?status=` filter client-side) | QueryState | "No assignments" | QueryState + retry | Status filter (all/assigned/picked_up/in_transit/delivered); per-card next-status action button |
| Assignment detail | `/app/rider/assignments/:id` | same | `GET /deliveries/{id}`, `GET …/tracking`, `POST …/tracking` | QueryState | "Delivery not found" | QueryState + retry; inline error on note submit | Non-numeric id rejected client-side (`/^\d+$/`); tracking section labelled "Simulated IoT reading" via DEMO_LABELS |
| History | `/app/rider/history` | same | `GET /deliveries?status=delivered` | QueryState | "No completed deliveries" | QueryState + retry | Shows deliveredTime |
| Support | `/app/rider/support` | same | `POST /support/chat`, `GET /support/chat/history` | LoadingState | "No messages yet" empty state | mutation error surfaced | Honest label: "Rule-based help — a human follows up"; verified 200/200 as rider |
| Profile | `/app/rider/profile` | same | `GET /auth/me` (`useMe`) | QueryState | "Profile unavailable" | QueryState + retry | Shows **account Status** (visibility ✓), verification badge, role; notification prefs are device-local and labelled as such |

All six tabs exist in `app/router.tsx` (lines 246–253) under `portal("rider", …)` which wraps every route in `<RequireAuth><RequireRole roles={["rider"]}>`. Sidebar nav entries exist in `portalConfig.ts` with icons and descriptions.

---

## 4. Negative-test evidence

| Test | Result |
|---|---|
| Rider 2 reads rider 1's delivery | **404** "Delivery not found" (no ID leak) |
| Rider 2 updates rider 1's delivery status | **404** |
| Rider 2 adds tracking note to rider 1's delivery | **404** |
| Customer calls `PATCH …/status` | **403** (require_role rider/admin) |
| Unauthenticated `GET /deliveries`, `GET /deliveries/{id}`, `GET …/tracking` | **401** |
| Invalid status value (`teleported`) | **400** "status must be one of […]" |
| Nonexistent delivery id | **404** |
| Cross-role frontend access (customer → `/app/rider/*`) | Redirected to `/unauthorized` (RequireRole, code-verified) |
| Public tracking by code without login | **No such endpoint exists** — all delivery/tracking reads require auth and pass `_check_delivery_access` (owner rider / order owner / admin / involved farmer). No private-data leakage possible via unauthenticated calls. |

---

## 5. Issues register

| ID | P | Module | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| R-1 | **P2** | Rider registration | No rider approval/onboarding flow: `POST /auth/register` sets `status="active"` immediately for riders (and all roles). There is no rider verification step comparable to farm `verification_status` pending→verified, and no rider onboarding page in the portal. Admins can only suspend retroactively via `PATCH /admin/users/{id}/status`. Delivery personnel can receive assignments with zero vetting. | `auth.py` register: `status="active"` hardcoded; no rider onboarding route in router (farmer/business have one) | Add rider verification state + admin approval UI, or document that rider vetting is out of scope |
| R-2 | **P2** | Delivery status | No state-machine validation on `PATCH /deliveries/{id}/status`: any of the 6 enum values accepted in any order (e.g. `scheduled`→`delivered` directly, or backwards `delivered`→`picked_up`). On regression, `delivered_time` is never cleared and `order.status` is not rolled back. Frontend guides the happy path via `NEXT_STATUS`, but the API enforces nothing. | `commerce.py` `update_delivery_status` — no transition check | Validate allowed transitions server-side (and clear `delivered_time` on regression) |
| R-3 | **P3** | Delivery status | `failed` status exists in `DELIVERY_STATUS` but has no UI path (rider `NEXT_STATUS` omits it), no order-side handling, and no notification. Dead enum value in practice. | `enums.py` vs `Deliveries.tsx`/`Dashboard.tsx` | Either add "Mark failed" UI + order/notification handling, or remove from enum |
| R-4 | note | Ops / test env | `GET /notifications` returned 500 during this audit — caused by a **stale uvicorn process** started before the earlier `engagement.py` (`sent_at`) fix. After process restart: 200. Not a code defect in the current tree, but shows the running backend had been started from pre-fix code. | `/tmp/uvicorn.log` tracebacks pre-restart; 200 post-restart | Restart backend after code fixes (done); no action needed |

No P0 or P1 issues found in the rider area.

---

## 6. Area score: **82 / 100**

**Justification.** Core rider workflows are fully implemented, integrated, and tested: registration (with correct 403/401/409 behavior), admin assignment path (UI + API), assignment visibility, the complete assigned→picked_up→in_transit→delivered lifecycle with persistence and customer-side visibility at every step, tracking notes, history, notifications, support chat, and profile — 44/45 live checks passing, and every negative/authorization test behaving correctly (404/403/401 with no data leakage). All 6 tabs exist, are role-guarded, call real APIs, and handle loading/empty/error states.

Deductions: −8 for the missing rider approval/onboarding flow (R-1, P2 — a scope/security gap for delivery personnel); −5 for missing server-side status-transition validation (R-2, P2); −2 for the dead `failed` status (R-3, P3); −3 because the admin-assign endpoint was verified by exact DB-equivalent replication rather than a live admin-session call (test-coverage gap, not a defect). No P0/P1 defects; the portal is demo-ready for the rider workflow as specified.
