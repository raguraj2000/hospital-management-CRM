"""Authentication and session endpoints."""

from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Header, Response
from src.constants.application import COOKIE_SESSION_ID
from src.constants.errors import ErrorCode
from src.core.config import settings
from src.core.exceptions import AppException
from src.models.global_schema.users import User
from src.schemas.authentication_schema import CurrentUserContext, LoginRequest, LoginResponse, MembershipDTO, UserDTO
from src.schemas.common import SuccessResponse
from src.service.authentication_service import AuthenticationService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def extract_token(auth_header: Optional[str] = None, sid: Optional[str] = None) -> Optional[str]:
    """Extracts raw token from Authorization Bearer header or session cookie."""
    if auth_header:
        if auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        return auth_header.strip()
    return sid.strip() if sid else None


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    auth_service: AuthenticationService = Depends(),
) -> LoginResponse:
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

    mem_dto = MembershipDTO.model_validate(membership) if membership else None
    return LoginResponse(
        user=UserDTO.model_validate(user),
        membership=mem_dto,
        token=raw_token,
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    response: Response,
    authorization: Optional[str] = Header(None),
    sid: Optional[str] = Cookie(None, alias=COOKIE_SESSION_ID),
    auth_service: AuthenticationService = Depends(),
) -> SuccessResponse:
    token = extract_token(authorization, sid)
    if token:
        await auth_service.logout(token)
    response.delete_cookie(key=COOKIE_SESSION_ID, path="/")
    return SuccessResponse(message="Logged out successfully.")


@router.get("/me", response_model=UserDTO)
async def get_current_profile(
    authorization: Optional[str] = Header(None),
    sid: Optional[str] = Cookie(None, alias=COOKIE_SESSION_ID),
    auth_service: AuthenticationService = Depends(),
) -> UserDTO:
    token = extract_token(authorization, sid)
    if not token:
        raise AppException("Missing authentication token.", code=ErrorCode.UNAUTHORIZED, status_code=401)
    user = await auth_service.verify_session(token)
    if not user or not user.is_active:
        raise AppException("Session expired or user inactive.", code=ErrorCode.UNAUTHORIZED, status_code=401)
    return UserDTO.model_validate(user)

