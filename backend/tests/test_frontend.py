from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.frontend import mount_frontend


def _built_app(tmp_path: Path) -> TestClient:
    dist = tmp_path / "dist"
    assets = dist / "assets"
    assets.mkdir(parents=True)
    (dist / "index.html").write_text("<main>ApnaDairy SPA</main>", encoding="utf-8")
    (dist / "manifest.webmanifest").write_text("{}", encoding="utf-8")
    (assets / "app.js").write_text("window.apnaDairy = true", encoding="utf-8")

    app = FastAPI()

    @app.get("/api/v1/example")
    def api_example():
        return {"source": "api"}

    assert mount_frontend(app, dist)
    return TestClient(app)


def test_serves_root_static_assets_and_public_files(tmp_path):
    client = _built_app(tmp_path)

    root = client.get("/")
    assert root.text == "<main>ApnaDairy SPA</main>"
    assert root.headers["cache-control"] == "no-store"
    assert "apnaDairy" in client.get("/assets/app.js").text
    assert client.get("/manifest.webmanifest").json() == {}


def test_spa_fallback_does_not_shadow_backend_or_missing_assets(tmp_path):
    client = _built_app(tmp_path)

    spa_route = client.get("/farmer/dashboard")
    assert spa_route.text == "<main>ApnaDairy SPA</main>"
    assert spa_route.headers["cache-control"] == "no-store"
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").headers["content-type"] == "application/json"
    assert client.get("/api/v1/example").json() == {"source": "api"}
    assert client.get("/api/v1/missing").status_code == 404
    assert client.get("/uploads/files/missing.png").status_code == 404
    assert client.get("/assets/missing.js").status_code == 404
    assert client.get("/missing.png").status_code == 404


def test_does_not_mount_without_a_completed_build(tmp_path):
    app = FastAPI()

    assert mount_frontend(app, tmp_path / "missing-dist") is False
    assert TestClient(app).get("/").status_code == 404
