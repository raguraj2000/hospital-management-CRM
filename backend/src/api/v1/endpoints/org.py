"""Organization & Branch Network Management Router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, select, update
from src.api.dependencies import get_current_user
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, execute_scalar, save_entity, transaction
from src.models.global_schema.authorization import Permission, Role, RolePermission
from src.models.global_schema.organizations import Organization
from src.models.global_schema.users import OrganizationMembership, User
from src.models.public.hierarchy import Branch
from src.schemas.common import api_response

router = APIRouter(prefix="/org", tags=["Organization & Branch Management"])


async def get_user_company_id(user: User) -> int:
    stmt = (
        select(OrganizationMembership.company_id)
        .where(OrganizationMembership.user_id == user.id, OrganizationMembership.is_active == True)
        .limit(1)
    )
    cid = await execute_scalar(stmt)
    if not cid:
        raise AppException("User has no associated organization.", code=ErrorCode.FORBIDDEN, status_code=403)
    return int(cid)


class BranchCreatePayload(BaseModel):
    name: str
    slug: str
    address: Optional[str] = None
    phone: Optional[str] = None
    allowed_networks: Optional[str] = Field(None, alias="allowedNetworks")


class BranchUpdatePayload(BaseModel):
    branch_id: Optional[int] = Field(None, alias="branchId")
    branch_slug: Optional[str] = Field(None, alias="branchSlug")
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")
    allowed_networks: Optional[str] = Field(None, alias="allowedNetworks")


class RolePermissionsUpdatePayload(BaseModel):
    role_id: int = Field(..., alias="roleId")
    branch_id: Optional[int] = Field(None, alias="branchId")
    permissions: List[str] = []
    all_branches: bool = Field(False, alias="allBranches")
    reset: bool = False


class OwnerUpdatePayload(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    organization_name: Optional[str] = Field(None, alias="organizationName")


@router.get("/list-branches")
async def list_branches(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    company_id = await get_user_company_id(current_user)
    stmt = select(Branch).where(Branch.company_id == company_id).order_by(Branch.id)
    branches = await execute_all(stmt)
    return api_response(
        data={"branches": [{
            "id": b.id,
            "slug": b.slug,
            "name": b.name,
            "address": b.address,
            "phone": b.phone,
            "is_active": b.is_active,
            "code_prefix": b.code_prefix,
        } for b in branches]},
        message="Branches retrieved successfully",
    )


@router.post("/create-branch")
async def create_branch(
    payload: BranchCreatePayload,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    company_id = await get_user_company_id(current_user)

    existing = await execute_one_or_none(
        select(Branch).where(Branch.company_id == company_id, Branch.slug == payload.slug)
    )
    if existing:
        raise AppException("Another branch uses that slug/address", code=ErrorCode.CONFLICT, status_code=409)

    code_prefix = payload.slug.replace("-", "").upper()[:6]
    async with transaction() as session:
        b = Branch(
            company_id=company_id,
            name=payload.name.strip(),
            slug=payload.slug.strip(),
            address=payload.address,
            phone=payload.phone,
            code_prefix=code_prefix,
            is_active=True,
        )
        saved = await save_entity(b, session=session)

    return api_response(
        data={"branch": {"id": saved.id, "slug": saved.slug, "name": saved.name}},
        message="Branch created successfully",
        status_code=201,
    )


@router.patch("/update-branch")
@router.patch("/update-branch-settings")
async def update_branch(
    payload: BranchUpdatePayload,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    company_id = await get_user_company_id(current_user)

    stmt = select(Branch).where(Branch.company_id == company_id)
    if payload.branch_id is not None:
        stmt = stmt.where(Branch.id == payload.branch_id)
    elif payload.branch_slug:
        stmt = stmt.where(Branch.slug == payload.branch_slug)
    else:
        raise AppException("branch_id or branch_slug is required.", code=ErrorCode.BAD_REQUEST, status_code=400)

    b = await execute_one_or_none(stmt)
    if not b:
        raise AppException("Branch not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.name is not None:
        vals["name"] = payload.name
    if payload.address is not None:
        vals["address"] = payload.address
    if payload.phone is not None:
        vals["phone"] = payload.phone
    if payload.is_active is not None:
        vals["is_active"] = payload.is_active

    if vals:
        async with transaction() as session:
            up_stmt = update(Branch).where(Branch.id == b.id).values(**vals)
            await execute_dml(up_stmt, session=session)

    return api_response(data={"ok": True, "branch_id": b.id}, message="Branch updated successfully")


@router.get("/list-roles")
async def list_roles(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    company_id = await get_user_company_id(current_user)
    stmt = select(Role).where((Role.company_id == company_id) | (Role.company_id.is_(None)))
    roles = await execute_all(stmt)
    return api_response(
        data={"roles": [{
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "description": r.description,
            "is_system": r.is_system,
        } for r in roles]},
        message="Roles retrieved successfully",
    )


@router.put("/update-role-permissions")
async def update_role_permissions(
    payload: RolePermissionsUpdatePayload,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    company_id = await get_user_company_id(current_user)
    role = await execute_one_or_none(select(Role).where(Role.id == payload.role_id))
    if not role:
        raise AppException("Role not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        del_stmt = delete(RolePermission).where(RolePermission.role_id == payload.role_id)
        await execute_dml(del_stmt, session=session)

        for perm_key in payload.permissions:
            p = await execute_one_or_none(select(Permission).where(Permission.key == perm_key))
            if p:
                rp = RolePermission(role_id=role.id, permission_id=p.id)
                await save_entity(rp, session=session)

    return api_response(data={"ok": True, "permissions": payload.permissions}, message="Role permissions updated successfully")


@router.get("/list-branch-roles")
async def list_branch_roles(
    branch_id: Optional[int] = Query(None, alias="branchId"),
    branch_slug: Optional[str] = Query(None, alias="branchSlug"),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    company_id = await get_user_company_id(current_user)
    stmt = select(Role).where((Role.company_id == company_id) | (Role.company_id.is_(None)))
    roles = await execute_all(stmt)
    return api_response(
        data={"roles": [{
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "description": r.description,
        } for r in roles]},
        message="Branch roles retrieved successfully",
    )


@router.put("/update-branch-role-permissions")
async def update_branch_role_permissions(
    payload: RolePermissionsUpdatePayload,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return await update_role_permissions(payload, current_user)


@router.get("/my-network")
async def my_network(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    client_ip = request.client.host if request.client else "127.0.0.1"
    parts = client_ip.split(".")
    suggestion = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24" if len(parts) == 4 else f"{client_ip}/32"
    return api_response(data={"ip": client_ip, "suggestion": suggestion}, message="Network detected successfully")


@router.patch("/update-owner")
async def update_owner(
    payload: OwnerUpdatePayload,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    company_id = await get_user_company_id(current_user)
    async with transaction() as session:
        if payload.name or payload.mobile:
            user_vals: Dict[str, Any] = {}
            if payload.name:
                user_vals["name"] = payload.name
            if payload.mobile:
                user_vals["mobile"] = payload.mobile
                user_vals["username"] = payload.mobile
            up_u = update(User).where(User.id == current_user.id).values(**user_vals)
            await execute_dml(up_u, session=session)

        if payload.organization_name:
            up_o = update(Organization).where(Organization.id == company_id).values(name=payload.organization_name)
            await execute_dml(up_o, session=session)

    return api_response(data={"ok": True}, message="Owner and organization details updated successfully")
