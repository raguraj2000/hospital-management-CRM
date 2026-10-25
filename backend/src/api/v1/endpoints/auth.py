"""Authentication and session endpoints."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Cookie, Depends, Header, Response
from src.constants.application import COOKIE_SESSION_ID
from src.constants.errors import ErrorCode
from src.core.config import settings
from src.core.exceptions import AppException
from src.models.global_schema.users import User
from src.repository.organization_repository import OrganizationRepository
from src.schemas.authentication_schema import ChangePasswordRequest, CurrentUserContext, LoginRequest, LoginResponse, MembershipDTO, UserDTO
from src.schemas.common import api_response
from src.service.authentication_service import AuthenticationService

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALL_PERMISSIONS = [
    "users.manage", "settings.manage", "audit.view", "access.anywhere",
    "dashboard.view", "patient.view", "patient.create", "patient.edit",
    "patient.delete", "prescription.write", "lab.order", "billing.receive",
    "lab.view", "lab.correct", "pharmacy.sell", "inventory.view",
    "inventory.manage", "vendor.manage", "treatment.give", "reports.view", "undo.skip",
]


async def build_auth_payload(
    user: User,
    auth_service: AuthenticationService,
    raw_token: Optional[str] = None,
) -> Dict[str, Any]:
    memberships = await auth_service.user_repo.get_memberships_for_user(user.id)
    primary_membership = memberships[0] if memberships else None

    company_id = primary_membership.company_id if primary_membership else 1
    is_owner = primary_membership.is_owner if primary_membership else False
    is_platform_admin = getattr(user, "is_platform_admin", False)

    org_repo = OrganizationRepository()
    company_branches = await org_repo.list_branches_for_company(company_id)

    branches = []
    for b in company_branches:
        branches.append({
            "id": b.id,
            "slug": b.slug,
            "name": b.name,
            "roleName": "Owner" if is_owner else "Staff",
            "permissions": ALL_PERMISSIONS,
        })

    if not branches:
        branches.append({
            "id": 1,
            "slug": "main",
            "name": "Main Branch",
            "roleName": "Owner" if is_owner else "Staff",
            "permissions": ALL_PERMISSIONS,
        })

    org = await org_repo.get_by_id(company_id)
    org_name = org.name if org else "Hospital Organization"

    mem_dto = MembershipDTO.model_validate(primary_membership).model_dump() if primary_membership else None

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "mobile": user.mobile or user.phone or "",
            "isOwner": is_owner,
            "is_owner": is_owner,
            "isPlatformAdmin": is_platform_admin,
            "is_platform_admin": is_platform_admin,
            "role": user.role,
        },
        "organization": {
            "id": company_id,
            "name": org_name,
            "modulesOff": [],
            "maxBranches": 10,
            "maxStaff": 50,
            "plan": {
                "paidUntil": None,
                "graceDays": 7,
            },
        },
        "branches": branches,
        "membership": mem_dto,
        "token": raw_token,
    }


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

    data = await build_auth_payload(user, auth_service, raw_token=raw_token)
    return api_response(
        data=data,
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
    data = await build_auth_payload(user, auth_service, raw_token=token)
    return api_response(
        data=data,
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

