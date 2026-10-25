"""Pharmacy formulary and retail sale endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from src.api.dependencies import BranchContext, require_permission
from src.constants.permissions import Permission
from src.schemas.pharmacy_schema import MedicineDTO, PharmacySaleDTO, PharmacySaleRequest
from src.service.pharmacy_service import PharmacyService

router = APIRouter(prefix="/b/{branch_slug}/pharmacy", tags=["Pharmacy"])


@router.get("/medicines", response_model=List[MedicineDTO])
async def list_medicines(
    q: Optional[str] = Query(None),
    context: BranchContext = Depends(require_permission(Permission.PHARMACY_READ)),
    pharmacy_service: PharmacyService = Depends(),
) -> List[MedicineDTO]:
    medicines = await pharmacy_service.pharmacy_repo.list_for_branch(
        branch_id=context.branch_id,
        search=q,
    )
    return [MedicineDTO.model_validate(m) for m in medicines]


@router.post("/sales", response_model=PharmacySaleDTO)
async def process_pharmacy_sale(
    payload: PharmacySaleRequest,
    context: BranchContext = Depends(require_permission(Permission.PHARMACY_DISPENSE)),
    pharmacy_service: PharmacyService = Depends(),
) -> PharmacySaleDTO:
    sale = await pharmacy_service.process_sale(
        company_id=context.company_id,
        branch_id=context.branch_id,
        inventory_id=context.inventory_id,
        items=payload.items,
        patient_id=payload.patient_id,
        visit_id=payload.visit_id,
        payment_mode=payload.payment_mode,
        actor_id=context.user.id,
    )
    return PharmacySaleDTO.model_validate(sale)

