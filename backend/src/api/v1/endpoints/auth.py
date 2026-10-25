"""Authentication and session endpoints."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Cookie, Depends, Header, Response
from src.constants.application import COOKIE_SESSION_ID
from src.constants.errors import ErrorCode
from src.core.config import settings
from src.core.exceptions import AppException
from src.models.global_schema.users import User
from src.schemas.authentication_schema import ChangePasswordRequest, CurrentUserContext, LoginRequest, LoginResponse, MembershipDTO, UserDTO
from src.schemas.common import api_response
from src.service.authentication_service import AuthenticationService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def extract_token(auth_header: Optional[str] = None, sid: Optional[str] = None) -> Optional[str]:
    """Extracts raw token from Authorization Bearer header or session cookie."""
    if auth_header:
        if auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        return auth_header.strip()
    return sid.strip() if sid else None


@router.post("/login")
async def login(
    payload: LoginRequest,
    response: Response,
    auth_service: AuthenticationService = Depends(),
) -> Dict[str, Any]:
    user, membership, raw_token = await auth_service.login(payload.identifier, payload.password)

    # Set cookie for browser clients that use cookies
    response.set_cookie(
        key=COOKIE_SESSION_ID,
        value=raw_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )

    mem_dto = MembershipDTO.model_validate(membership).model_dump() if membership else None
    return api_response(
        data={
            "user": UserDTO.model_validate(user).model_dump(),
            "membership": mem_dto,
            "token": raw_token,
        },
        message="Logged in successfully",
    )


@router.post("/logout")
async def logout(
    response: Response,
    authorization: Optional[str] = Header(None),
    sid: Optional[str] = Cookie(None, alias=COOKIE_SESSION_ID),
    auth_service: AuthenticationService = Depends(),
) -> Dict[str, Any]:
    token = extract_token(authorization, sid)
    if token:
        await auth_service.logout(token)
    response.delete_cookie(key=COOKIE_SESSION_ID, path="/")
    return api_response(data={"ok": True}, message="Logged out successfully.")


@router.get("/me")
async def get_current_profile(
    authorization: Optional[str] = Header(None),
    sid: Optional[str] = Cookie(None, alias=COOKIE_SESSION_ID),
    auth_service: AuthenticationService = Depends(),
) -> Dict[str, Any]:
    token = extract_token(authorization, sid)
    if not token:
        raise AppException("Missing authentication token.", code=ErrorCode.UNAUTHORIZED, status_code=401)
    user = await auth_service.verify_session(token)
    if not user or not user.is_active:
        raise AppException("Session expired or user inactive.", code=ErrorCode.UNAUTHORIZED, status_code=401)
    memberships = await auth_service.user_repo.get_memberships_for_user(user.id)
    return api_response(
        data={
            "user": UserDTO.model_validate(user).model_dump(),
            "memberships": [MembershipDTO.model_validate(m).model_dump() for m in memberships],
        },
        message="Current user retrieved successfully",
    )


@router.post("/change-password")
@router.post("/password")
async def change_password(
    payload: ChangePasswordRequest,
    authorization: Optional[str] = Header(None),
    sid: Optional[str] = Cookie(None, alias=COOKIE_SESSION_ID),
    auth_service: AuthenticationService = Depends(),
) -> Dict[str, Any]:
    token = extract_token(authorization, sid)
    if not token:
        raise AppException("Missing authentication token.", code=ErrorCode.UNAUTHORIZED, status_code=401)
    user = await auth_service.verify_session(token)
    if not user or not user.is_active:
        raise AppException("Session expired or user inactive.", code=ErrorCode.UNAUTHORIZED, status_code=401)

    if not payload.old_pwd or not payload.new_pwd:
        raise AppException("Both current_password and new_password are required.", code=ErrorCode.BAD_REQUEST, status_code=400)

    await auth_service.change_password(
        user_id=user.id,
        current_password=payload.old_pwd,
        new_password=payload.new_pwd,
        current_token=token,
    )
    return api_response(data={"ok": True}, message="Password changed successfully.")

