"""Billing and invoice endpoints."""

from typing import List
from fastapi import APIRouter, Depends, Query
from src.api.dependencies import BranchContext, require_permission
from src.constants.permissions import Permission
from src.schemas.billing_schema import (
    InvoiceCreateRequest,
    InvoiceDTO,
    PaymentCreateRequest,
    PaymentReceiptDTO,
)
from src.service.billing_service import BillingService

router = APIRouter(prefix="/b/{branch_slug}/billing", tags=["Billing"])


@router.get("/invoices", response_model=List[InvoiceDTO])
async def list_invoices(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    context: BranchContext = Depends(require_permission(Permission.BILLING_INVOICE_READ)),
    billing_service: BillingService = Depends(),
) -> List[InvoiceDTO]:
    invoices = await billing_service.billing_repo.list_for_branch(
        branch_id=context.branch_id,
        limit=limit,
        offset=offset,
    )
    return [InvoiceDTO.model_validate(inv) for inv in invoices]


@router.post("/invoices", response_model=InvoiceDTO)
async def create_invoice(
    payload: InvoiceCreateRequest,
    context: BranchContext = Depends(require_permission(Permission.BILLING_INVOICE_CREATE)),
    billing_service: BillingService = Depends(),
) -> InvoiceDTO:
    invoice = await billing_service.create_invoice(
        company_id=context.company_id,
        branch_id=context.branch_id,
        code_prefix=context.code_prefix,
        patient_id=payload.patient_id,
        lines_data=payload.lines,
        discount_paise=payload.discount_paise,
        visit_id=payload.visit_id,
        actor_id=context.user.id,
    )
    return InvoiceDTO.model_validate(invoice)


@router.post("/invoices/{invoice_id}/payments", response_model=PaymentReceiptDTO)
async def record_payment(
    invoice_id: int,
    payload: PaymentCreateRequest,
    context: BranchContext = Depends(require_permission(Permission.BILLING_PAYMENT)),
    billing_service: BillingService = Depends(),
) -> PaymentReceiptDTO:
    payment = await billing_service.record_payment(
        invoice_id=invoice_id,
        code_prefix=context.code_prefix,
        amount_paise=payload.amount_paise,
        payment_method=payload.payment_method,
        ref_no=payload.ref_no,
        actor_id=context.user.id,
    )
    return PaymentReceiptDTO.model_validate(payment)

