"""Pytest fixtures: isolated SQLite DB (test-only override — production is
PostgreSQL/Supabase) with the FastAPI dependency overridden."""

import os
import tempfile
from pathlib import Path

TEST_DB_PATH = Path(tempfile.gettempdir()) / "apnadairy_test.db"
TEST_URL = f"sqlite:///{TEST_DB_PATH.as_posix()}"

os.environ["DATABASE_URL"] = TEST_URL
os.environ["JWT_SECRET"] = "test-secret-not-a-real-credential"
# Scheduler behavior is covered deterministically through its manual endpoint;
# never let a background thread write to the test database.
os.environ["IOT_AI_AUTOMATION_ENABLED"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db.database import Base, get_db  # noqa: E402
import app.models  # noqa: E402,F401
from app.main import app  # noqa: E402

@pytest.fixture()
def db_session():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    engine = create_engine(TEST_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = Session()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def client(db_session):
    def _override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def register(client, email, role, password="TestPass123"):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": f"{role.title()} User",
            "email": email,
            "phone": "+93" + str(abs(hash(email)) % 10**9).zfill(9),
            "password": password,
            "confirmPassword": password,
            "role": role,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def login(client, email, password="TestPass123"):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["accessToken"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}
