"""ApnaDairy FastAPI application.

All API routes live under /api/v1. Production database target is
PostgreSQL (Supabase); SQL is delivered as supabase_schema.sql for the
Supabase SQL Editor — this process never connects to the live database.
"""

import asyncio
from contextlib import asynccontextmanager, suppress

import app.db.database as dbmod  # noqa: E402
import app.models  # noqa: E402,F401  (registers all 22 tables on Base.metadata)
from app.core.config import get_settings
from app.db.database import make_engine, make_session_factory

settings = get_settings()

# Wire the shared engine/session from settings. Routers resolve get_db() from
# app.db.database at call time, so this single assignment is enough.
engine = make_engine(settings.DATABASE_URL)
dbmod.engine = engine
dbmod.SessionLocal = make_session_factory(engine)

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from app.frontend import mount_frontend  # noqa: E402
from app.services.batch_automation import scheduler_loop  # noqa: E402
from app.api.routes import (  # noqa: E402
    admin,
    analytics,
    auth,
    b2b,
    batches,
    catalog,
    commerce,
    engagement,
    iot_ai,
    support,
    super_admin,
    uploads,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Local development is deliberately zero-config. Migrations remain the
    # source of truth for managed databases, while a fresh SQLite file gets its
    # schema at startup so the API cannot produce "no such table" errors.
    if engine.dialect.name == "sqlite":
        dbmod.Base.metadata.create_all(engine)
    automation_task = None
    # The scheduler is an explicitly simulated local-demo facility. Both
    # switches must be on, preventing accidental writes in production when
    # DEMO_MODE is disabled.
    if settings.DEMO_MODE and settings.IOT_AI_AUTOMATION_ENABLED:
        automation_task = asyncio.create_task(
            scheduler_loop(dbmod.SessionLocal, settings),
            name="simulated-iot-ai-automation",
        )
    try:
        yield
    finally:
        if automation_task is not None:
            automation_task.cancel()
            with suppress(asyncio.CancelledError):
                await automation_task
        if engine.dialect.name == "sqlite":
            engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="ApnaDairy API",
        description="Freshness you can trust — farm-to-table dairy marketplace.",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    def health():
        return {"status": "ok", "service": "apnadairy-api"}

    @app.get("/api/v1/health", tags=["health"])
    def health_v1():
        return {"status": "ok", "service": "apnadairy-api"}

    uploads.mount_static(app)

    for r in (
        auth, catalog, batches, iot_ai, commerce, b2b,
        engagement, support, admin, super_admin, analytics, uploads,
    ):
        app.include_router(r.router, prefix="/api/v1")

    # Keep this last: the React Router fallback must never shadow API, docs,
    # health, or uploaded-file routes.
    mount_frontend(app)

    return app


app = create_app()
