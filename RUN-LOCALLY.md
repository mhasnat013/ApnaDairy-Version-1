# ApnaDairy — run locally

The default setup is local and does not need Supabase, Docker, or paid services.

## Requirements

- Python 3.11 or newer
- Node.js 18 or newer (npm is included)

## Windows

Open PowerShell in this folder and run:

```powershell
.\setup.ps1
```

The setup command creates the virtual environment, installs Python/npm
dependencies, and builds the frontend. It is a one-time setup command. To
intentionally reinstall dependencies later, run:

```powershell
.\setup.ps1 -ReinstallDependencies
```

After setup, start the project with:

```powershell
.\run.ps1
```

If Windows blocks local scripts for this PowerShell window, use:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\run.ps1
```

## macOS, Linux, WSL, or Git Bash

```bash
./setup.sh
./run.sh
```

Use `./setup.sh --reinstall` only when you intentionally want to reinstall
frontend dependencies.

Open **http://localhost:8000**. FastAPI serves both the web app and the API from this address. API documentation is at **http://localhost:8000/docs**.

The setup command:

1. creates `backend/.venv` when needed;
2. installs the pinned Python and npm dependencies; and
3. builds the React frontend.

The launcher:

1. checks that the environment and `node_modules` already exist;
2. applies Alembic migrations to the default local SQLite database;
3. optionally seeds demo data; and
4. starts FastAPI, without running pip/npm installation.

Use another port with `./run.ps1 -Port 8080` on Windows or `PORT=8080 ./run.sh` in Bash.

## Optional Admin, Super Admin, and demo data

Public registration intentionally has no Admin or Super Admin option. Set either credential pair (or both) before starting to create privileged demo accounts.

PowerShell:

```powershell
$env:ADMIN_EMAIL = "you@example.com"
$env:ADMIN_PASSWORD = "choose-a-strong-password"
$env:SUPERADMIN_EMAIL = "superadmin@example.com"
$env:SUPERADMIN_PASSWORD = "choose-another-strong-password"
.\run.ps1
```

Bash:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-password' SUPERADMIN_EMAIL=superadmin@example.com SUPERADMIN_PASSWORD='choose-another-strong-password' ./run.sh
```

The seed is repeatable and does not duplicate existing demo records. Credentials are read from environment variables and are not written to the project.

## Local data and external services

- Local data is stored in `backend/data/apnadairy.db` by default.
- Simulated IoT readings and demonstration AI predictions are clearly labelled in the API/UI.
- In local demo mode the scheduler processes eligible milk batches every five minutes by default. The intervals are configurable through the `IOT_AI_*` settings in `backend/.env.example`.
- The chatbot gives a not-configured response unless `GROQ_API_KEY` is set.

For Supabase/PostgreSQL, copy `backend/.env.example` to `backend/.env`, set `DATABASE_URL` and a strong `JWT_SECRET`, then apply `backend/supabase_schema.sql` through the Supabase SQL Editor. The launchers deliberately do not alter an external PostgreSQL schema. Live seeding also requires `APNADAIRY_SEED_LIVE=1` as an explicit confirmation.

Never paste database passwords or API keys into source files. If a secret has been shared in chat or committed anywhere, rotate it before use.

## Troubleshooting

- `Python ... is required`: install Python and enable its PATH option.
- `Node.js ... is required`: install the current Node.js LTS release.
- Port in use: select another port as shown above.
- Frontend changes are not visible in the compiled app: run `.\setup.ps1` again, or use `.\run.ps1 -BuildFrontend` for an intentional build without dependency installation.
- Start with a clean local database: stop the server, delete `backend/data/apnadairy.db`, and rerun. This permanently removes local data.
