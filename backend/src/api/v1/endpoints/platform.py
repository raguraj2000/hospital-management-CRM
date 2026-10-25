"""Platform administration and onboarding endpoints."""

from fastapi import APIRouter, Depends
from src.api.dependencies import get_current_user
from src.models.global_schema.users import User
from src.schemas.organization_schema import (
    OrganizationCreateRequest,
    OrganizationDTO,
    RegionCreateRequest,
    RegionDTO,
)
from src.service.organization_service import OrganizationService

router = APIRouter(prefix="/platform", tags=["Platform Admin"])


@router.post("/organizations", response_model=OrganizationDTO)
async def create_organization(
    payload: OrganizationCreateRequest,
    current_user: User = Depends(get_current_user),
    org_service: OrganizationService = Depends(),
) -> OrganizationDTO:
    org = await org_service.create_organization(
        name=payload.name,
        slug=payload.slug,
        billing_tier=payload.billing_tier,
    )
    return OrganizationDTO.model_validate(org)


@router.post("/organizations/{company_id}/regions", response_model=RegionDTO)
async def create_region(
    company_id: int,
    payload: RegionCreateRequest,
    current_user: User = Depends(get_current_user),
    org_service: OrganizationService = Depends(),
) -> RegionDTO:
    region = await org_service.create_region(
        company_id=company_id,
        name=payload.name,
        code=payload.code,
        description=payload.description,
    )
    return RegionDTO.model_validate(region)

