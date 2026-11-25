from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.models import User, UserSession
from app.rbac import ROLE_USER
from app.schemas import (
    AuthTokenResponse,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    SessionResponse,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)
from app.security import (
    create_access_token,
    generate_refresh_token,
    get_client_ip,
    get_user_agent,
    hash_password,
    hash_refresh_token,
    refresh_token_expiry,
    validate_password_strength,
    verify_password,
)
from app.services.audit_service import log_audit_event

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _as_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _issue_session_tokens(
    db: Session, user: User, request: Request
) -> Tuple[AuthTokenResponse, str]:
    raw_refresh = generate_refresh_token()
    session = UserSession(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        is_revoked=False,
        expires_at=refresh_token_expiry(),
    )
    db.add(session)
    db.commit()

    access_token = create_access_token(str(user.id), user.role)
    response = AuthTokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )
    return response, raw_refresh


def signup_user(
    db: Session, payload: UserSignupRequest, request: Request
) -> Tuple[AuthTokenResponse, str]:
    strength_error = validate_password_strength(payload.password)
    if strength_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=strength_error)

    clean_username = payload.username.strip()
    clean_email = payload.email.strip().lower()

    existing = (
        db.query(User)
        .filter(
            or_(
                func.lower(User.username) == clean_username.lower(),
                func.lower(User.email) == clean_email,
            )
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that username or email already exists.",
        )

    user = User(
        username=clean_username,
        email=clean_email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=ROLE_USER,
        is_banned=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit_event(
        db,
        action="SIGNUP",
        request=request,
        user=user,
        target_type="user",
        target_id=str(user.id),
        details="New user account registered.",
    )
    return _issue_session_tokens(db, user, request)


def login_user(
    db: Session, payload: UserLoginRequest, request: Request
) -> Tuple[AuthTokenResponse, str]:
    identifier = payload.username.strip()
    user = (
        db.query(User)
        .filter(
            or_(
                func.lower(User.username) == identifier.lower(),
                func.lower(User.email) == identifier.lower(),
            )
        )
        .first()
    )

    if not user:
        log_audit_event(
            db,
            action="LOGIN_FAILED",
            request=request,
            username=identifier,
            details="Unknown account attempted login.",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    now = datetime.now(timezone.utc)
    if user.locked_until and _as_utc(user.locked_until) > now:
        log_audit_event(
            db,
            action="LOGIN_FAILED",
            request=request,
            user=user,
            details="Login blocked due to temporary brute-force lockout.",
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later.",
        )

    if user.is_banned:
        log_audit_event(
            db,
            action="LOGIN_FAILED",
            request=request,
            user=user,
            details="Banned account attempted login.",
        )
        reason = f" Reason: {user.ban_reason}" if user.ban_reason else ""
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account has been banned.{reason}",
        )

    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        detail_msg = f"Invalid password (attempt {user.failed_login_attempts})."
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            detail_msg = f"Account locked for {LOCKOUT_MINUTES} minutes after {MAX_FAILED_ATTEMPTS} failed attempts."
        db.commit()
        log_audit_event(
            db,
            action="LOGIN_FAILED",
            request=request,
            user=user,
            details=detail_msg,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    log_audit_event(
        db,
        action="LOGIN_SUCCESS",
        request=request,
        user=user,
        target_type="user",
        target_id=str(user.id),
        details="User logged in successfully.",
    )
    return _issue_session_tokens(db, user, request)


def refresh_user_session(
    db: Session, raw_refresh_token: Optional[str], request: Request
) -> Tuple[AuthTokenResponse, str]:
    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token.",
        )

    token_hash = hash_refresh_token(raw_refresh_token)
    session = db.query(UserSession).filter(UserSession.token_hash == token_hash).first()
    now = datetime.now(timezone.utc)

    if not session or session.is_revoked or _as_utc(session.expires_at) <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid, revoked, or expired.",
        )

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    if user.is_banned:
        session.is_revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned.",
        )

    # Rotate refresh token on every refresh so old tokens cannot be reused
    new_raw_refresh = generate_refresh_token()
    session.token_hash = hash_refresh_token(new_raw_refresh)
    session.expires_at = refresh_token_expiry()
    session.last_used_at = now
    session.ip_address = get_client_ip(request)
    session.user_agent = get_user_agent(request)
    db.commit()

    access_token = create_access_token(str(user.id), user.role)
    response = AuthTokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )
    return response, new_raw_refresh


def logout_user(
    db: Session,
    raw_refresh_token: Optional[str],
    request: Request,
    current_user: Optional[User] = None,
) -> None:
    user_for_log = current_user
    if raw_refresh_token:
        token_hash = hash_refresh_token(raw_refresh_token)
        session = db.query(UserSession).filter(UserSession.token_hash == token_hash).first()
        if session:
            session.is_revoked = True
            if user_for_log is None:
                user_for_log = db.query(User).filter(User.id == session.user_id).first()
            db.commit()

    if user_for_log:
        log_audit_event(
            db,
            action="LOGOUT",
            request=request,
            user=user_for_log,
            target_type="user",
            target_id=str(user_for_log.id),
            details="User logged out and session revoked.",
        )


def list_user_sessions(
    db: Session, user: User, current_raw_refresh: Optional[str] = None
) -> List[SessionResponse]:
    current_hash = hash_refresh_token(current_raw_refresh) if current_raw_refresh else None
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == user.id)
        .order_by(UserSession.created_at.desc())
        .all()
    )
    results: List[SessionResponse] = []
    for s in sessions:
        item = SessionResponse.model_validate(s)
        item.is_current = bool(current_hash and s.token_hash == current_hash and not s.is_revoked)
        results.append(item)
    return results


def revoke_user_session(
    db: Session, user: User, session_id: UUID, request: Request
) -> None:
    session = (
        db.query(UserSession)
        .filter(UserSession.id == session_id, UserSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    session.is_revoked = True
    db.commit()
    log_audit_event(
        db,
        action="SESSION_REVOKED",
        request=request,
        user=user,
        target_type="session",
        target_id=str(session.id),
        details="User revoked an active session.",
    )


def update_user_profile(
    db: Session, user: User, payload: ProfileUpdateRequest, request: Request
) -> UserResponse:
    if payload.email is not None:
        clean_email = payload.email.strip().lower()
        conflict = (
            db.query(User)
            .filter(func.lower(User.email) == clean_email, User.id != user.id)
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That email address is already in use.",
            )
        user.email = clean_email

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()

    db.commit()
    db.refresh(user)
    log_audit_event(
        db,
        action="PROFILE_UPDATED",
        request=request,
        user=user,
        target_type="user",
        target_id=str(user.id),
        details="User updated profile details.",
    )
    return UserResponse.model_validate(user)


def change_user_password(
    db: Session, user: User, payload: PasswordChangeRequest, request: Request
) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        log_audit_event(
            db,
            action="PASSWORD_CHANGE_FAILED",
            request=request,
            user=user,
            target_type="user",
            target_id=str(user.id),
            details="Incorrect current password supplied during password change.",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    strength_error = validate_password_strength(payload.new_password)
    if strength_error:
        log_audit_event(
            db,
            action="PASSWORD_CHANGE_FAILED",
            request=request,
            user=user,
            target_type="user",
            target_id=str(user.id),
            details=f"New password rejected: {strength_error}",
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=strength_error)

    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password.",
        )

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    log_audit_event(
        db,
        action="PASSWORD_CHANGED",
        request=request,
        user=user,
        target_type="user",
        target_id=str(user.id),
        details="User changed password successfully.",
    )