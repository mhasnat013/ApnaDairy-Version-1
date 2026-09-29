"""Secure uploads: images only, size-capped, no executables, safe filenames."""

import secrets
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.staticfiles import StaticFiles

from app import schemas as s
from app.auth.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/avif"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".avif"}


def mount_static(app) -> None:
    """Serve uploaded files read-only under /uploads/files."""
    app.mount("/uploads/files", StaticFiles(directory=str(UPLOAD_DIR), check_dir=False), name="upload-files")


@router.post("", response_model=s.UploadOut, status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile, user: User = Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(400, "No file provided.")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Only image files are allowed ({', '.join(sorted(ALLOWED_EXT))}).")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Rejected content type: {file.content_type}")

    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, f"File too large (max {MAX_BYTES // 1024 // 1024} MB).")
    if len(data) < 8:
        raise HTTPException(400, "File is empty or corrupt.")

    # Magic-number sniffing — never trust the extension alone.
    magic_ok = (
        data.startswith(b"\xff\xd8\xff")  # jpeg
        or data.startswith(b"\x89PNG\r\n\x1a\n")  # png
        or (data.startswith(b"RIFF") and data[8:12] == b"WEBP")  # webp
        or (data[4:12] == b"ftypavif")  # avif
    )
    if not magic_ok:
        raise HTTPException(400, "File content does not look like an image.")

    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / safe_name
    # Defensive: resolve and confirm we never escape the upload dir.
    if dest.resolve().parent != UPLOAD_DIR.resolve():
        raise HTTPException(400, "Invalid filename.")
    dest.write_bytes(data)

    return s.UploadOut(
        url=f"/uploads/files/{safe_name}",
        filename=file.filename,
        size_bytes=len(data),
    )
