"""Billing and invoice request/response schemas."""

from typing import List, Optional
from pydantic import BaseModel
from src.schemas.common import BaseSchema


class InvoiceLineCreate(BaseModel):
    item_type: str
    description: str
    quantity: int = 1
    unit_price_paise: int
    hsn_sac_code: Optional[str] = None


class InvoiceCreateRequest(BaseModel):
    patient_id: int
    visit_id: Optional[int] = None
    discount_paise: int = 0
    lines: List[InvoiceLineCreate]


class PaymentCreateRequest(BaseModel):
    amount_paise: int
    payment_method: str = "cash"
    ref_no: Optional[str] = None


class InvoiceDTO(BaseSchema):
    id: int
    company_id: int
    branch_id: int
    patient_id: int
    visit_id: Optional[int] = None
    invoice_no: str
    status: str
    subtotal_paise: int
    discount_paise: int
    tax_paise: int
    total_paise: int
    paid_paise: int
    balance_paise: int


class PaymentReceiptDTO(BaseSchema):
    id: int
    invoice_id: int
    receipt_no: str
    amount_paise: int
    payment_method: str

