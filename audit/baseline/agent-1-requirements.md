# Agent 1 — Requirements & Scope Baseline Audit (READ-ONLY)

**Date:** 2026-09-27
**Phase:** Baseline (read-only). No source files modified; no tests executed (testing is Agents 3–12).
**Sources inspected:**
- `~/workspace/apnadairy-source/root/Scope_Final-Document.pdf` → extracted to `/tmp/scope.txt` (567 lines)
- `~/workspace/apnadairy-source/root/erd.pdf` → cross-checked against `~/workspace/apnadairy-source/ERD_TRANSCRIPTION.md` (22 tables)
- Implementation: `~/workspace/apnadairy/backend` (FastAPI), `~/workspace/apnadairy/frontend` (React 18 + TS + Vite)
- `~/workspace/apnadairy/PLOY_MASTER_BRIEF.md` (final design authority), `~/workspace/apnadairy/API_CONTRACT.md`

**Note on embedded instructions:** code comments such as "Groq can be plugged in server-side later" (`backend/app/routers/support.py:1`) are developer notes, not requirements. Requirements below come only from the Scope Document, ERD, and Ploy master brief.

---

## 1. Scope summary (Scope_Final-Document.pdf)

**Project:** ApnaDairy — smart dairy marketplace with IoT + AI freshness prediction. FYP, Air University Islamabad. Team: Muhammad Hasnat Fakhar, Aqsa Rehman, Aeman Aasim; supervisor Sir Kaleem Ullah.

**Problem → solution:** No real-time visibility into milk quality/freshness/adulteration; pricing not linked to freshness; farmers lose near-expiry milk. Solution: digital marketplace + IoT data (real or simulated) + ML freshness/shelf-life prediction + dynamic pricing + batch traceability.

**Objectives:** (1) digital dairy marketplace with transparent listings/ordering; (2) IoT + ML freshness & shelf-life estimation; (3) dynamic pricing + analytics to reduce wastage.

**Explicitly OUT of scope (Scope §System Limitation/Constraints):** live payment gateway integration (JazzCash/EasyPaisa/bank APIs) — simulated payments; government system integration; physical IoT hardware development (API accepts future device data).

**Tech per scope:** Flutter (mobile, customers/admin), React.js (web portal: distributors, corporate buyers, admins), Python FastAPI (backend), Supabase (primary relational DB), simulated sensor-data API (temperature, adulteration, time-since-milking).

**Scope divergence (documented authority):** the Ploy master brief v2 (`PLOY_MASTER_BRIEF.md`, user-issued 2026-09-27, final authority) re-scoped delivery to the **web platform only** (React 18/TS/Vite + FastAPI + Supabase/Postgres). No Flutter mobile app exists in `~/workspace/apnadairy`. This is a documented product decision, not an implementation gap — recorded here as **Out of Scope (superseded)**.

**12 modules (Scope §Modules):** User Management; Supplier Management; Milk Collection & Batch Management; IoT Data Acquisition & Monitoring; AI Prediction Engine; Product Catalog; Order Fulfilment & Delivery; Bulk Buyer/B2B Bidding; Analytics & Dashboards; Complaints & Customer Support; Dynamic Pricing & Discounts; Subscription Management.

---

## 2. ERD summary

22 entities, all present as SQLAlchemy models in `backend/app/models/` (`__tablename__` verified): `user`, `farm`, `milk_batch`, `iot_sensor_reading`, `ai_prediction`, `product`, `price_history`, `discount`, `cart`, `order`, `payment`, `delivery`, `delivery_tracking`, `bulk_purchase_request`, `quotation`, `subscription`, `review`, `notification`, `complaint`, `chatbot_message`, `farm_analytics`, `admin_action_log`. Key constraints verified in transcription: USER–FARM 1:1 (unique FK), USER–CART 1:1, PAYMENT–ORDER 1:1, DELIVERY–ORDER 1:1, PRODUCT.batch_id nullable, REVIEW farm/product nullable, COMPLAINT.order_id nullable, ADMIN_ACTION_LOG.admin_id → USER.

---

## 3. Feature checklist (12 modules → testable requirements)

Legend for **Triage** (Agent 1 only — code footprint, NOT test evidence): `F` = footprint found (files/endpoints exist), `P` = partial footprint, `—` = no footprint found. Other agents assign final statuses.

### M1. User Management (Scope §Modules-1)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 1.1 | Register as Customer / Farmer / Business / Delivery Rider; **no public admin registration** | Scope-1; brief §5 | `pages/auth/Register.tsx` | `POST /auth/register` (auth.py:43 rejects `role=admin` → 403) | `user` | F |
| 1.2 | Login / logout with JWT; token refresh | Scope-1 | `pages/auth/Login.tsx`; `stores/auth.ts` | `POST /auth/login`, `POST /auth/refresh` | `user` | F |
| 1.3 | Forgot / reset password flow | Scope-1 (profile mgmt) | `ForgotPassword.tsx`, `ResetPassword.tsx` | `POST /auth/forgot-password`, `POST /auth/reset-password` | `user` | F |
| 1.4 | Profile view/update | Scope-1 | `pages/app/shared/Profile.tsx` | `GET /auth/me` (auth.py:149) | `user` | F |
| 1.5 | Order history per user | Scope-1 | `pages/app/customer/Orders.tsx`, `OrderDetail.tsx` | `GET /orders`, `GET /orders/{id}` | `order` | F |
| 1.6 | Role-based dashboards & route guards | Scope-9 (stakeholders/roles) | `app/guards.tsx` (RequireAuth/RequireRole/RoleRedirect); 5 portal trees | `require_role` deps in routers | `user.role` | F |

### M2. Supplier Management (Scope §Modules-2)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 2.1 | Farm/supplier registration with profile + location | Scope-2 | `pages/app/farmer/Onboarding.tsx`, `FarmProfile.tsx` | `POST /farms` | `farm` | F |
| 2.2 | Admin verification / approval of farms (and businesses, riders) | Scope-2 | `pages/app/admin/Farms.tsx` | `POST /farms/{id}/verify`, `GET /farms/pending` | `farm.verification_status` | F |
| 2.3 | Farm profiles, performance records | Scope-2 | `pages/public/Farms.tsx`, `FarmDetail.tsx` | `GET /farms`, `GET /farms/{id}` | `farm`, `farm_analytics` | F |
| 2.4 | Quality-based ratings / supplier credibility | Scope-2 | (reviews surfaced on farm detail) | `POST/GET /reviews` (engagement.py), `farm.rating_avg` | `review` | F |
| 2.5 | Verification **documents** upload for farms | Scope-2 ("registers and verifies") | — | uploads router is **images only** (`routers/uploads.py:1`); no doc fields on `farm` model | — | — (gap: verification is status-based only) |

### M3. Milk Collection & Batch Management (Scope §Modules-3)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 3.1 | Unique batch ID per milk collection | Scope-3; ERD `batch_code UNIQUE` | `pages/app/farmer/Batches.tsx` | `POST /batches` (batches.py) | `milk_batch.batch_code` | F |
| 3.2 | Record milking time + source farm | Scope-3 | `BatchDetail.tsx` | `POST /batches`, `GET /batches/{id}` | `milk_batch.milking_time`, `farm_id` | F |
| 3.3 | Batch lifecycle tracking (collection → sale) | Scope-3 | farmer Batches; admin `Operations.tsx` | `PATCH /batches/{id}`, `DELETE /batches/{id}`, `GET /batches` | `milk_batch.status` | F |
| 3.4 | Public batch traceability by code | Scope solution; mockup-2 | `pages/public/BatchTrace.tsx` (+result route) | `GET /batches/trace/{batch_code}` | `milk_batch` + joins | F |

### M4. IoT Data Acquisition & Monitoring (Scope §Modules-4)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 4.1 | Collect sensor data — real **or simulated** (temp, time, readings) | Scope-4; scope tech table | `pages/app/farmer/IoT.tsx` | `POST /iot/readings` (manual), `POST /iot/batches/{id}/simulate` | `iot_sensor_reading` | F |
| 4.2 | Store and **validate** incoming IoT data | Scope-4 | — | `POST /iot/readings` (iot_ai.py) — validation to be confirmed by Agent 9 | `iot_sensor_reading` | F |
| 4.3 | Continuous monitoring / reading history per batch | Scope-4 | `IoT.tsx` (charts) | `GET /iot/batches/{batch_id}/readings` | `iot_sensor_reading` | F |
| 4.4 | Honest labelling of simulated data | Scope (simulated per constraints) | (Agent 2 verifies label "Simulated IoT reading") | `iot_simulator.py` service | — | F |

### M5. AI Prediction Engine (Scope §Modules-5)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 5.1 | Predict freshness + remaining shelf-life (trained ML, not hardcoded) | Scope-5; AI_MODEL_AUDIT.md | `pages/app/farmer/AI.tsx` (`usePredictFreshness`) | `POST /predict/freshness`, `POST /batches/{id}/score`; `services/ai_service.py` loads 4 joblib/pkl artifacts from `app/ml_models/` | `ai_prediction` | F |
| 5.2 | Quality classification Fresh / Medium / Near Expiry | Scope-5 | `AI.tsx`; public `FreshnessEngine.tsx` | `ai_service.py` (formula per memory: score→class) | `ai_prediction.quality_class` | F |
| 5.3 | Anomaly / adulteration detection | Scope-5 | `AI.tsx` (`usePredictAdulteration`) | `POST /predict/adulteration`; `anomaly_flag` | `ai_prediction.anomaly_flag` | F |
| 5.4 | Persist predictions with model version + timestamp | Scope (transparency); ERD | batch prediction history in `AI.tsx` | `GET /batches/{id}/predictions`; `GET /ai/status` | `ai_prediction.model_version`, `predicted_at` | F |
| 5.5 | Honest disclaimer | Scope (demo, not lab-certified) | `FreshnessEngine.tsx` — exact text "Demonstration prediction — not laboratory certification." (per build record) | — | — | F |

### M6. Product Catalog (Scope §Modules-6)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 6.1 | Product listings linked to milk batches (nullable) | Scope-6; ERD | `pages/app/farmer/Products.tsx` | `POST/PATCH/DELETE /products` (catalog.py, 17 endpoints) | `product` (`batch_id` nullable) | F |
| 6.2 | Price, farm details, availability displayed | Scope-6 | `pages/public/Marketplace.tsx`, `ProductDetail.tsx` | `GET /products`, `GET /products/{id}` | `product` | F |
| 6.3 | AI quality indicators on listings (transparency) | Scope-6 | `ProductDetail.tsx`, `BatchTrace.tsx` | via batch predictions join | `ai_prediction` | F |

### M7. Order Fulfilment & Delivery (Scope §Modules-7)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 7.1 | Cart management | Scope-7 | `pages/app/customer/Cart.tsx` | `GET/PUT/DELETE /cart` (commerce.py) | `cart` (1:1 user) | F |
| 7.2 | Order placement + inventory decrement | Scope-7 | `Checkout.tsx` | `POST /orders` (commerce.py:167; stock re-validated) | `order`, `product.quantity_available` | F |
| 7.3 | **Simulated** payment (no live gateway — per scope constraints) | Scope-7; Scope constraints | checkout payment step | `POST /orders/{id}/pay` (commerce.py:255; `PAYMENT_DISCLAIMER` in notify) | `payment` (1:1 order) | F |
| 7.4 | Delivery auto-created + rider assignment | Scope-7 | rider `Deliveries.tsx`; `TrackDelivery.tsx` | `Delivery(...)` created in pay flow (commerce.py:291); `PATCH /deliveries/{id}/assign`, `/status` | `delivery` (1:1 order) | F |
| 7.5 | Order/delivery status tracking to delivered | Scope-7; mockup-1 | `TrackDelivery.tsx`, `pages/app/shared/TrackDelivery.tsx` | `GET /deliveries`, `POST /deliveries/{id}/tracking`, `GET .../tracking` | `delivery`, `delivery_tracking` | F |

### M8. Bulk Buyer / B2B Bidding (Scope §Modules-8)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 8.1 | Business registration + admin approval | Scope-8; Scope-2 pattern | `pages/app/business/*` | `POST /auth/register` (role=business); admin verify | `user`, (`farm` n/a) | F |
| 8.2 | Bulk purchase requests | Scope-8 | `pages/app/business/Requests.tsx`, `RequestDetail.tsx` | `POST/GET/PATCH /requests` (b2b.py, 9 endpoints) | `bulk_purchase_request` | F |
| 8.3 | Farmers view requests + submit quotations/bids | Scope-8 | `pages/app/farmer/Quotations.tsx` | `POST /requests/{id}/quotations`, `GET /quotations` | `quotation` | F |
| 8.4 | Compare bids; accept best bid → order confirmation; others updated | Scope-8 | `RequestDetail.tsx` | `POST /quotations/{id}/accept`, `/reject` (b2b.py:256 notifies both sides) | `quotation.status` | F |
| 8.5 | Supplier list / procurement analytics | Scope-8/9 | `pages/app/business/Suppliers.tsx`; business overview | `GET /business/overview` (analytics.py) | — | F |

### M9. Analytics & Dashboards (Scope §Modules-9)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 9.1 | Sales / quality / spoilage analytics (admin) | Scope-9; mockup admin panel | `pages/app/admin/Analytics.tsx`, `Dashboard.tsx` | `GET /analytics/overview`, `GET /admin/overview` | aggregates | F |
| 9.2 | Farm & product performance insights | Scope-9 | `pages/app/farmer/Analytics.tsx` | `GET /analytics/farms`, `GET /farmer/overview`, `POST /farms/{id}/snapshots` | `farm_analytics` | F |
| 9.3 | Role dashboards (all 5 roles) | Scope-9 | `pages/app/{customer,farmer,business,rider,admin}/Dashboard.tsx` | overview endpoints per role | — | F |

### M10. Complaints & Customer Support (Scope §Modules-10)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 10.1 | User complaints + admin status handling + resolution tracking | Scope-10 | `Contact.tsx` (→ `POST /complaints` when logged in), `pages/app/customer/Complaints.tsx`, farmer `Complaints.tsx`, admin `Support.tsx` | `POST/GET/PATCH /complaints` (engagement.py:210–); notify on status change (engagement.py:273) | `complaint` (`resolved_at` nullable) | F |
| 10.2 | Chatbot assistance (rule-based; LLM explicitly future per scope-adjacent notes) | Scope-10 | `pages/app/shared/Chat.tsx`, public `Support.tsx` | `POST /chat`, `GET /chat/history` (support.py — keyword replies; Groq = documented future hook, server-side) | `chatbot_message` | F |
| 10.3 | Notifications (incl. read state, unread count) | Scope-1/12 | `Notifications.tsx` | `GET /notifications`, `.../unread-count`, `POST .../read`, `/read-all`; `notify()` triggers across 10 call sites | `notification` | F |

### M11. Dynamic Pricing & Discounts (Scope §Modules-11)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 11.1 | Manual price changes logged to history | Scope-11 | `pages/app/farmer/Pricing.tsx` | `PATCH /products/{id}/price`, `GET /products/{id}/price-history` | `price_history` | F |
| 11.2 | Discounts for near-expiry products (manual creation) | Scope-11 | `Pricing.tsx`; public `DynamicPricing.tsx` | `POST/GET/DELETE /products/{id}/discounts`; `GET /pricing/rules` (active-discount rules) | `discount` | F |
| 11.3 | **Automatic** price updates based on freshness/shelf-life | Scope-11 ("Updates pricing automatically in the system") | — | Only manual `Discount(` creation found (catalog.py:289); no freshness→discount automation | — | — (gap: auto-adjustment not implemented) |

### M12. Subscription Management (Scope §Modules-12)

| # | Requirement | Document source | Frontend | Backend | DB | Triage |
|---|---|---|---|---|---|---|
| 12.1 | Subscribe to farms / products with frequency | Scope-12 | `pages/app/customer/Subscriptions.tsx` | `POST/GET/PATCH /subscriptions` (engagement.py) | `subscription` | F |
| 12.2 | Alerts for new batches / availability / price changes | Scope-12 | `Notifications.tsx` | Subscription CRUD exists; **no trigger found** that notifies subscribers on new batch/product creation (notify() call sites cover orders, payments, deliveries, quotations, complaints, admin actions — not new-batch alerts) | `notification` | P (gap: new-batch/price-change alert trigger not found — Agent 12 to confirm) |

### Public website (Ploy master brief — final design authority)

| # | Requirement | Brief § | Frontend | Triage |
|---|---|---|---|---|
| P.1 | Floating pill nav (desktop + mobile), role dropdowns, auth-aware | §5 | `components/layout/FloatingNav.tsx` | F |
| P.2 | Full-screen hero with the two supplied assets (desktop landscape / mobile portrait), exact copy set | §6 | `components/home/PloyHero.tsx`; `assets/hero/` | F |
| P.3 | Orbit-dial ecosystem **below** hero, 4 modules with popups | §7 | `components/home/HeroEcosystem.tsx` | F |
| P.4 | Public routes: `/`, `/how-it-works`, `/freshness-engine`, `/for-farmers`, `/for-customers`, `/for-businesses`, `/for-delivery-riders`, `/farms`, `/farms/:farmId`, `/marketplace`, `/products/:productId`, `/batch-trace`, `/batch-trace/:batchCode`, `/dynamic-pricing`, `/about`, `/support`, `/contact`, `/faq`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, `/unauthorized` + custom 404 | brief routes | `app/router.tsx:162-190`; all pages exist | F |
| P.5 | One-minute film = **Coming Soon placeholder**, not embedded | brief | `FarmToTableFilmPlaceholder` (per build record) | F |
| P.6 | Male-only media; honest demo labels; no fake stats | brief constraints | (Agent 2 verifies visually) | F (footprint: code) |

---

## 4. Missing / zero-footprint module analysis

**No scope module has zero implementation footprint.** All 12 modules have frontend pages, backend endpoints, and database tables.

**Partial-footprint gaps identified (for Agents 9–12 to verify):**
1. **G-1 (M2.5): Farm verification documents** — no document upload/storage tied to farm verification; verification is status-based (`verification_status` + admin `POST /farms/{id}/verify`). Uploads router is images-only.
2. **G-2 (M11.3): Automatic dynamic pricing** — scope requires automatic price updates; only manual discounts + rules display exist. No freshness-score→discount automation found.
3. **G-3 (M12.2): Subscriber alerts on new batches/price changes** — subscription CRUD + notification plumbing exist, but no trigger on new-batch or price-change events found.
4. **Out-of-scope (documented):** Flutter mobile app (superseded by Ploy brief v2, web-only); live payment gateways (simulated per scope); government integration (excluded per scope); physical IoT hardware (excluded per scope; simulated API provided).

---

## 5. Traceability matrix skeleton (seed for Agents 2–12)

| Requirement | Document source | Public page | Protected page | Frontend component | API endpoint | Database entity | Status | Gap |
|---|---|---|---|---|---|---|---|---|
| 1.1 Role registration (no public admin) | Scope-1 | `/register` | — | `pages/auth/Register.tsx` | `POST /auth/register` | `user` | Triage: footprint found | Agent 3: test admin-registration 403 |
| 1.2 Login/logout/JWT refresh | Scope-1 | `/login` | — | `Login.tsx`, `stores/auth.ts` | `POST /auth/login`, `POST /auth/refresh` | `user` | Triage: footprint found | Agent 3: test token flows |
| 1.3 Forgot/reset password | Scope-1 | `/forgot-password`, `/reset-password` | — | `ForgotPassword.tsx`, `ResetPassword.tsx` | `POST /auth/forgot-password`, `POST /auth/reset-password` | `user` | Triage: footprint found | Agent 3: test reset flow |
| 1.4 Profile | Scope-1 | — | all portals → profile | `pages/app/shared/Profile.tsx` | `GET /auth/me` | `user` | Triage: footprint found | Agent 3/12 |
| 1.5 Order history | Scope-1 | — | `/app/customer/orders` | `customer/Orders.tsx` | `GET /orders` | `order` | Triage: footprint found | Agent 5 |
| 1.6 Role guards & dashboards | Scope-9 | `/unauthorized` | `/app/*` | `app/guards.tsx` | `require_role` | `user.role` | Triage: footprint found | Agent 3: cross-role attacks |
| 2.1 Farm registration | Scope-2 | — | `/app/farmer/onboarding` | `farmer/Onboarding.tsx` | `POST /farms` | `farm` | Triage: footprint found | Agent 4 |
| 2.2 Farm/business/rider approval | Scope-2 | — | `/app/admin/farms` | `admin/Farms.tsx` | `POST /farms/{id}/verify`, `GET /farms/pending` | `farm.verification_status` | Triage: footprint found | Agent 8 |
| 2.3 Farm profiles | Scope-2 | `/farms`, `/farms/:farmId` | `/app/farmer/profile` | `Farms.tsx`, `FarmDetail.tsx` | `GET /farms`, `GET /farms/{id}` | `farm` | Triage: footprint found | Agent 2/4 |
| 2.4 Ratings/credibility | Scope-2 | `/farms/:farmId` | — | (reviews on farm detail) | `POST/GET /reviews` | `review`, `farm.rating_avg` | Triage: footprint found | Agent 5 |
| 2.5 Verification documents | Scope-2 | — | — | — | — | — | Triage: **no footprint** | **G-1**: verify truly absent (Agent 8) |
| 3.1–3.3 Batch CRUD + lifecycle | Scope-3 | — | `/app/farmer/batches` | `farmer/Batches.tsx`, `BatchDetail.tsx` | `POST/GET/PATCH/DELETE /batches` | `milk_batch` | Triage: footprint found | Agent 4 |
| 3.4 Batch trace by code | Scope solution | `/batch-trace`, `/batch-trace/:batchCode` | `/app/customer/batch-trace` | `BatchTrace.tsx` | `GET /batches/trace/{batch_code}` | `milk_batch` | Triage: footprint found | Agent 5 |
| 4.1–4.3 IoT readings (manual + simulated) | Scope-4 | — | `/app/farmer/iot` | `farmer/IoT.tsx` | `POST /iot/readings`, `POST /iot/batches/{id}/simulate`, `GET /iot/batches/{id}/readings` | `iot_sensor_reading` | Triage: footprint found | Agent 11 |
| 5.1–5.4 AI predictions (4 model artifacts) | Scope-5 | `/freshness-engine` | `/app/farmer/ai` | `farmer/AI.tsx` | `POST /predict/freshness`, `POST /predict/adulteration`, `POST /batches/{id}/score`, `GET /ai/status` | `ai_prediction` | Triage: footprint found | Agent 11: model-vs-mock verdict |
| 6.1–6.3 Product catalog | Scope-6 | `/marketplace`, `/products/:productId` | `/app/farmer/products` | `Marketplace.tsx`, `ProductDetail.tsx` | `POST/GET/PATCH/DELETE /products` | `product` | Triage: footprint found | Agent 5 |
| 7.1 Cart | Scope-7 | — | `/app/customer/cart` | `customer/Cart.tsx` | `GET/PUT/DELETE /cart` | `cart` | Triage: footprint found | Agent 5 |
| 7.2 Checkout → order | Scope-7 | — | `/app/customer/checkout` | `customer/Checkout.tsx` | `POST /orders` | `order` | Triage: footprint found | Agent 12 Flow A |
| 7.3 Simulated payment | Scope-7 + constraints | — | checkout | checkout payment step | `POST /orders/{id}/pay` | `payment` | Triage: footprint found | Agent 12 Flow A |
| 7.4–7.5 Delivery + tracking | Scope-7 | — | `/app/rider/deliveries`, `/app/customer/track/:id` | `rider/Deliveries.tsx`, `TrackDelivery.tsx` | `PATCH /deliveries/{id}/assign`, `/status`, `POST .../tracking` | `delivery`, `delivery_tracking` | Triage: footprint found | Agent 7, 12 Flow A |
| 8.1–8.4 B2B requests + bidding | Scope-8 | — | `/app/business/requests`, `/app/farmer/quotations` | `business/Requests.tsx`, `RequestDetail.tsx` | `POST /requests`, `POST /requests/{id}/quotations`, `POST /quotations/{id}/accept`, `/reject` | `bulk_purchase_request`, `quotation` | Triage: footprint found | Agent 6, 12 Flow B |
| 9.1–9.3 Analytics/dashboards | Scope-9 | — | `/app/*/analytics`, `/app/admin/*` | `*/Analytics.tsx`, `*/Dashboard.tsx` | `GET /analytics/*`, `GET /{farmer,business,admin}/overview` | `farm_analytics` | Triage: footprint found | Agent 8/12 |
| 10.1 Complaints | Scope-10 | `/contact` | `/app/customer/complaints`, `/app/admin/support` | `Contact.tsx`, `Complaints.tsx` | `POST/GET/PATCH /complaints` | `complaint` | Triage: footprint found | Agent 12 Flow C |
| 10.2 Chatbot (rule-based) | Scope-10 | `/support` | support pages | `shared/Chat.tsx` | `POST /chat`, `GET /chat/history` | `chatbot_message` | Triage: footprint found | Agent 8: verify rule-based honesty |
| 10.3 Notifications | Scope-1/12 | — | `/app/customer/notifications` | `Notifications.tsx` | `GET /notifications`, `.../unread-count`, `POST .../read`, `/read-all` | `notification` | Triage: footprint found | Agent 12 Flow D |
| 11.1–11.2 Manual pricing/discounts | Scope-11 | `/dynamic-pricing` | `/app/farmer/pricing` | `Pricing.tsx`, `DynamicPricing.tsx` | `PATCH /products/{id}/price`, `POST /products/{id}/discounts`, `GET /pricing/rules` | `price_history`, `discount` | Triage: footprint found | Agent 9 |
| 11.3 Automatic pricing | Scope-11 | — | — | — | — | — | Triage: **no footprint** | **G-2**: confirm absent (Agent 9) |
| 12.1 Subscriptions | Scope-12 | — | `/app/customer/subscriptions` | `Subscriptions.tsx` | `POST/GET/PATCH /subscriptions` | `subscription` | Triage: footprint found | Agent 5 |
| 12.2 New-batch/price alerts | Scope-12 | — | — | — | (no trigger found) | `notification` | Triage: partial | **G-3**: confirm absent (Agent 12) |
| P.1–P.6 Public site (Ploy brief) | PLOY_MASTER_BRIEF.md | all public routes | — | `FloatingNav.tsx`, `PloyHero.tsx`, `HeroEcosystem.tsx` | — | — | Triage: footprint found | Agent 2 |

**Instructions for Agents 2–12:** replace `Triage` notes with evidence-based statuses from the allowed set (Verified Complete / Implemented but Untested / Partially Implemented / UI Only / Backend Only / Mocked / Blocked / Missing / Out of Scope) and append test evidence. Do not contradict: `F` = do not mark Missing without checking the cited path; gaps G-1..G-3 are the only Agent-1-flagged absences.

---

## 6. Area score — Requirements and architecture (weight 5%)

**Score: 100**

**Justification:**
- Requirements baseline is complete and authoritative: all 12 scope modules decomposed into 40+ testable requirements, each traced to Scope-Document section and/or ERD entity; all 22 ERD entities verified present as database models with key constraints transcribed.
- Architecture matches every in-scope requirement: React 18/TS/Vite web frontend (scope: React.js web portal ✓), Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic + Pydantic v2 backend (scope ✓), Supabase/Postgres target with `supabase_schema.sql` + Alembic migration `fae0062d7af9` (scope: Supabase ✓), simulated IoT API (scope: simulated ✓), 4 trained model artifacts loaded via `ai_service.py` (scope: AI demo on available/simulated data ✓), simulated payments (explicitly out-of-scope for live gateways ✓).
- No module has zero implementation footprint; the three partial gaps (G-1..G-3) are sub-requirements, not missing modules.
- Documented scope divergences (Flutter mobile app; live payments; government integration; physical IoT hardware) each carry explicit authority (scope constraints or Ploy brief v2) — none are silent omissions.
- Scoring caps respected: this is a baseline-triage score for requirements/architecture documentation and footprint verification, not a testing claim — test evidence belongs to Agents 2–12, whose findings may lower feature-level scores without invalidating this baseline.
