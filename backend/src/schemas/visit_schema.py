"""Outpatient visit request and response schemas."""

from typing import List, Optional
from pydantic import BaseModel
from src.schemas.common import BaseSchema


class VitalsUpdateRequest(BaseModel):
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    temperature_f: Optional[str] = None
    weight_kg: Optional[str] = None


class PrescriptionItemCreate(BaseModel):
    drug_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None


class VisitCreateRequest(BaseModel):
    patient_id: int
    doctor_id: Optional[int] = None
    chief_complaint: Optional[str] = None


class VisitDTO(BaseSchema):
    id: int
    company_id: int
    branch_id: int
    patient_id: int
    doctor_id: Optional[int] = None
    token_no: str
    status: str
    chief_complaint: Optional[str] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    pulse: Optional[int] = None

