"""Pharmacy and FEFO Inventory repository."""

from datetime import date
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_all, execute_one_or_none, save_entity
from src.models.public.pharmacy import InventoryBatch, InventoryMovement, Medicine, PharmacySale, PharmacySaleLine
from src.repository.base import BaseRepository


class PharmacyRepository(BaseRepository[Medicine]):
    def __init__(self) -> None:
        super().__init__(Medicine)

    async def list_for_branch(
        self,
        branch_id: int,
        search: Optional[str] = None,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[Medicine]:
        stmt = select(Medicine).where(
            Medicine.branch_id == branch_id,
            Medicine.deleted_at.is_(None),
        ).order_by(Medicine.name.asc())
        if search:
            stmt = stmt.where(Medicine.name.ilike(f"%{search}%"))
        return await execute_all(stmt, session=session)

    async def get_fefo_batches(
        self,
        inventory_id: int,
        medicine_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[InventoryBatch]:
        """Returns sellable stock batches adhering to First-Expiry-First-Out (FEFO)."""
        stmt = (
            select(InventoryBatch)
            .where(
                InventoryBatch.inventory_id == inventory_id,
                InventoryBatch.medicine_id == medicine_id,
                InventoryBatch.quantity > 0,
                InventoryBatch.expiry_date >= date.today(),
            )
            .order_by(InventoryBatch.expiry_date.asc(), InventoryBatch.id.asc())
        )
        return await execute_all(stmt, session=session)

    async def record_movement(
        self,
        movement: InventoryMovement,
        session: AsyncSession,
    ) -> InventoryMovement:
        return await save_entity(movement, session=session)

    async def create_sale(
        self,
        sale: PharmacySale,
        session: AsyncSession,
    ) -> PharmacySale:
        return await save_entity(sale, session=session)

    async def add_sale_line(
        self,
        line: PharmacySaleLine,
        session: AsyncSession,
    ) -> PharmacySaleLine:
        return await save_entity(line, session=session)

