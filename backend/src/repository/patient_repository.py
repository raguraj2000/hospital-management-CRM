"""Patient entity repository."""

from typing import Optional, Sequence
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_all, execute_one_or_none, execute_scalar
from src.models.public.clinical import Patient
from src.repository.base import BaseRepository


class PatientRepository(BaseRepository[Patient]):
    def __init__(self) -> None:
        super().__init__(Patient)

    async def get_by_uhid(
        self,
        company_id: int,
        uhid: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[Patient]:
        stmt = select(Patient).where(
            Patient.company_id == company_id,
            Patient.uhid == uhid,
            Patient.deleted_at.is_(None),
        )
        return await execute_one_or_none(stmt, session=session)

    async def search_patients(
        self,
        company_id: int,
        branch_id: int,
        query: str,
        limit: int = 20,
        offset: int = 0,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[Patient]:
        q = f"%{query}%"
        stmt = (
            select(Patient)
            .where(
                Patient.company_id == company_id,
                Patient.branch_id == branch_id,
                Patient.deleted_at.is_(None),
                or_(Patient.name.ilike(q), Patient.phone.ilike(q), Patient.uhid.ilike(q)),
            )
            .order_by(Patient.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return await execute_all(stmt, session=session)

    async def count_for_branch(
        self,
        branch_id: int,
        session: Optional[AsyncSession] = None,
    ) -> int:
        from sqlalchemy import func
        stmt = select(func.count(Patient.id)).where(
            Patient.branch_id == branch_id,
            Patient.deleted_at.is_(None),
        )
        val = await execute_scalar(stmt, session=session)
        return int(val or 0)

