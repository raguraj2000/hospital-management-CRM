"""Outpatient visit consultation and queue service."""

from datetime import datetime, timezone
from typing import Any, Optional
from src.constants.errors import ErrorCode
from src.constants.events import AuditEvent
from src.constants.statuses import VisitStatus
from src.core.exceptions import AppException
from src.dal import transaction
from src.helpers.identifier_helper import generate_token_no
from src.models.public.clinical import OpVisit
from src.repository.audit_repository import AuditRepository
from src.repository.visit_repository import VisitRepository
from src.validation.clinical_validation import validate_visit_transition


class VisitService:
    def __init__(self) -> None:
        self.visit_repo = VisitRepository()
        self.audit_repo = AuditRepository()

    async def create_visit(
        self,
        company_id: int,
        branch_id: int,
        patient_id: int,
        doctor_id: Optional[int] = None,
        chief_complaint: Optional[str] = None,
        actor_id: Optional[int] = None,
    ) -> OpVisit:
        active = await self.visit_repo.get_active_visit_for_patient(patient_id)
        if active:
            raise AppException(
                f"Patient already has an active visit (Token: {active.token_no}).",
                code=ErrorCode.CONFLICT,
            )

        async with transaction() as session:
            seq_val = await self.audit_repo.get_next_branch_sequence(
                branch_id=branch_id,
                counter_name="op_token",
                session=session,
            )
            token = generate_token_no(seq_val)

            visit = OpVisit(
                company_id=company_id,
                branch_id=branch_id,
                patient_id=patient_id,
                doctor_id=doctor_id,
                token_no=token,
                status=str(VisitStatus.REGISTERED),
                chief_complaint=chief_complaint,
            )
            saved = await self.visit_repo.save(visit, session=session)

            await self.audit_repo.log_event(
                company_id=company_id,
                branch_id=branch_id,
                user_id=actor_id,
                action=str(AuditEvent.VISIT_CREATED),
                entity_type="op_visit",
                entity_id=saved.id,
                session=session,
            )
            return saved

    async def update_vitals(
        self,
        visit_id: int,
        bp_systolic: Optional[int] = None,
        bp_diastolic: Optional[int] = None,
        pulse: Optional[int] = None,
        temperature_f: Optional[str] = None,
        weight_kg: Optional[str] = None,
    ) -> OpVisit:
        visit = await self.visit_repo.get_by_id(visit_id)
        if not visit:
            raise AppException("Visit not found.", code=ErrorCode.NOT_FOUND)

        if bp_systolic is not None:
            visit.bp_systolic = bp_systolic
        if bp_diastolic is not None:
            visit.bp_diastolic = bp_diastolic
        if pulse is not None:
            visit.pulse = pulse
        if temperature_f is not None:
            visit.temperature_f = temperature_f
        if weight_kg is not None:
            visit.weight_kg = weight_kg

        async with transaction() as session:
            return await self.visit_repo.save(visit, session=session)

    async def complete_visit(self, visit_id: int, actor_id: Optional[int] = None) -> OpVisit:
        visit = await self.visit_repo.get_by_id(visit_id)
        if not visit:
            raise AppException("Visit not found.", code=ErrorCode.NOT_FOUND)

        validate_visit_transition(visit.status, str(VisitStatus.COMPLETED))
        visit.status = str(VisitStatus.COMPLETED)
        visit.completed_at = datetime.now(timezone.utc)

        async with transaction() as session:
            saved = await self.visit_repo.save(visit, session=session)
            await self.audit_repo.log_event(
                company_id=visit.company_id,
                branch_id=visit.branch_id,
                user_id=actor_id,
                action=str(AuditEvent.VISIT_COMPLETED),
                entity_type="op_visit",
                entity_id=saved.id,
                session=session,
            )
            return saved

