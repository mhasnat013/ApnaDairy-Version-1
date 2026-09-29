"""Shared router helpers: 404 fetching, pagination, notifications."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app import schemas as s
from app.models import Notification


def get_or_404(db: Session, model, pk: int, name: str = "Record"):
    obj = db.get(model, pk)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{name} not found")
    return obj


def paginate(query, page: int, page_size: int, items: list) -> s.Page:
    total = query.count()
    return s.Page(items=items, total=total, page=page, page_size=page_size)


def notify(db: Session, user_id: int, type_: str, message: str) -> None:
    db.add(Notification(user_id=user_id, type=type_, message=message))


def log_admin_action(db: Session, admin_id: int, action: str, entity_type: str, entity_id: int | None = None, description: str | None = None) -> None:
    """Append an audit row to AdminActionLog (caller commits)."""
    from app.models import AdminActionLog
    db.add(AdminActionLog(admin_id=admin_id, action=action, entity_type=entity_type, entity_id=entity_id, description=description))



def page_params(page: int = 1, page_size: int = 20) -> tuple[int, int]:
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    return page, page_size


def apply_paging(query, page: int, page_size: int):
    return query.offset((page - 1) * page_size).limit(page_size)
