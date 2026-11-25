from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.config import IS_PRODUCTION, REFRESH_TOKEN_EXPIRE_DAYS
from app.database import get_db
from app.models import User
from app.rbac import get_current_user
from app.schemas import (
    AuthTokenResponse,
    MessageResponse,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    SessionResponse,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "chd_refresh_token"


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/api",
    )


@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def signup(
    payload: UserSignupRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    auth_response, raw_refresh = auth_service.signup_user(db, payload, request)
    _set_refresh_cookie(response, raw_refresh)
    return auth_response


@router.post("/login", response_model=AuthTokenResponse)
def login(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    auth_response, raw_refresh = auth_service.login_user(db, payload, request)
    _set_refresh_cookie(response, raw_refresh)
    return auth_response


@router.post("/refresh", response_model=AuthTokenResponse)
def refresh_token(
    request: Request,
    response: Response,
    chd_refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    auth_response, new_raw_refresh = auth_service.refresh_user_session(
        db, chd_refresh_token, request
    )
    _set_refresh_cookie(response, new_raw_refresh)
    return auth_response


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    chd_refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    auth_service.logout_user(db, chd_refresh_token, request)
    _clear_refresh_cookie(response)
    return MessageResponse(message="Logged out successfully.")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return auth_service.update_user_profile(db, current_user, payload, request)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service.change_user_password(db, current_user, payload, request)
    return MessageResponse(message="Password updated successfully.")


@router.get("/sessions", response_model=List[SessionResponse])
def list_sessions(
    chd_refresh_token: Optional[str] = Cookie(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return auth_service.list_user_sessions(db, current_user, chd_refresh_token)


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
def revoke_session(
    session_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service.revoke_user_session(db, current_user, session_id, request)
    return MessageResponse(message="Session revoked successfully.")