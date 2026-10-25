"""Regulatory Audit Trail and Sequence Counter repository."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_one_or_none, execute_scalar, save_entity
from src.models.public.billing import AuditLog
from src.models.public.hierarchy import BranchCounter
from src.repository.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self) -> None:
        super().__init__(AuditLog)

    async def log_event(
        self,
        company_id: int,
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        user_id: Optional[int] = None,
        diff: Optional[str] = None,
        session: Optional[AsyncSession] = None,
    ) -> AuditLog:
        entry = AuditLog(
            company_id=company_id,
            branch_id=branch_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            diff=diff,
        )
        if session is not None:
            return await save_entity(entry, session=session)
        from src.dal import transaction
        async with transaction() as tx_session:
            return await save_entity(entry, session=tx_session)

    async def get_next_branch_sequence(
        self,
        branch_id: int,
        counter_name: str,
        session: AsyncSession,
    ) -> int:
        """Atomically increments and returns branch sequence counter value."""
        stmt = select(BranchCounter).where(
            BranchCounter.branch_id == branch_id,
            BranchCounter.name == counter_name,
        ).with_for_update()
        counter = await execute_one_or_none(stmt, session=session)
        if counter is None:
            counter = BranchCounter(branch_id=branch_id, name=counter_name, value=1)
            await save_entity(counter, session=session)
            return 1
        counter.value += 1
        await save_entity(counter, session=session)
        return counter.value

