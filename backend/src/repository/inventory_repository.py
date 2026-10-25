"""Inventory Location repository."""

from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_all, execute_one_or_none
from src.models.public.hierarchy import InventoryLocation, RegionInventory
from src.repository.base import BaseRepository


class InventoryRepository(BaseRepository[InventoryLocation]):
    def __init__(self) -> None:
        super().__init__(InventoryLocation)

    async def list_by_company(
        self,
        company_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[InventoryLocation]:
        stmt = select(InventoryLocation).where(
            InventoryLocation.company_id == company_id,
            InventoryLocation.is_active == True,
        )
        return await execute_all(stmt, session=session)

    async def list_for_region(
        self,
        company_id: int,
        region_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[InventoryLocation]:
        """Resolves all inventory locations mapped to a region via M:N region_inventory junction."""
        stmt = (
            select(InventoryLocation)
            .join(RegionInventory, RegionInventory.inventory_id == InventoryLocation.id)
            .where(
                RegionInventory.company_id == company_id,
                RegionInventory.region_id == region_id,
                RegionInventory.is_active == True,
                InventoryLocation.is_active == True,
            )
        )
        return await execute_all(stmt, session=session)

