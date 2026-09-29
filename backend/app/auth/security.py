"""Password hashing and JWT helpers."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_token(user_id: int, role: str, token_type: str, expires: timedelta) -> str:
    settings = get_settings()
    now = _now()
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def create_access_token(user_id: int, role: str) -> str:
    settings = get_settings()
    return create_token(user_id, role, "access", timedelta(minutes=settings.JWT_ACCESS_MINUTES))


def create_refresh_token(user_id: int, role: str) -> str:
    settings = get_settings()
    return create_token(user_id, role, "refresh", timedelta(days=settings.JWT_REFRESH_DAYS))


def create_reset_token(user_id: int) -> str:
    return create_token(user_id, "", "reset", timedelta(hours=2))


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
