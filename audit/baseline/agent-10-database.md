# Agent 10 — Database & Migration Audit (baseline)

**Date:** 2026-09-27 · **Auditor:** Agent 10 (subagent)
**Scope:** `~/workspace/apnadairy/backend` — `app/models/`, `alembic/`, `supabase_schema.sql`, `app/seed.py`
**Method:** read-only on the dev DB (never touched); all destructive tests ran on a scratch SQLite DB at `/tmp/scratch_agent10.db`.

---

## 1. Entity vs ERD — all 22 present

| # | ERD entity | Model class | Table | In models | In migration | Constraints OK | Gaps |
|---|---|---|---|---|---|---|---|
| 1 | User | `User` | `"user"` | ✅ | ✅ | ✅ PK `user_id`; unique `email` (unique index), unique `phone`; indexed `role` | none |
| 2 | Farm | `Farm` | `farm` | ✅ | ✅ | ✅ PK `farm_id`; FK `user_id→user` **UNIQUE** (one-to-one User–Farm enforced); indexed `verification_status` | none |
| 3 | Milk Batch | `MilkBatch` | `milk_batch` | ✅ | ✅ | ✅ PK `batch_id`; unique `batch_code`; FK `farm_id→farm` | none |
| 4 | IoT Sensor Reading | `IoTSensorReading` | `iot_sensor_reading` | ✅ | ✅ | ✅ PK `reading_id`; FK `batch_id→milk_batch`; indexed `sensor_type`, `recorded_at` | none |
| 5 | AI Prediction | `AIPrediction` | `ai_prediction` | ✅ | ✅ | ✅ PK `prediction_id`; FK `batch_id→milk_batch`; outputs nullable as designed | none |
| 6 | Product | `Product` | `product` | ✅ | ✅ | ✅ PK `product_id`; FK `farm_id→farm`; **`batch_id` nullable** per ERD; indexed `name`, `category` | none |
| 7 | Price History | `PriceHistory` | `price_history` | ✅ | ✅ | ✅ PK `history_id`; FK `product_id→product` | none |
| 8 | Discount | `Discount` | `discount` | ✅ | ✅ | ✅ PK `discount_id`; FK `product_id→product` | none |
| 9 | Cart | `Cart` | `cart` | ✅ | ✅ | ✅ PK `cart_id`; FK `user_id→user` **UNIQUE** (one-to-one User–Cart enforced) | none |
| 10 | Order | `Order` | `"order"` | ✅ | ✅ | ✅ PK `order_id`; FK `user_id→user`; indexed `status` | none |
| 11 | Payment | `Payment` | `payment` | ✅ | ✅ | ✅ PK `payment_id`; FK `order_id→order` **UNIQUE** (one-to-one Payment–Order enforced); unique `transaction_ref` | none |
| 12 | Delivery | `Delivery` | `delivery` | ✅ | ✅ | ✅ PK `delivery_id`; FK `order_id→order` **UNIQUE** (one-to-one Delivery–Order enforced); nullable `delivery_person_id→user`; indexed `status` | none |
| 13 | Delivery Tracking | `DeliveryTracking` | `delivery_tracking` | ✅ | ✅ | ✅ PK `tracking_id`; FK `delivery_id→delivery` | none |
| 14 | Bulk Purchase Request | `BulkPurchaseRequest` | `bulk_purchase_request` | ✅ | ✅ | ✅ PK `request_id`; FKs `buyer_id→user`, `product_id→product`; indexed `status` | none |
| 15 | Quotation | `Quotation` | `quotation` | ✅ | ✅ | ✅ PK `quotation_id`; FKs `request_id→bulk_purchase_request`, `farm_id→farm`; indexed `status` | none |
| 16 | Subscription | `Subscription` | `subscription` | ✅ | ✅ | ✅ PK `subscription_id`; FKs `user_id→user`, `farm_id→farm`, nullable `product_id→product`; indexed `status` | none |
| 17 | Review | `Review` | `review` | ✅ | ✅ | ✅ PK `review_id`; FK `user_id→user`; **both `farm_id` and `product_id` nullable** (farm, product, or both) per ERD | none |
| 18 | Notification | `Notification` | `notification` | ✅ | ✅ | ✅ PK `notification_id`; FK `user_id→user` | none |
| 19 | Complaint | `Complaint` | `complaint` | ✅ | ✅ | ✅ PK `complaint_id`; FK `user_id→user`; **`order_id` nullable** (optional order ref) per ERD; indexed `status` | none |
| 20 | Chatbot Message | `ChatbotMessage` | `chatbot_message` | ✅ | ✅ | ✅ PK `message_id`; nullable `user_id→user`; indexed `session_id` | none |
| 21 | Farm Analytics | `FarmAnalytics` | `farm_analytics` | ✅ | ✅ | ✅ PK `analytics_id`; FK `farm_id→farm` | none |
| 22 | Admin Action Log | `AdminActionLog` | `admin_action_log` | ✅ | ✅ | ✅ PK `log_id`; FK `admin_id→user` (admin user ref) per ERD; indexed `action` | none |

**Extra tables:** none. **Missing tables:** none.

---

## 2. Constraint verification (functional tests on scratch DB)

All tests inserted real rows and attempted violations with `PRAGMA foreign_keys=ON`:

| Test | Result |
|---|---|
| Duplicate `farm.user_id` (1–1 User–Farm) | ✅ rejected (unique index `ix_farm_user_id`) |
| Duplicate `cart.user_id` (1–1 User–Cart) | ✅ rejected (unique index `ix_cart_user_id`) |
| Duplicate `payment.order_id` (1–1 Payment–Order) | ✅ rejected (unique index `ix_payment_order_id`) |
| Duplicate `delivery.order_id` (1–1 Delivery–Order) | ✅ rejected (unique index `ix_delivery_order_id`) |
| Duplicate `milk_batch.batch_code` | ✅ rejected |
| Duplicate `user.email` / `user.phone` | ✅ rejected |
| FK violation (`farm.user_id = 999`) | ✅ rejected |
| Invalid enum `user.role = 'superuser'` | ⚠️ **accepted by SQLite** — see P2-1 |

**Delete behavior:** no `ondelete` on FKs → DB-level RESTRICT (safe; no silent cascading deletes via raw SQL). ORM cascades (`delete-orphan`) exist only for strictly-owned children (IoT readings, AI predictions, price history, discounts, payment, delivery, tracking updates, quotations). Deleting a User/Farm with dependents raises `IntegrityError` rather than losing data — safe.

**Timestamps:** every table has `created_at` (or `sent_at`/`predicted_at`/`submitted_at`/`recorded_at`/`timestamp`/`changed_at` as appropriate) with `server_default=func.now()`; `cart.updated_at` has `onupdate=func.now()`. ✅

**Indexes:** 45 indexes in the migration, all on hot paths (FKs, statuses, emails, batch codes, session ids). ✅

---

## 3. Migration test (clean scratch DB)

| Check | Result |
|---|---|
| `alembic upgrade head` on empty SQLite DB | ✅ success, exit 0 |
| Tables created | ✅ 22/22, zero missing, zero extra |
| `alembic_version` | ✅ `fae0062d7af9` (single head) |
| Column-level agreement (name + nullability, model vs scratch) | ✅ no mismatches across all 22 tables |
| PK agreement | ✅ 22/22 |
| `alembic heads` | ✅ single head `fae0062d7af9`, no duplicates/branches |
| `alembic history` | ✅ linear: `<base> -> fae0062d7af9` |
| `downgrade()` present | ✅ yes |
| downgrade→upgrade round-trip on scratch | ✅ 23 tables restored (22 + `alembic_version`), version back at head |

---

## 4. `supabase_schema.sql` vs migration

| Check | Result |
|---|---|
| Tables (22 + `alembic_version`) | ✅ all present (`"order"`/`"user"` correctly quoted as reserved words) |
| Indexes | ✅ 45/45 match the migration, including the four one-to-one unique indexes (`ix_farm_user_id`, `ix_cart_user_id`, `ix_payment_order_id`, `ix_delivery_order_id`) |
| `alembic_version` insert | ✅ `INSERT INTO alembic_version (version_num) VALUES ('fae0062d7af9') ON CONFLICT (version_num) DO NOTHING;` — rerun-safe |
| CHECK constraints | ⚠️ none (matches migration; see P2-1) |

Note: the file is generated via `alembic upgrade head --sql` offline mode (per `alembic/env.py`); per project history the user already applied it successfully in the Supabase SQL Editor, which is the Postgres-compatibility evidence (direct PG TCP from this VM is blocked).

---

## 5. Seed / demo data & secrets

| Check | Result |
|---|---|
| `app/seed.py` admin credentials | ✅ **env vars only** (`ADMIN_EMAIL`, `ADMIN_PASSWORD`); hard exit if unset; no hardcoded defaults |
| Demo accounts (`demo.farmer@apnadairy.local`, `demo.customer@apnadairy.local`) | ✅ hashed passwords, clearly labelled "Demo", idempotent (reuses existing rows) |
| `.env.example` | ✅ complete (DATABASE_URL, JWT_SECRET, ADMIN_*, GROQ_API_KEY, DEMO_MODE, CORS_ORIGINS), placeholders only |
| Committed `.env` | ✅ none |
| Secret scan (`sk-`, `sb_secret*`, JWT-like tokens, hardcoded passwords in `app/`, `alembic/`) | ✅ clean |
| Demo passwords in seed (`DemoFarmer123` etc.) | ⚠️ P3 — demo-only, hashed, `.local` domain; acceptable for local dev, must never run against prod |

---

## 6. Issue list

### P2-1 — No DB-level CHECK constraints on enum/status columns (Medium)
- **Module:** Database / models
- **Cause:** `app/models/enums.py` docstring claims enums are "stored as VARCHAR with CHECK constraints", but neither the migration nor `supabase_schema.sql` contains any `CheckConstraint`. `Enum(native_enum=False, validate_strings=True)` validates only in Python (SQLAlchemy + Pydantic). Verified: inserting `role='superuser'` via raw SQL on the scratch DB succeeded.
- **Impact:** any write path bypassing the ORM/Pydantic layer (raw SQL, SQL Editor) can store invalid statuses. All current app writes go through the validated layer, so this is not a live functional defect.
- **Fix:** either add `CheckConstraint`s in a new Alembic revision, or correct the docstring to document application-level-only validation.
- **Status:** open (not fixed — requires a new migration revision; flagged for the orchestrator).

### P3-1 — Hardcoded demo passwords in seed script (Low)
- **Module:** `app/seed.py`
- **Detail:** `DemoFarmer123` / `DemoCustomer123` are hardcoded for the `.local` demo accounts. Passwords are hashed via `hash_password`; accounts are unmistakably demo. No production risk as long as the seed never runs against prod.
- **Fix:** optional — read demo passwords from env with the current values as documented dev defaults, and/or guard `app.seed` with `DEMO_MODE=true`.
- **Status:** open, informational.

### Resolved during this audit
- Initial concern that one-to-one uniqueness was missing from the migration DDL was a false alarm: Alembic rendered `unique=True` as **unique indexes** (`ix_farm_user_id`, `ix_cart_user_id`, `ix_payment_order_id`, `ix_delivery_order_id`), and functional duplicate-insert tests confirm enforcement. The earlier `get_unique_constraints` inspection miss was a tooling artifact (SQLite reports these via `get_indexes`), corrected by DDL review + live tests.

**P0: 0 · P1: 0 · P2: 1 · P3: 1**

---

## 7. Area score — Database & Migrations: **95/100**

| Criterion | Evidence | Deduction |
|---|---|---|
| All 22 ERD entities modelled | 22/22 classes, tables, migration coverage | 0 |
| PK/FK/unique/nullability correct | Functional tests: all one-to-one uniques, FKs, duplicate rejection pass | 0 |
| Migration from empty succeeds | `upgrade head` on clean SQLite, single head, round-trip OK | 0 |
| Models ↔ migration ↔ supabase_schema.sql agreement | 22 tables, 45/45 indexes, column+nullability parity | 0 |
| Timestamps, indexes, safe deletes | `server_default=func.now()` everywhere; 45 hot-path indexes; RESTRICT semantics | 0 |
| Seed/env hygiene, no secrets | Env-only admin creds, complete `.env.example`, clean secret scan | 0 |
| Status-field validation | **App-level only; no DB CHECK constraints despite docstring claim** | −5 |

**Justification:** the schema is complete, correct, and migration-safe with strong functional evidence. The sole deduction is the missing DB-level CHECK constraints on status enums (application validation is solid and all tests pass, so this is a hardening gap, not a defect). No P0/P1 issues.
