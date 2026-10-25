"""Outpatient Visit repository."""

from datetime import date
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_all, execute_one_or_none, execute_scalar
from src.models.public.clinical import OpVisit, PrescriptionItem
from src.repository.base import BaseRepository


class VisitRepository(BaseRepository[OpVisit]):
    def __init__(self) -> None:
        super().__init__(OpVisit)

    async def list_for_branch_by_date(
        self,
        branch_id: int,
        visit_date: date,
        status: Optional[str] = None,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[OpVisit]:
        from sqlalchemy import func
        stmt = (
            select(OpVisit)
            .where(
                OpVisit.branch_id == branch_id,
                func.date(OpVisit.created_at) == visit_date,
                OpVisit.deleted_at.is_(None),
            )
            .order_by(OpVisit.id.asc())
        )
        if status:
            stmt = stmt.where(OpVisit.status == status)
        return await execute_all(stmt, session=session)

    async def get_active_visit_for_patient(
        self,
        patient_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Optional[OpVisit]:
        stmt = (
            select(OpVisit)
            .where(
                OpVisit.patient_id == patient_id,
                OpVisit.status.in_(["registered", "waiting", "engaged"]),
                OpVisit.deleted_at.is_(None),
            )
            .order_by(OpVisit.id.desc())
            .limit(1)
        )
        return await execute_one_or_none(stmt, session=session)

    async def get_prescriptions_for_visit(
        self,
        visit_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[PrescriptionItem]:
        stmt = (
            select(PrescriptionItem)
            .where(PrescriptionItem.visit_id == visit_id)
            .order_by(PrescriptionItem.id.asc())
        )
        return await execute_all(stmt, session=session)

