# ApnaDairy frontend

React 18 + TypeScript + Vite frontend for customer ordering, farm operations, business procurement, AI/IoT monitoring, delivery workflows, and role-based Admin/Super Admin portals. The Product dropdown and dedicated batch-trace pages are intentionally disconnected from the web UI.

## Full application

Use `run.ps1` or `run.sh` from the repository root. It builds this app and FastAPI serves `frontend/dist` at http://localhost:8000.

## Frontend development server

```bash
npm install
npm run dev
```

Vite normally starts at http://localhost:5173. Keep the FastAPI backend running at http://localhost:8000; frontend API requests use the configured `/api/v1` base.

## Checks and production build

```bash
npm run build
```

The build command runs TypeScript checking and writes the production assets to `dist/`. Stop and rerun the root launcher after frontend changes when testing the same-origin production build.

## Important boundaries

- IoT readings shown by the app are simulated demonstrations.
- AI freshness results are not laboratory certification.
- Provider keys and database credentials belong in backend environment configuration, never in frontend files.
- A visible action should either call a real API route or present an honest unavailable/empty state.
