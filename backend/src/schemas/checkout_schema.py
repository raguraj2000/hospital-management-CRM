"""Atomic OPD + Pharmacy checkout schemas."""

from typing import List, Optional
from pydantic import BaseModel
from src.schemas.billing_schema import InvoiceDTO, PaymentReceiptDTO
from src.schemas.common import BaseSchema
from src.schemas.pharmacy_schema import SaleItemRequest


class CheckoutRequest(BaseModel):
    patient_id: int
    visit_id: int
    consultation_fee_paise: int = 0
    procedure_charges_paise: int = 0
    discount_paise: int = 0
    pharmacy_items: List[SaleItemRequest] = []
    payment_method: str = "cash"


class CheckoutResponse(BaseSchema):
    invoice: InvoiceDTO
    receipt: PaymentReceiptDTO

