"""Authentication: register / login / refresh / forgot / reset / me.

Public registration is limited to customer | farmer | business | rider.
Admin accounts are created ONLY via `python -m app.seed` (ADMIN_EMAIL /
ADMIN_PASSWORD env vars) — POST /auth/register rejects role=admin with 403.
"""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import schemas as s
from app.auth.deps import get_current_user
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.config import get_settings
from app.database import get_db
from app.models import Cart, User
from app.models.enums import PUBLIC_ROLES
from app.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _tokens(user: User) -> s.TokenResponse:
    return s.TokenResponse(
        access_token=create_access_token(user.user_id, user.role),
        refresh_token=create_refresh_token(user.user_id, user.role),
        user=s.UserOut.from_orm_user(user),
    )


@router.post("/register", response_model=s.TokenResponse, status_code=201, dependencies=[Depends(limiter(30, 60))])
def register(body: s.RegisterRequest, db: Session = Depends(get_db)):
    if body.role in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privileged accounts cannot be created via public registration.",
        )
    if body.role not in PUBLIC_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role must be one of: {', '.join(PUBLIC_ROLES)}",
        )
    if not EMAIL_RE.match(body.email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if body.password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    exists = (
        db.query(User)
        .filter((User.email == body.email) | (User.phone == body.phone))
        .first()
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email or phone already exists.",
        )

    user = User(
        full_name=body.full_name.strip(),
        email=body.email.strip().lower(),
        phone=body.phone.strip(),
        password_hash=hash_password(body.password),
        role=body.role,
        is_verified=False,
        # Riders require admin approval before they can work; other roles start active.
        status="pending" if body.role == "rider" else "active",
    )
    db.add(user)
    db.flush()
    # Every user gets their 1:1 cart row up-front (ERD: USER 1:1 CART).
    db.add(Cart(user_id=user.user_id, cart_data={"items": []}))
    db.commit()
    db.refresh(user)
    return _tokens(user)


@router.post("/login", response_model=s.TokenResponse, dependencies=[Depends(limiter(30, 60))])
def login(body: s.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if user.status == "pending":
        raise HTTPException(status_code=403, detail="Your rider account is pending approval. Our team will review it shortly.")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is not active.")
    return _tokens(user)


@router.post("/refresh", response_model=s.RefreshResponse)
def refresh(body: s.RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = db.get(User, int(payload["sub"]))
    if user is None or user.status != "active":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    return s.RefreshResponse(
        access_token=create_access_token(user.user_id, user.role),
        refresh_token=create_refresh_token(user.user_id, user.role),
    )


@router.post("/forgot-password", response_model=dict)
def forgot_password(body: s.ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Always 200 — never reveal whether the email exists.
    user = db.query(User).filter(User.email == body.email.strip().lower()).first()
    reset_token = create_reset_token(user.user_id) if user else None
    settings = get_settings()
    out: dict = {"message": "If an account exists for this email, a reset link has been sent."}
    if settings.DEMO_MODE and reset_token:
        # No email service in dev/demo: hand the token back so the FYP demo can
        # complete the flow. Disabled when DEMO_MODE=false.
        out["reset_token"] = reset_token
        out["note"] = "Demo mode: no email service is connected; use reset_token with POST /auth/reset-password."
    return out


@router.post("/reset-password", response_model=s.MessageOut)
def reset_password(body: s.ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid token type")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user.password_hash = hash_password(body.password)
    db.commit()
    return s.MessageOut(message="Password has been reset. You can now sign in.")


@router.get("/me", response_model=s.UserOut)
def me(user: User = Depends(get_current_user)):
    return s.UserOut.from_orm_user(user)
