# ApnaDairy — connected dairy network

ApnaDairy is a final-year project for verified farms, milk-batch operations, cold-chain monitoring, AI freshness estimates, customer ordering, business procurement, delivery workflows, and role-based administration. The Product dropdown and the dedicated "Trace a Batch" pages are intentionally not exposed in the web application.

## Stack

- Backend: Python, FastAPI, SQLAlchemy 2, Alembic, and Pydantic 2
- Database: local SQLite for a zero-configuration demo; PostgreSQL/Supabase supported for deployment
- Frontend: React 18, TypeScript, Vite, and Tailwind CSS
- API contract: [`API_CONTRACT.md`](API_CONTRACT.md)

## Run it

Install dependencies once (or explicitly reinstall them) with:

```powershell
.\setup.ps1
# Reinstall dependencies only when you intentionally request it:
.\setup.ps1 -ReinstallDependencies
```

Then start the server. The start scripts do not run `pip install`, `npm install`,
or `npm ci` on every launch:

On Windows PowerShell:

```powershell
.\run.ps1
```

On macOS, Linux, WSL, or Git Bash:

```bash
./run.sh
```

For macOS/Linux/WSL/Git Bash, install once with `./setup.sh` or intentionally
reinstall frontend dependencies with `./setup.sh --reinstall`.

Use `.\run.ps1 -BuildFrontend` only when you intentionally want to rebuild
the frontend during startup. The default startup path reuses installed
dependencies and the existing build.

Then open http://localhost:8000. The same FastAPI process serves the compiled frontend and the API. See [`RUN-LOCALLY.md`](RUN-LOCALLY.md) for admin seeding, ports, Supabase setup, and troubleshooting.

## Project layout

```text
backend/                 FastAPI application, models, migrations, tests, seed
frontend/                React application and production build
API_CONTRACT.md          Endpoint and schema reference
RUN-LOCALLY.md           Complete local setup instructions
run.ps1 / run.sh         Windows and Bash launchers
```

## Complete file and folder structure

## Complete project documentation

For first-time setup, Supabase connection, portal links, safe credential setup,
frontend/backend responsibilities, and verification commands, see the complete
[project documentation PDF](docs/ApnaDairy-Complete-Project-Documentation.pdf).

The project is separated into a React frontend and a FastAPI backend. Runtime
folders such as `node_modules`, `.venv`, `dist`, `__pycache__`, and local
SQLite files are ignored by Git and are intentionally not uploaded.

```text
ApnaDairy/
├── frontend/
│   ├── src/
│   │   ├── app/                 Router, guards, and portal configuration
│   │   ├── pages/
│   │   │   ├── admin/           Admin dashboard pages
│   │   │   ├── superadmin/      Platform governance pages
│   │   │   ├── farmer/          Farmer portal pages
│   │   │   ├── business/        Business/B2B portal pages
│   │   │   ├── customer/        Customer marketplace pages
│   │   │   ├── rider/           Delivery rider pages
│   │   │   ├── shared/          Shared profile, chat, and delivery pages
│   │   │   ├── auth/            Login, register, and password pages
│   │   │   ├── public/          Public website pages
│   │   │   └── app/             Shared app page helpers
│   │   ├── components/          Reusable UI, layout, motion, and 3D components
│   │   ├── features/
│   │   │   ├── portal/          Portal API clients, types, and widgets
│   │   │   └── public/          Public API and query views
│   │   ├── stores/              Global auth and UI state
│   │   ├── lib/                 API client, constants, schemas, and helpers
│   │   ├── assets/              Hero and visual assets
│   │   ├── main.tsx             Frontend entry point
│   │   └── index.css            Global styles
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── STRUCTURE.md
│
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI application and startup hooks
│   │   ├── seed.py              Demo users and connected demo data
│   │   ├── api/routes/           HTTP endpoints
│   │   │   ├── auth.py           Login, registration, refresh, and current user
│   │   │   ├── admin.py          Admin users, farms, operations, and support
│   │   │   ├── super_admin.py    Super Admin governance endpoints
│   │   │   ├── analytics.py      Role dashboards and analytics
│   │   │   ├── batches.py        Milk-batch workflows
│   │   │   ├── catalog.py        Farms and marketplace catalog
│   │   │   ├── commerce.py       Cart, orders, payments, and deliveries
│   │   │   ├── b2b.py            Bulk requests and quotations
│   │   │   ├── iot_ai.py         IoT readings and AI predictions
│   │   │   ├── engagement.py     Notifications, reviews, and complaints
│   │   │   ├── support.py        Support and chat
│   │   │   └── uploads.py        Validated file uploads
│   │   ├── auth/                 JWT, password hashing, and role guards
│   │   ├── core/                 Settings and rate limiting
│   │   ├── db/                   SQLAlchemy engine, sessions, and Base
│   │   ├── models/               Database tables and enums
│   │   ├── schemas/              Pydantic request and response models
│   │   ├── services/             AI, IoT simulation, and automation
│   │   └── ml_models/            Trained model files
│   ├── alembic/                  Database migrations
│   ├── tests/                    API, database, automation, and portal tests
│   ├── requirements.txt
│   ├── .env.example
│   └── STRUCTURE.md
│
├── API_CONTRACT.md               Endpoint and schema reference
├── RUN-LOCALLY.md                Setup, seeding, ports, and troubleshooting
├── frontend/STRUCTURE.md         Frontend structure and admin page map
├── backend/STRUCTURE.md          Backend responsibilities and change guide
├── run.ps1 / start.ps1           Windows launchers
├── run.sh                         Bash launcher
├── .gitignore
└── README.md
```

### Main admin pages

Admin screen files are in `frontend/src/pages/admin/`: `Dashboard.tsx`,
`Users.tsx`, `Farms.tsx`, `Operations.tsx`, `Commerce.tsx`, `B2B.tsx`,
`AIIoT.tsx`, `Analytics.tsx`, `Support.tsx`, and `ChatOversight.tsx`.

### Where to edit

- Add an API endpoint: `backend/app/api/routes/`
- Add a database table: `backend/app/models/`, then add an Alembic migration
- Add request/response validation: `backend/app/schemas/`
- Add reusable backend logic: `backend/app/services/`
- Add a portal screen: `frontend/src/pages/<portal>/`
- Add shared frontend UI: `frontend/src/components/`
- Change frontend routes: `frontend/src/app/router.tsx`

## Honest demo boundaries

- Periodic IoT readings are simulated and explicitly labelled; no live hardware is involved.
- AI predictions are demonstration outputs and are not laboratory certification.
- Super Admin governance uses persistent database tables, guarded APIs, and audit records rather than the attached reference app's mock arrays.
- Chatbot provider features require a server-side key; without one the API reports that the provider is not configured.
- Supabase requires its schema and credentials to be configured separately. Secrets are never bundled with the project.
- Completion-report percentages and historical QA claims are not substitutes for running the current tests and build on your machine.

## Security design

The backend includes role and ownership checks, Bearer JWT authentication,
login/register rate limiting, selected admin-action audit records, and validated
image uploads. The frontend currently stores its JWT session in browser local
storage; it does not use HTTP-only authentication cookies or CSRF tokens.
Before any public deployment, rotate exposed credentials, use a strong
`JWT_SECRET`, configure HTTPS and trusted origins, add distributed edge rate
limiting, and perform a fresh security review.
