from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog, User
from app.security import get_client_ip, get_user_agent


def log_audit_event(
    db: Session,
    action: str,
    request: Optional[Request] = None,
    user: Optional[User] = None,
    user_id: Optional[UUID] = None,
    username: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[str] = None,
    commit: bool = True,
) -> AuditLog:
    entry = AuditLog(
        user_id=user.id if user else user_id,
        username=user.username if user else username,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        details=details,
        ip_address=get_client_ip(request) if request else None,
        user_agent=get_user_agent(request) if request else None,
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    return entry