"""Branch patient management endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from src.api.dependencies import BranchContext, require_permission
from src.constants.permissions import Permission
from src.schemas.common import PaginatedResponse
from src.schemas.patient_schema import PatientCreateRequest, PatientDTO
from src.service.patient_service import PatientService

router = APIRouter(prefix="/b/{branch_slug}/patients", tags=["Patients"])


@router.get("", response_model=PaginatedResponse[PatientDTO])
async def list_patients(
    q: Optional[str] = Query(None, description="Search by name, phone, or UHID"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    context: BranchContext = Depends(require_permission(Permission.PATIENT_READ)),
    patient_service: PatientService = Depends(),
) -> PaginatedResponse[PatientDTO]:
    offset = (page - 1) * limit
    results = await patient_service.search_patients(
        company_id=context.company_id,
        branch_id=context.branch_id,
        query=q or "",
        limit=limit,
        offset=offset,
    )
    total = await patient_service.patient_repo.count_for_branch(context.branch_id)
    return PaginatedResponse(
        data=[PatientDTO.model_validate(p) for p in results],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("", response_model=PatientDTO)
async def create_patient(
    payload: PatientCreateRequest,
    context: BranchContext = Depends(require_permission(Permission.PATIENT_CREATE)),
    patient_service: PatientService = Depends(),
) -> PatientDTO:
    patient = await patient_service.register_patient(
        company_id=context.company_id,
        branch_id=context.branch_id,
        name=payload.name,
        phone=payload.phone,
        gender=payload.gender,
        dob=payload.dob,
        blood_group=payload.blood_group,
        address=payload.address,
        actor_id=context.user.id,
    )
    return PatientDTO.model_validate(patient)

