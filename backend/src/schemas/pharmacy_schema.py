"""Pharmacy and FEFO inventory schemas."""

from datetime import date
from typing import List, Optional
from pydantic import BaseModel
from src.schemas.common import BaseSchema


class MedicineCreateRequest(BaseModel):
    name: str
    form: str
    strength: Optional[str] = None
    price_paise: int
    reorder_level: int = 10


class MedicineDTO(BaseSchema):
    id: int
    name: str
    form: str
    strength: Optional[str] = None
    price_paise: int
    reorder_level: int


class MedicineWithStockDTO(MedicineDTO):
    total_available_stock: int
    earliest_expiry_date: Optional[date] = None
    stock_status: str


class SaleItemRequest(BaseModel):
    medicine_id: int
    quantity: int


class PharmacySaleRequest(BaseModel):
    patient_id: Optional[int] = None
    visit_id: Optional[int] = None
    payment_mode: str = "cash"
    items: List[SaleItemRequest]


class PharmacySaleDTO(BaseSchema):
    id: int
    sale_no: str
    total_paise: int
    payment_mode: str

