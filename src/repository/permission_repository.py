"""Authorization and Permission evaluation repository."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_one_or_none, execute_scalar
from src.models.global_schema.authorization import (
    Permission,
    Role,
    RolePermission,
    UserPermissionOverride,
    UserRole,
)
from src.models.global_schema.users import OrganizationMembership


class PermissionRepository:
    """Evaluates fine-grained authorization with deterministic precedence."""

    async def has_permission(
        self,
        user_id: int,
        company_id: int,
        permission_key: str,
        region_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        inventory_id: Optional[int] = None,
        session: Optional[AsyncSession] = None,
    ) -> bool:
        # 1. Check Company Owner status
        owner_stmt = select(OrganizationMembership.is_owner).where(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.company_id == company_id,
            OrganizationMembership.is_active == True,
        )
        is_owner = await execute_scalar(owner_stmt, session=session)
        if is_owner is True:
            return True

        # 2. Resolve Permission ID
        perm_stmt = select(Permission.id).where(Permission.key == permission_key)
        perm_id = await execute_scalar(perm_stmt, session=session)
        if not perm_id:
            return False

        # 3. Check Explicit User Overrides (Region/Branch/Inventory scope > Company scope)
        override_stmt = (
            select(UserPermissionOverride.is_granted)
            .where(
                UserPermissionOverride.user_id == user_id,
                UserPermissionOverride.company_id == company_id,
                UserPermissionOverride.permission_id == perm_id,
            )
            .order_by(
                UserPermissionOverride.region_id.is_not(None).desc(),
                UserPermissionOverride.branch_id.is_not(None).desc(),
                UserPermissionOverride.inventory_id.is_not(None).desc(),
                UserPermissionOverride.id.desc(),
            )
            .limit(1)
        )
        override = await execute_scalar(override_stmt, session=session)
        if override is not None:
            return bool(override)

        # 4. Check Active Scoped Role Grants
        role_stmt = (
            select(UserRole.id)
            .join(RolePermission, RolePermission.role_id == UserRole.role_id)
            .where(
                UserRole.user_id == user_id,
                UserRole.company_id == company_id,
                UserRole.is_active == True,
                RolePermission.permission_id == perm_id,
            )
            .limit(1)
        )
        has_role = await execute_scalar(role_stmt, session=session)
        return has_role is not None

