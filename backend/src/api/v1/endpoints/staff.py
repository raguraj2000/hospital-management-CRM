"""Staff Management and Role-Based Access Control Router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, update
from src.api.dependencies import BranchContext, get_branch_context, get_current_user
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.core.security import hash_password
from src.dal import execute_all, execute_dml, execute_one_or_none, execute_scalar, save_entity, transaction
from src.models.global_schema.authorization import Permission, Role, RolePermission, UserRole
from src.models.global_schema.users import OrganizationMembership, User
from src.schemas.common import api_response

router = APIRouter(prefix="/staff", tags=["Staff Management"])


class StaffInvitePayload(BaseModel):
    name: str
    mobile: str
    password: str
    role_id: Optional[int] = Field(None, alias="roleId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class StaffUpdateRolePayload(BaseModel):
    user_id: int = Field(..., alias="userId")
    role_id: int = Field(..., alias="roleId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class StaffToggleStatusPayload(BaseModel):
    user_id: int = Field(..., alias="userId")
    action: str = Field("activate", description="'activate' or 'suspend'")
    branch_id: Optional[int] = Field(None, alias="branchId")


class StaffResetPasswordPayload(BaseModel):
    user_id: int = Field(..., alias="userId")
    password: str
    branch_id: Optional[int] = Field(None, alias="branchId")


class StaffRemovePayload(BaseModel):
    user_id: int = Field(..., alias="userId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class RolePermissionUpdatePayload(BaseModel):
    role_id: int = Field(..., alias="roleId")
    permissions: List[str] = []
    branch_id: Optional[int] = Field(None, alias="branchId")


@router.get("/list-roles")
async def list_roles(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(Role).where(
        (Role.company_id == context.company_id) | (Role.company_id.is_(None))
    )
    roles = await execute_all(stmt)
    return api_response(
        data={"roles": [{
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "description": r.description,
        } for r in roles]},
        message="Staff roles retrieved successfully",
    )


@router.put("/update-role-permissions")
async def update_role_permissions(
    payload: RolePermissionUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
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


@router.get("/list-members")
async def list_members(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(User, OrganizationMembership)
        .join(OrganizationMembership, OrganizationMembership.user_id == User.id)
        .where(
            OrganizationMembership.company_id == context.company_id,
            OrganizationMembership.is_active == True,
        )
    )
    rows = await execute_all(stmt)
    members = []
    for u, m in rows:
        members.append({
            "id": u.id,
            "name": u.name,
            "mobile": u.mobile,
            "username": u.username,
            "is_owner": m.is_owner,
            "is_active": u.is_active,
        })
    return api_response(data={"staff": members}, message="Staff members retrieved successfully")


@router.post("/invite-member")
async def invite_member(
    payload: StaffInvitePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    existing = await execute_one_or_none(
        select(User).where((User.mobile == payload.mobile) | (User.username == payload.mobile))
    )
    if existing:
        raise AppException("A user with this mobile number already exists.", code=ErrorCode.CONFLICT, status_code=409)

    pwd_hash = hash_password(payload.password)
    async with transaction() as session:
        new_user = User(
            name=payload.name.strip(),
            mobile=payload.mobile.strip(),
            username=payload.mobile.strip(),
            password_hash=pwd_hash,
            is_active=True,
        )
        saved_user = await save_entity(new_user, session=session)

        membership = OrganizationMembership(
            company_id=context.company_id,
            user_id=saved_user.id,
            is_owner=False,
            is_active=True,
        )
        await save_entity(membership, session=session)

        if payload.role_id:
            user_role = UserRole(
                user_id=saved_user.id,
                company_id=context.company_id,
                branch_id=context.branch_id,
                role_id=payload.role_id,
            )
            await save_entity(user_role, session=session)

    return api_response(
        data={"user": {"id": saved_user.id, "name": saved_user.name, "mobile": saved_user.mobile}},
        message="Staff member invited successfully",
        status_code=201,
    )


@router.delete("/remove-member")
async def remove_member(
    payload: StaffRemovePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    if payload.user_id == context.user.id:
        raise AppException("Cannot remove yourself.", code=ErrorCode.BAD_REQUEST, status_code=400)

    async with transaction() as session:
        del_mem = (
            delete(OrganizationMembership)
            .where(
                OrganizationMembership.company_id == context.company_id,
                OrganizationMembership.user_id == payload.user_id,
            )
        )
        await execute_dml(del_mem, session=session)

        del_roles = (
            delete(UserRole)
            .where(
                UserRole.company_id == context.company_id,
                UserRole.user_id == payload.user_id,
            )
        )
        await execute_dml(del_roles, session=session)

    return api_response(data={"ok": True}, message="Staff member removed successfully")


@router.patch("/update-member-role")
async def update_member_role(
    payload: StaffUpdateRolePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    async with transaction() as session:
        del_old = (
            delete(UserRole)
            .where(
                UserRole.company_id == context.company_id,
                UserRole.user_id == payload.user_id,
            )
        )
        await execute_dml(del_old, session=session)

        new_role = UserRole(
            company_id=context.company_id,
            branch_id=payload.branch_id or context.branch_id,
            user_id=payload.user_id,
            role_id=payload.role_id,
        )
        await save_entity(new_role, session=session)

    return api_response(data={"ok": True}, message="Staff role updated successfully")


@router.post("/toggle-member-status")
async def toggle_member_status(
    payload: StaffToggleStatusPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    is_active = (payload.action.lower() == "activate")
    async with transaction() as session:
        stmt = update(User).where(User.id == payload.user_id).values(is_active=is_active)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "is_active": is_active}, message=f"Staff member {'activated' if is_active else 'suspended'} successfully")


@router.post("/reset-password")
async def reset_password(
    payload: StaffResetPasswordPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    pwd_hash = hash_password(payload.password)
    async with transaction() as session:
        stmt = update(User).where(User.id == payload.user_id).values(password_hash=pwd_hash)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Staff password reset successfully")
