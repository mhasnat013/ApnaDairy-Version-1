# ApnaDairy — connected dairy network

ApnaDairy is a final-year project for verified farms, milk-batch operations, cold-chain monitoring, AI freshness estimates, customer ordering, business procurement, delivery workflows, and role-based administration. The Product dropdown and the dedicated "Trace a Batch" pages are intentionally not exposed in the web application.

## Stack

- Backend: Python, FastAPI, SQLAlchemy 2, Alembic, and Pydantic 2
- Database: local SQLite for a zero-configuration demo; PostgreSQL/Supabase supported for deployment
- Frontend: React 18, TypeScript, Vite, and Tailwind CSS
- API contract: [`API_CONTRACT.md`](API_CONTRACT.md)

## Run it

On Windows PowerShell:

```powershell
.\run.ps1
```

On macOS, Linux, WSL, or Git Bash:

```bash
./run.sh
```

Then open http://localhost:8000. The same FastAPI process serves the compiled frontend and the API. See [`RUN-LOCALLY.md`](RUN-LOCALLY.md) for admin seeding, ports, Supabase setup, and troubleshooting.

## Project layout

```text
backend/                 FastAPI application, models, migrations, tests, seed
frontend/                React application and production build
API_CONTRACT.md          Endpoint and schema reference
RUN-LOCALLY.md           Complete local setup instructions
run.ps1 / run.sh         Windows and Bash launchers
```

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
