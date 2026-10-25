"""Organization and Multi-Tenant Membership repository."""

from typing import Any, Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_all, execute_one_or_none, save_entity
from src.models.global_schema.organizations import Organization
from src.models.global_schema.users import OrganizationMembership
from src.models.public.hierarchy import Branch
from src.repository.base import BaseRepository
from src.repository.user_repository import UserRepository


class OrganizationRepository(BaseRepository[Organization]):
    def __init__(self) -> None:
        super().__init__(Organization)
        self.user_repo = UserRepository()

    async def get_by_slug(
        self,
        slug: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[Organization]:
        # Organizations identify by code_prefix or name
        stmt = select(Organization).where(
            (Organization.code_prefix.ilike(slug)) | (Organization.name.ilike(slug))
        )
        return await execute_one_or_none(stmt, session=session)

    async def get_membership(
        self,
        company_id: int,
        user_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Optional[OrganizationMembership]:
        stmt = select(OrganizationMembership).where(
            OrganizationMembership.company_id == company_id,
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.is_active == True,
        )
        return await execute_one_or_none(stmt, session=session)

    async def get_branch_by_slug(
        self,
        company_id: int,
        slug: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[Branch]:
        stmt = select(Branch).where(
            Branch.company_id == company_id,
            Branch.slug == slug,
            Branch.is_active == True,
        )
        return await execute_one_or_none(stmt, session=session)

    async def get_branch_by_id(
        self,
        company_id: int,
        branch_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Optional[Branch]:
        stmt = select(Branch).where(
            Branch.company_id == company_id,
            Branch.id == branch_id,
            Branch.is_active == True,
        )
        return await execute_one_or_none(stmt, session=session)

    async def list_branches_for_company(
        self,
        company_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[Branch]:
        stmt = select(Branch).where(
            Branch.company_id == company_id,
            Branch.is_active == True,
        )
        return await execute_all(stmt, session=session)

