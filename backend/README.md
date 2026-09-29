# ApnaDairy backend

FastAPI REST API for the ApnaDairy dairy operations platform. API routes are under `/api/v1`, with `/health` and `/api/v1/health` available for checks. JSON uses camelCase aliases.

## Recommended local start

Use `run.ps1` (Windows) or `run.sh` (Bash) from the repository root. The launcher creates the environment, installs dependencies, applies local migrations, builds the frontend, and starts the combined app.

For backend-only development on Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, replace `.venv\Scripts\python.exe` and `alembic.exe` with `.venv/bin/python` and `.venv/bin/alembic`.

Run tests from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

The default database is the local `data/apnadairy.db` SQLite file. API docs are at http://localhost:8000/docs.

## Optional seed

The seed requires explicit Admin and/or Super Admin credentials and creates repeatable, realistic Pakistani demo data across farms, batches, products, orders, payments, deliveries, B2B, governance, IoT and AI records.

```powershell
$env:ADMIN_EMAIL = "you@example.com"
$env:ADMIN_PASSWORD = "choose-a-strong-password"
$env:SUPERADMIN_EMAIL = "superadmin@example.com"
$env:SUPERADMIN_PASSWORD = "choose-another-strong-password"
.\.venv\Scripts\python.exe -m app.seed
```

Admin and Super Admin registration through the public API is rejected. Customer, farmer, business, and rider accounts can use the public registration flow; rider access remains subject to approval.

## Supabase/PostgreSQL

1. Copy `.env.supabase.example` to `.env` (or copy `.env.example` and edit it).
2. Put the SQLAlchemy PostgreSQL URI in `DATABASE_URL` and set a strong `JWT_SECRET`.
3. Apply `supabase_schema.sql` in the Supabase SQL Editor.
4. Start the application from the repository root.

The launchers do not automatically modify an external PostgreSQL schema. Live seed data is opt-in via `APNADAIRY_SEED_LIVE=1`. Do not commit `.env` or expose credentials in source, screenshots, logs, or chat.

## Main folders

```text
app/models/          SQLAlchemy models
app/schemas/         Pydantic request/response models
app/routers/         API endpoints
app/auth/            authentication and authorization helpers
app/services/        AI and simulated IoT services
alembic/versions/    schema migrations
tests/               backend test suite
```

Periodic IoT readings are simulated and stored per eligible milk batch. AI output is for demonstration and is not laboratory certification. A chatbot provider key is optional and remains server-side.
