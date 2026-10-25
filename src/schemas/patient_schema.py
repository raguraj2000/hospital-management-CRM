"""Patient request and response DTO schemas."""

from datetime import date
from typing import Optional
from pydantic import BaseModel
from src.schemas.common import BaseSchema


class PatientCreateRequest(BaseModel):
    name: str
    phone: str
    gender: str
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None


class PatientUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None


class PatientDTO(BaseSchema):
    id: int
    company_id: int
    branch_id: int
    uhid: str
    name: str
    phone: str
    gender: str
    dob: Optional[date] = None
    blood_group: Optional[str] = None

