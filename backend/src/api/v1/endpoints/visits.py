"""Outpatient visit consultation endpoints."""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from src.api.dependencies import BranchContext, require_permission
from src.constants.permissions import Permission
from src.schemas.visit_schema import VisitCreateRequest, VisitDTO, VitalsUpdateRequest
from src.service.visit_service import VisitService

router = APIRouter(prefix="/b/{branch_slug}/visits", tags=["Visits"])


@router.get("", response_model=List[VisitDTO])
async def list_visits(
    visit_date: Optional[date] = Query(default_factory=date.today),
    status: Optional[str] = Query(None),
    context: BranchContext = Depends(require_permission(Permission.OP_VISIT_READ)),
    visit_service: VisitService = Depends(),
) -> List[VisitDTO]:
    visits = await visit_service.visit_repo.list_for_branch_by_date(
        branch_id=context.branch_id,
        visit_date=visit_date or date.today(),
        status=status,
    )
    return [VisitDTO.model_validate(v) for v in visits]


@router.post("", response_model=VisitDTO)
async def create_visit(
    payload: VisitCreateRequest,
    context: BranchContext = Depends(require_permission(Permission.OP_VISIT_CREATE)),
    visit_service: VisitService = Depends(),
) -> VisitDTO:
    visit = await visit_service.create_visit(
        company_id=context.company_id,
        branch_id=context.branch_id,
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        chief_complaint=payload.chief_complaint,
        actor_id=context.user.id,
    )
    return VisitDTO.model_validate(visit)


@router.patch("/{visit_id}/vitals", response_model=VisitDTO)
async def update_vitals(
    visit_id: int,
    payload: VitalsUpdateRequest,
    context: BranchContext = Depends(require_permission(Permission.CLINICAL_WRITE)),
    visit_service: VisitService = Depends(),
) -> VisitDTO:
    visit = await visit_service.update_vitals(
        visit_id=visit_id,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
        pulse=payload.pulse,
        temperature_f=payload.temperature_f,
        weight_kg=payload.weight_kg,
    )
    return VisitDTO.model_validate(visit)


@router.post("/{visit_id}/complete", response_model=VisitDTO)
async def complete_visit(
    visit_id: int,
    context: BranchContext = Depends(require_permission(Permission.CLINICAL_WRITE)),
    visit_service: VisitService = Depends(),
) -> VisitDTO:
    visit = await visit_service.complete_visit(visit_id=visit_id, actor_id=context.user.id)
    return VisitDTO.model_validate(visit)

