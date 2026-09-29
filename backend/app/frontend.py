"""Serve the optional Vite production build from the API process."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


DEFAULT_DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"

# These paths belong to FastAPI even when no matching endpoint/file exists.
# Returning index.html for them would turn a useful API 404 into a misleading 200.
BACKEND_PATH_PREFIXES = {"api", "docs", "redoc", "uploads", "openapi.json", "health"}
SPA_HEADERS = {"Cache-Control": "no-store"}


def mount_frontend(app: FastAPI, dist_dir: Path | None = None) -> bool:
    """Mount a built Vite app, returning whether a usable build was found.

    API and upload routes must be registered before this catch-all route.  The
    helper deliberately does nothing in development/test installs where the
    frontend has not been built yet.
    """

    dist = (dist_dir or DEFAULT_DIST_DIR).resolve()
    index_file = dist / "index.html"
    if not index_file.is_file():
        return False

    assets_dir = dist / "assets"
    if assets_dir.is_dir():
        app.mount(
            "/assets",
            StaticFiles(directory=str(assets_dir)),
            name="frontend-assets",
        )

    @app.get("/", include_in_schema=False, name="frontend-root")
    def frontend_root() -> FileResponse:
        return FileResponse(index_file, headers=SPA_HEADERS)

    @app.get("/{full_path:path}", include_in_schema=False, name="frontend-spa")
    def frontend_spa(full_path: str) -> FileResponse:
        first_segment = full_path.split("/", 1)[0]
        if first_segment in BACKEND_PATH_PREFIXES:
            raise HTTPException(status_code=404, detail="Not Found")

        requested_file = (dist / full_path).resolve()
        try:
            requested_file.relative_to(dist)
        except ValueError:
            raise HTTPException(status_code=404, detail="Not Found") from None

        if requested_file.is_file():
            return FileResponse(requested_file)

        # A missing file should stay missing; extensionless URLs are React
        # Router locations and receive the SPA entry point.
        if Path(full_path).suffix:
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(index_file, headers=SPA_HEADERS)

    return True
