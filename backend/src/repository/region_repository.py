"""Region and Region-Inventory repository."""

from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_all, execute_one_or_none, save_entity
from src.models.public.hierarchy import Region, RegionInventory
from src.repository.base import BaseRepository


class RegionRepository(BaseRepository[Region]):
    def __init__(self) -> None:
        super().__init__(Region)

    async def list_by_company(
        self,
        company_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[Region]:
        stmt = select(Region).where(Region.company_id == company_id, Region.is_active == True)
        return await execute_all(stmt, session=session)

    async def get_by_code(
        self,
        company_id: int,
        code: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[Region]:
        stmt = select(Region).where(Region.company_id == company_id, Region.code == code)
        return await execute_one_or_none(stmt, session=session)

    async def associate_inventory(
        self,
        company_id: int,
        region_id: int,
        inventory_id: int,
        session: AsyncSession,
    ) -> RegionInventory:
        rel = RegionInventory(
            company_id=company_id,
            region_id=region_id,
            inventory_id=inventory_id,
            is_active=True,
        )
        return await save_entity(rel, session=session)

