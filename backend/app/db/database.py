"""SQLAlchemy engine/session/Base. Production target is PostgreSQL (Supabase)."""

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker


BACKEND_DIR = Path(__file__).resolve().parent.parent


class Base(DeclarativeBase):
    pass


def resolve_database_url(database_url: str) -> str:
    """Resolve relative SQLite files from ``backend/``, independent of cwd."""
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite" or not url.database or url.database == ":memory:":
        return database_url
    database_path = Path(url.database).expanduser()
    if not database_path.is_absolute():
        database_path = BACKEND_DIR / database_path
    return url.set(database=str(database_path.resolve())).render_as_string(hide_password=False)


def prepare_database_path(database_url: str) -> str:
    """Create a file-backed SQLite database's parent directory when needed."""
    resolved_url = resolve_database_url(database_url)
    url = make_url(resolved_url)
    if url.get_backend_name() == "sqlite" and url.database and url.database != ":memory:":
        Path(url.database).parent.mkdir(parents=True, exist_ok=True)
    return resolved_url


def make_engine(database_url: str):
    connect_args = {}
    if database_url.startswith("sqlite"):
        database_url = prepare_database_path(database_url)
        connect_args = {"check_same_thread": False}
    return create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)


def make_session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


# Wired in main.py from settings so tests can override get_db with an
# in-memory SQLite database (test-only — production is PostgreSQL/Supabase).
engine = None
SessionLocal = None


def get_db():
    if SessionLocal is None:  # pragma: no cover
        raise RuntimeError("Database not initialised — app startup wires SessionLocal")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
