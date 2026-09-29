# Agent 5 — Customer Portal Baseline Audit

**Date:** 2026-09-27 · **Auditor:** Agent 5 (Customer Portal) · **Phase:** baseline (read-only code inspection; test-data writes to local dev DB only; no source edits, no Supabase)
**Environment:** backend `http://127.0.0.1:8000/api/v1` (uvicorn, live), frontend `http://127.0.0.1:4173` (vite preview, live), DB `backend/apnadairy_dev.db` (backup `apnadairy_dev.db.pre-audit-bak` untouched)
**Test identities:** `audit5+customer@test.pk` (user_id 46), `audit5+customer2@test.pk` (user_id 44) — tokens redacted everywhere.

> Browser-driving (click-level UI automation) is out of scope for this agent; UI evidence below comes from the served frontend, code-level inspection of each page component (hooks → real API endpoints, `QueryState` loading/empty/error branches, responsive classes), and HTTP route checks. Step-by-step DOM interaction is deferred to Agent 12.

## 1. Journey evidence (UI | API | DB)

Script: `/tmp/agent5_journey.py` (16 steps). Final run: **16/16 PASS**.

| Step | UI (component → call) | API (method, status) | DB row (evidence) | Verdict |
|---|---|---|---|---|
| 1. Register customer | `Register.tsx` → `POST /auth/register` (zod: email/phone/password+confirm) | `POST /auth/register` → **201**; duplicate email/phone correctly rejected **409** | `user` (46, audit5+customer@test.pk, customer, active) | PASS |
| 2. Login | `Login.tsx` → `POST /auth/login`, JWT persisted via `useAuthStore` | `POST /auth/login` → **200** | JWT valid against `/auth/me` → 200 | PASS |
| 3. Browse marketplace | `Shop.tsx` → `useProducts()` grid of ProductCards | `GET /products` → **200**, 2 active products | `product` rows: (1, QA Full Cream Milk, 100 avail), (2, Demo Fresh Milk 1L, 100 avail) | PASS |
| 4. Product detail | `ProductDetail.tsx` → `useProduct(id)`, `useReviews` | `GET /products/1` → **200** | `product.batch_id=1` links to batch `B-1-F171CF` | PASS |
| 5. Batch traceability | public `BatchTraceResult` ← portal `CustomerBatchTrace` form navigates to `/batch-trace/:code`; result rendered from API | `GET /batches/trace/B-1-F171CF` → **200** | trace: farm "QA Dairy Farm", batch code, quantity, status — matches `farm`+`milk_batch` rows; **not** frontend-generated | PASS |
| 6. Add to cart | Shop add-to-cart → `useUpdateCart()`; `Cart.tsx` → `useCart()` | `PUT /cart` → **200** | `cart.cart_data` = `{"items":[{"product_id":1,"quantity":2,…}]}` for user 46 | PASS |
| 7. Checkout → order | `Checkout.tsx` `createOrder` mutation (address required, zod-validated) | `POST /orders` → **201** | `order` (8, user 46, status pending, total 360.00); cart cleared | PASS |
| 8. Demo payment + inventory | `Checkout.tsx` `payOrder`; success card renders `DEMO_LABELS.payment` | `POST /orders/8/pay` → **200** | `payment` (order 8, amount 360.00, status completed, ref `DEMO-E8600B489B86`); `product.quantity_available` **100 → 98** (decrement verified at payment, not before) | PASS |
| 9. Delivery + tracking | `TrackDelivery.tsx` → shared `TrackDeliveryPage` → `useDelivery`/`useTracking` | `GET /deliveries/4/tracking` → **200** | `delivery` (4, order 8, status scheduled) auto-created at payment | PASS |
| 10. Product review | `Reviews.tsx` form → `useCreateReview` | `POST /reviews` → **201** | `review` (2, user 46, product 1, rating 5) | PASS |
| 11. Complaint | `Complaints.tsx` form → `useCreateComplaint` (also wired from public Contact page for logged-in users) | `POST /complaints` → **201** | `complaint` (3, user 46, "Audit5 late delivery", status open) | PASS |
| 12. Farm subscription | `Subscriptions.tsx` → `useCreateSubscription` | `POST /subscriptions` → **201** | `subscription` (2, user 46, farm 1, weekly, active) | PASS |
| 13. Notifications | `Notifications.tsx` list + read-all | `GET /notifications` → **200**, 2 items | `notification` rows: order-placed + payment with text **"Demo payment — no real money will be charged. Payment DEMO-E8600B489B86 recorded…"** | PASS |
| 14. Cross-customer order access | `OrderDetail.tsx` error branch | customer2 `GET /orders/8` → **404** (ownership enforced server-side) | no leak | PASS |
| 15. Unauthenticated API | `RequireAuth` guard → `/login?next=…` | `GET /orders` (no token) → **401** | n/a | PASS |
| 16. Invalid resource | `ProductDetail` `QueryState` error branch | `GET /products/99999` → **404** | n/a | PASS |

Ownership isolation (extra): customer2 `DELETE /reviews/2` → **404**; customer2 `GET /complaints/3` → **404**; customer1 `DELETE /reviews/2` (own) → **200**. Admin visibility (code, read-only): `list_complaints` returns **all** rows when `user.role == "admin"` — complaint #3 is admin-visible; `GET /reviews?product_id=1` returns the submitted review.

Honest-label checks: `DEMO_LABELS.payment = "Demo payment — no real money will be charged"` (`frontend/src/lib/constants.ts:26`) rendered in `Checkout.tsx:51`; backend `PAYMENT_DISCLAIMER` identical string stored in the payment notification (`commerce.py:32,293`); payment rows carry `DEMO-` transaction refs and `status="completed"` with code comment "simulated — completes instantly".

## 2. Customer tab audit (all routes under `/app/customer`, all behind `RequireAuth` + `RequireRole(["customer"])` via `portal()` helper, `router.tsx:129-141`)

HTTP sweep: all 15 routes return **200** from the preview server (SPA shell; unauthenticated API calls return 401 and the guard redirects to `/login?next=…`).

| Tab | Route | Protected | Real API | Loading / Empty / Error | Mobile sanity | Notes |
|---|---|---|---|---|---|---|
| Dashboard | `/app/customer` | ✅ | ✅ `useOrders`, `useNotifications`, `useSubscriptions` | ✅ `QueryState` ×5 | ✅ `sm:`, `lg:grid-cols-` | Active-order + subscription stats from live data |
| Shop | `/shop` | ✅ | ✅ `useProducts`, `useCart`, `useUpdateCart` | ✅ `QueryState` ×3 | ✅ `grid-cols-3`, `sm:` | — |
| Product detail | `/products/:id` | ✅ | ✅ `useProduct`, `useReviews` | ✅ `QueryState` ×5 | ✅ `sm:p-`, `lg:grid-cols-` | Invalid id → 404 error state (step 16) |
| Batch trace | `/batch-trace` | ✅ | ✅ (lookup form → public `/batch-trace/:code` → `GET /batches/trace/{code}`) | ✅ zod field error; result page has error state | ✅ `sm:flex-row` | Design: lookup in portal, result on public page — acceptable |
| Cart | `/cart` | ✅ | ✅ `useCart`, `useUpdateCart`, `useClearCart` | ✅ `QueryState` ×3 | ✅ `sm:p-`, `lg:grid-cols-` | — |
| Checkout | `/checkout` | ✅ | ✅ `useCreateOrder`, `usePayOrder` | ✅ `QueryState` ×3 + inline `setError` | ✅ `sm:`, `lg:grid-cols-` | Empty cart → empty state w/ shop CTA; address required |
| Orders | `/orders` | ✅ | ✅ `useOrders` | ✅ `QueryState` ×3 | ✅ `md:grid-cols-` | — |
| Order detail | `/orders/:id` | ✅ | ✅ `useOrder`, `usePayOrder` | ✅ `QueryState` ×3 | ✅ `lg:grid-cols-` | Cross-user → 404 (step 14) |
| Tracking | `/track/:deliveryId` | ✅ | ✅ shared page → `useDelivery`, `useTracking`, `useAddTracking` | ✅ `QueryState` ×2 | ✅ (shared layout) | Numeric id validated via regex before fetch |
| Subscriptions | `/subscriptions` | ✅ | ✅ `useSubscriptions`, `useCreateSubscription`, `useUpdateSubscription`, `useFarms` | ✅ `QueryState` ×3 | ✅ `md:grid-cols-` | — |
| Saved farms | `/farms/saved` | ✅ | ⚠️ device-local (`localStorage`, key `apnadairy-saved-farms`) + `useFarms` for farm data | ✅ `QueryState` ×3 | ✅ `md:grid-cols-` | Honestly labelled in UI: "Saved on this device" (see §3 OBS-1) |
| Notifications | `/notifications` | ✅ | ✅ `useNotifications`, `useMarkRead`, `useMarkAllRead` | ✅ `QueryState` ×3 | ✅ simple stacked list | Real rows incl. demo-payment disclaimer (step 13) |
| Reviews | `/reviews` | ✅ | ✅ `useReviews`, `useCreateReview`, `useDeleteReview`, `useFarms` | ✅ `QueryState` ×3 | ✅ `md:grid-cols-` | Own-review delete works; others' → 404 |
| Complaints | `/complaints` | ✅ | ✅ `useComplaints`, `useCreateComplaint`, `useOrders` (optional order link) | ✅ `QueryState` ×3 | ✅ `md:grid-cols-` | Persists; admin-visible via unfiltered `GET /complaints` |
| Support | `/support` | ✅ | ✅ shared `ChatPage` → `useChatHistory`, `useSendChat` → `POST /support/chat` (200, real reply) | ✅ history loading state | ✅ | — |
| Profile | `/profile` | ✅ | ✅ shared `ProfilePage` → `useMe` (`GET /auth/me`) | ✅ `QueryState` | ✅ | Notification prefs device-local, labelled (see OBS-1) |

## 3. Issue list

**No P0 or P1 issues found in the customer portal.**

### P2
- **CUST-P2-1 — Stale dev-server process served 500s on `GET /notifications` mid-audit.** A previous uvicorn worker (PID 5131, pre-fix code) was still bound during the first journey run; after the parent restarted the server (PID 22179, current code) the endpoint returns 200 with correct data. Not a code defect — no fix in source. Retest: PASS (step 13, 16/16 run). Recommendation for the report: none code-wise; note dev-process hygiene only.

### P3 / observations (not defects)
- **CUST-OBS-1 — Saved farms + profile notification prefs are device-local (localStorage), not synced to the backend.** Both are *honestly labelled* in the UI ("Saved on this device"). Acceptable for FYP demo scope; flag for production backlog if cross-device sync is required.
- **CUST-OBS-2 — Portal batch-trace is a lookup form that hands off to the public `/batch-trace/:code` page** rather than rendering the timeline inside the portal chrome. Functional and uses the real API; minor UX inconsistency only.
- **CUST-OBS-3 — Registration 409 on duplicate phone** (phone `03001234567` collided with an older QA user) confirmed the duplicate-account check works — validation evidence, not an issue.

## 4. Area score — Customer Portal: **96 / 100**

- All 16 customer tabs exist, are route-guarded (`RequireAuth` + `RequireRole`), and call real backend endpoints — no UI-only tabs, no mocked responses, no dead buttons found. (+)
- Full purchase journey verified end-to-end at API + DB level: register → marketplace → batch trace (real farm/batch rows) → cart → order → **demo payment with the exact honest label** → inventory decrement **100→98 at payment** → delivery auto-created → review/complaint/subscription persisted → notifications generated with disclaimer text. (+)
- Ownership isolation proven: cross-customer order/review/complaint access → 404; unauthenticated → 401. (+)
- Loading/empty/error states present on every data tab (`QueryState`); invalid IDs and empty carts handled; responsive classes present on all tabs. (+)
- −2: click-level DOM walkthrough of every tab not performed by this agent (no live-browser capability) — deferred to Agent 12 for final sign-off.
- −2: saved-farms/profile-prefs are device-local by design (labelled); acceptable for demo but not full backend sync.

**Verdict:** Customer portal is **fully implemented and integrated** — the only functional anomaly encountered (notifications 500) was a stale dev-server process, not a code defect, and retests green after the running server was refreshed.
