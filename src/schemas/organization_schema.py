"""Organization, Region, and Facility schemas."""

from typing import Optional
from pydantic import BaseModel
from src.schemas.common import BaseSchema


class OrganizationCreateRequest(BaseModel):
    name: str
    slug: str
    billing_tier: str = "starter"


class OrganizationDTO(BaseSchema):
    id: int
    name: str
    slug: str
    billing_tier: str
    is_active: bool


class RegionCreateRequest(BaseModel):
    name: str
    code: str
    description: Optional[str] = None


class RegionDTO(BaseSchema):
    id: int
    company_id: int
    name: str
    code: str
    is_active: bool


class BranchCreateRequest(BaseModel):
    name: str
    slug: str
    code_prefix: str
    region_id: Optional[int] = None
    gstin: Optional[str] = None
    state_code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class BranchDTO(BaseSchema):
    id: int
    company_id: int
    region_id: Optional[int] = None
    name: str
    slug: str
    code_prefix: str
    gstin: Optional[str] = None
    is_active: bool

