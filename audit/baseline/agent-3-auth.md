# Agent 3 — Authentication & Security Audit (Baseline, Read-Only)

**Date:** 2026-09-27 · **Auditor role:** Agent 3 (Auth & Security)
**Backend:** http://127.0.0.1:8000/api/v1 (running) · **Frontend:** http://127.0.0.1:4173 (vite preview)
**Code:** `~/workspace/apnadairy/backend/app` (routers/auth.py, auth/deps.py, auth/security.py, config.py)
**Constraints honored:** no source edits, no Supabase touch, no secrets printed. Test accounts use `audit3+*@test.pk` in the local dev SQLite DB only.

---

## 1. Test table

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| R1 | Register customer | POST /auth/register role=customer | 201 + tokens | 201, accessToken+refreshToken+user | PASS |
| R2 | Register farmer | POST /auth/register role=farmer | 201 | 201 | PASS |
| R3 | Register business | POST /auth/register role=business | 201 | 201 | PASS |
| R4 | Register rider | POST /auth/register role=rider | 201 | 201 | PASS |
| R5 | Duplicate email | Re-register R1 email | 409 | 409 "already exists" | PASS |
| R6 | Invalid role | role=superuser | 400 | 400 "Role must be one of…" | PASS |
| R7 | role=admin rejected | role=admin | 403 | 403 "cannot be created via public registration" | PASS |
| R8 | Password mismatch | confirm_password differs | 400 | 400 | PASS |
| R9 | Invalid email | email=not-an-email | 400 | 400 | PASS |
| L1 | Valid login | correct email+password | 200 + tokens | 200 | PASS |
| L2 | Wrong password | bad password | 401 | 401 "Incorrect email or password." | PASS |
| L3 | Unknown email | nobody-xyz@test.pk | 401 (no enumeration) | 401, same message as L2 | PASS |
| J1 | JWT payload shape | decode access token | sub, role, type=access, exp, iat | claims present, HS256 | PASS |
| J2 | Access-token expiry | exp − iat | ≈30 min | 1800 s exactly | PASS |
| J3 | Role claim | payload.role | customer | customer | PASS |
| M1 | /auth/me valid token | GET with Bearer | 200 correct user | 200, correct email+role | PASS |
| M2 | /auth/me missing token | no header | 401 | 401 "Not authenticated" | PASS |
| M3 | /auth/me malformed | Bearer garbage.token.here | 401 | 401 | PASS |
| M4 | /auth/me forged signature | tampered signature | 401 | 401 | PASS |
| M5 | /auth/me with refresh token | wrong token type | 401 | 401 "Invalid token type" | PASS |
| F1 | Refresh valid | POST /auth/refresh | 200 new pair | 200 | PASS |
| F2 | Refresh garbage | bad token | 401 | 401 | PASS |
| F3 | Refresh with access token | wrong type | 401 | 401 | PASS |
| P1 | Forgot-password existing | POST known email | 200 generic message | 200 | PASS |
| P2 | Forgot-password unknown | POST unknown email | 200, identical message (no enumeration) | 200, identical message | PASS |
| P3 | Reset garbage token | POST /auth/reset-password | 400 | 400 | PASS |
| P4 | Full reset flow | forgot (demo token) → reset → login new pw | 200 at each step | 200/200/200 | PASS |
| P5 | Old password dead | login with pre-reset password | 401 | 401 | PASS |
| X1 | Customer → GET /admin/users | customer Bearer | 403 | 403 "Requires role: admin" | PASS |
| X2 | Customer → POST /batches | farmer-only endpoint | 403 | 403 | PASS |
| X3 | Customer → POST /farms | farmer-only endpoint | 403 | 403 | PASS |
| X4 | Customer → PATCH /admin/users/1/status | admin-only mutation | 403 | 403 | PASS |
| X5 | Farmer → GET /admin/users | cross-role | 403 | 403 | PASS |
| X6 | Business → GET /admin/action-logs | cross-role | 403 | 403 | PASS |
| X7 | Rider → GET /admin/analytics/overview | cross-role | 403 | 403 | PASS |
| X8 | Farmer → POST /farms (positive control) | farmer Bearer, valid body | 201 | 201, verificationStatus=pending | PASS |
| U1 | No token → /auth/me | — | 401 | 401 | PASS |
| U2 | No token → POST /batches | — | 401 | 401 | PASS |
| U3 | No token → /admin/users | — | 401 | 401 | PASS |
| U4 | No token → /complaints | — | 401 | 401 | PASS |
| O1 | Customer A creates complaint | POST /complaints | 201 | 201 | PASS |
| O2 | Customer B reads A's complaint | GET /complaints/{id} as B | 403/404, no data leak | 404 "Complaint not found" | PASS |
| O3 | Customer A reads own complaint | GET /complaints/{id} as A | 200 | 200 | PASS |
| G1–G5 | Unauth → /app/{customer,farmer/batches,business,rider,admin} (Playwright) | direct navigation, no session | redirect /login?next=… | all 5 redirect correctly | PASS |
| G6–G9 | Customer session → /app/{admin,farmer,business,rider} (Playwright, injected session) | logged in as customer | /unauthorized | all 4 → /unauthorized | PASS |
| G10 | Customer session → /app/customer | own portal | allowed | 200, dashboard renders | PASS |

**Totals: 48 run, 48 pass, 0 fail** (two early script errors were test-harness bugs — wrong JSON key casing and wrong farm field names — re-run correctly and passing).

---

## 2. Vulnerability / issue list

| ID | Priority | Module | Finding | Evidence | Suggested fix | Status |
|----|----------|--------|---------|----------|---------------|--------|
| SEC-01 | **P2** | Config / CORS | `CORS_ORIGINS` defaults to `:5173` only; the dev/preview frontend on `:4173` is **blocked** — verified in Firefox: `POST /auth/login` XHR fails with Cross-Origin Request Blocked, so browser login is impossible in this setup. Production domain also not yet added. | `config.py` allowlist; Playwright REQFAIL + console "Cross-Origin Request Blocked" | Add preview/prod origins via `CORS_ORIGINS` env (documented in `.env.example`); set real domain at deploy | Open (config, not code) |
| SEC-02 | P3 | Auth / tokens | Access and refresh JWTs carry **no `jti` claim**; there is no token blacklist. Logout is client-side only — a stolen token stays valid until expiry (30 min access / 7 d refresh). | Decoded payload keys: sub, role, type, exp, iat | Add `jti` + server-side denylist or shorten refresh lifetime; acceptable for FYP, required for production | Open |
| SEC-03 | P3 (info) | Config / deploy | `JWT_SECRET` default is a well-known dev string (`dev-only-secret-change-me`); `DEMO_MODE=true` returns password-reset tokens in the forgot-password response. Both are documented as dev-only (`.env.example` instructs generation/rotation), but **must** be changed/disabled in production. | `config.py`, `auth.py` forgot-password branch | Deployment checklist: set strong `JWT_SECRET`, `DEMO_MODE=false`, real `CORS_ORIGINS` | Open (deployment) |

**Positives (no issue):** bcrypt password hashing (passlib); admin accounts only via `app.seed` with env vars (seed refuses to run without them); login gives identical 401 for wrong-password vs unknown-email (no enumeration); forgot-password identical 200 for known/unknown email; token `type` claim enforced (refresh token rejected as access token and vice versa); ownership isolation returns 404 not 403 on foreign records (no existence leak); no hardcoded secrets in `app/` (one grep hit was an env-var read in `seed.py`); `.env.example` documents every required variable.

---

## 3. Area score: **94 / 100**

Justification per the evidence scale (100 = implemented, integrated, successfully tested):
- Registration (all 4 public roles, duplicates, invalid/admin roles): **100** — API-tested, correct statuses.
- Login / logout semantics: **100** — 401 paths tested; logout clears persisted store (code) — not UI-tested due to SEC-01 CORS block, but apiClient clears session on 401.
- JWT handling (shape, HS256, 30-min expiry, type enforcement, forged-token rejection): **100**.
- Password recovery (forgot + reset + no enumeration + old-pw invalidation): **100**.
- Backend authorization (role guards 403, ownership 404, unauthenticated 401): **100** — 13 API attack probes all behaved.
- Frontend route guards (unauth → login, wrong-role → /unauthorized): **100** — 10 Playwright navigations pass.
- Deductions: SEC-01 CORS dev mismatch (−3, breaks real browser→API flows in the current setup), SEC-02 no token revocation (−2), SEC-03 dev-default secret/demo mode (−1, deployment-gated).

**Baseline verdict for Agent 3's area:** authentication and security are functionally complete and correctly enforced server-side; remaining items are configuration/deployment hardening, not missing features.

---

## 4. Notes for the orchestrator
- Test accounts created (dev DB only): `audit3+customer|farmer|business|rider|customerB@test.pk`; one farm ("Audit Farm", pending) and one complaint exist from positive-control tests. Dev backup `apnadairy_dev.db.pre-audit-bak` predates these.
- UI login could not be exercised end-to-end because of SEC-01 (CORS); guard tests that needed a session injected it via localStorage instead — the /unauthorized and /login?next= behaviors themselves are verified.
- Full raw results: `/tmp/agent3_tests.py`, `/tmp/agent3_tests2.py`, `/tmp/agent3_results.json`, `/tmp/agent3_results2.json`.
