"""Organization onboarding and hierarchical scoping service."""

from typing import Any, Optional
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import transaction
from src.models.global_schema.organizations import Organization
from src.models.public.hierarchy import Branch, InventoryLocation, Region, RegionInventory
from src.repository.inventory_repository import InventoryRepository
from src.repository.organization_repository import OrganizationRepository
from src.repository.region_repository import RegionRepository
from src.validation.organization_validation import validate_gstin, validate_slug


class OrganizationService:
    def __init__(self) -> None:
        self.org_repo = OrganizationRepository()
        self.region_repo = RegionRepository()
        self.inv_repo = InventoryRepository()

    async def create_organization(self, name: str, slug: str, billing_tier: str = "starter") -> Organization:
        valid_slug = validate_slug(slug)
        existing = await self.org_repo.get_by_slug(valid_slug)
        if existing:
            raise AppException(f"Organization slug '{valid_slug}' is already registered.", code=ErrorCode.CONFLICT)

        org = Organization(
            name=name.strip(),
            code_prefix=valid_slug.upper()[:10],
            plan_name=billing_tier,
            is_active=True,
        )
        async with transaction() as session:
            return await self.org_repo.save(org, session=session)

    async def create_region(self, company_id: int, name: str, code: str, description: Optional[str] = None) -> Region:
        existing = await self.region_repo.get_by_code(company_id, code)
        if existing:
            raise AppException(f"Region code '{code}' already exists in this organization.", code=ErrorCode.CONFLICT)

        region = Region(company_id=company_id, name=name.strip(), code=code.strip().upper(), description=description)
        async with transaction() as session:
            return await self.region_repo.save(region, session=session)

    async def create_inventory_location(
        self,
        company_id: int,
        name: str,
        code: str,
        loc_type: str = "pharmacy",
        address: Optional[str] = None,
    ) -> InventoryLocation:
        inv = InventoryLocation(
            company_id=company_id,
            name=name.strip(),
            code=code.strip().upper(),
            type=loc_type,
            address=address,
            is_active=True,
        )
        async with transaction() as session:
            return await self.inv_repo.save(inv, session=session)

    async def associate_region_inventory(
        self,
        company_id: int,
        region_id: int,
        inventory_id: int,
    ) -> RegionInventory:
        """Enforces that region and inventory location belong to the same company before linking."""
        region = await self.region_repo.get_by_id(region_id)
        if not region or region.company_id != company_id:
            raise AppException("Region not found or belongs to another company.", code=ErrorCode.NOT_FOUND)

        inv = await self.inv_repo.get_by_id(inventory_id)
        if not inv or inv.company_id != company_id:
            raise AppException("Inventory location not found or belongs to another company.", code=ErrorCode.NOT_FOUND)

        async with transaction() as session:
            return await self.region_repo.associate_inventory(
                company_id=company_id,
                region_id=region_id,
                inventory_id=inventory_id,
                session=session,
            )

