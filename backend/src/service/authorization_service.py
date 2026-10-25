"""Fine-grained permission authorization workflow service."""

from typing import Any, Optional
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.repository.permission_repository import PermissionRepository


class AuthorizationService:
    def __init__(self) -> None:
        self.perm_repo = PermissionRepository()

    async def assert_authorized(
        self,
        user_id: int,
        company_id: int,
        permission_key: str,
        region_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        inventory_id: Optional[int] = None,
    ) -> None:
        has_perm = await self.perm_repo.has_permission(
            user_id=user_id,
            company_id=company_id,
            permission_key=permission_key,
            region_id=region_id,
            branch_id=branch_id,
            inventory_id=inventory_id,
        )
        if not has_perm:
            raise AppException(
                f"Unauthorized: missing required permission '{permission_key}'.",
                code=ErrorCode.FORBIDDEN,
                status_code=403,
            )

