"""Patient registration and medical profile service."""

from datetime import date
from typing import Any, Optional, Sequence
from src.constants.events import AuditEvent
from src.dal import transaction
from src.helpers.identifier_helper import generate_uhid
from src.models.public.clinical import Patient
from src.repository.audit_repository import AuditRepository
from src.repository.patient_repository import PatientRepository
from src.validation.common import validate_phone


class PatientService:
    def __init__(self) -> None:
        self.patient_repo = PatientRepository()
        self.audit_repo = AuditRepository()

    async def register_patient(
        self,
        company_id: int,
        branch_id: int,
        name: str,
        phone: str,
        gender: str,
        dob: Optional[date] = None,
        blood_group: Optional[str] = None,
        address: Optional[str] = None,
        actor_id: Optional[int] = None,
    ) -> Patient:
        valid_phone = validate_phone(phone)

        async with transaction() as session:
            # Atomic UHID generation
            seq_val = await self.audit_repo.get_next_branch_sequence(
                branch_id=branch_id,
                counter_name="uhid",
                session=session,
            )
            uhid = generate_uhid(seq_val)

            patient = Patient(
                company_id=company_id,
                branch_id=branch_id,
                uhid=uhid,
                name=name.strip(),
                phone=valid_phone,
                gender=gender.strip().lower(),
                dob=dob,
                blood_group=blood_group,
                address=address,
            )
            saved = await self.patient_repo.save(patient, session=session)

            await self.audit_repo.log_event(
                company_id=company_id,
                branch_id=branch_id,
                user_id=actor_id,
                action=str(AuditEvent.PATIENT_CREATED),
                entity_type="patient",
                entity_id=saved.id,
                session=session,
            )
            return saved

    async def search_patients(
        self,
        company_id: int,
        branch_id: int,
        query: str,
        limit: int = 20,
        offset: int = 0,
    ) -> Sequence[Patient]:
        return await self.patient_repo.search_patients(
            company_id=company_id,
            branch_id=branch_id,
            query=query,
            limit=limit,
            offset=offset,
        )

