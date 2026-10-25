"""FastAPI dependencies for authentication, context, and permissions."""

from typing import Any, Callable, Optional
from fastapi import Cookie, Depends, Header, HTTPException, Path, status
from pydantic import BaseModel
from src.constants.application import COOKIE_SESSION_ID
from src.constants.errors import ErrorCode
from src.constants.permissions import Permission
from src.core.exceptions import AppException
from src.models.global_schema.users import User
from src.models.public.hierarchy import Branch
from src.repository.organization_repository import OrganizationRepository
from src.service.authentication_service import AuthenticationService
from src.service.authorization_service import AuthorizationService


class BranchContext(BaseModel):
    user: Any = None
    branch: Any = None
    company_id: int
    branch_id: int
    region_id: Optional[int] = None
    inventory_id: Optional[int] = None
    code_prefix: str


async def get_current_user(
    authorization: Optional[str] = Header(None),
    sid: Optional[str] = Cookie(None, alias=COOKIE_SESSION_ID),
    auth_service: AuthenticationService = Depends(),
) -> User:
    """Extracts session token from Authorization Bearer header or session cookie and resolves active user."""
    token: Optional[str] = None
    if authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:].strip()
        else:
            token = authorization.strip()
    elif sid:
        token = sid.strip()

    if not token:
        raise AppException("Missing authentication token.", code=ErrorCode.UNAUTHORIZED, status_code=401)
    user = await auth_service.verify_session(token)
    if not user or not user.is_active:
        raise AppException("Invalid or expired session.", code=ErrorCode.UNAUTHORIZED, status_code=401)
    return user


async def get_branch_context(
    branch_slug: str = Path(..., description="Branch URL slug"),
    current_user: User = Depends(get_current_user),
    org_repo: OrganizationRepository = Depends(),
) -> BranchContext:
    """
    Resolves branch by slug and verifies tenant isolation (user belongs to branch's company).
    If invalid or belongs to another company, raises 404 to prevent enumeration.
    """
    memberships = await org_repo.user_repo.get_memberships_for_user(current_user.id)
    if not memberships:
        raise AppException("Branch not found.", code=ErrorCode.NOT_FOUND, status_code=404)

    # Search among user's active tenant companies
    matched_branch: Optional[Branch] = None
    matched_company_id: Optional[int] = None

    for m in memberships:
        b = await org_repo.get_branch_by_slug(m.company_id, branch_slug)
        if b:
            matched_branch = b
            matched_company_id = m.company_id
            break

    if not matched_branch or not matched_company_id:
        raise AppException("Branch not found.", code=ErrorCode.NOT_FOUND, status_code=404)

    return BranchContext(
        user=current_user,
        branch=matched_branch,
        company_id=matched_company_id,
        branch_id=matched_branch.id,
        region_id=matched_branch.region_id,
        inventory_id=matched_branch.primary_inventory_id or 1,
        code_prefix=matched_branch.code_prefix,
    )


def require_permission(perm: Permission) -> Callable:
    """Factory creating dependency that asserts user permission within the branch context."""

    async def _dependency(
        context: BranchContext = Depends(get_branch_context),
        authz_service: AuthorizationService = Depends(),
    ) -> BranchContext:
        await authz_service.assert_authorized(
            user_id=context.user.id,
            company_id=context.company_id,
            permission_key=str(perm),
            region_id=context.region_id,
            branch_id=context.branch_id,
            inventory_id=context.inventory_id,
        )
        return context

    return _dependency
