"""Billing, GST invoice creation, and payment receipts service."""

from decimal import Decimal
from typing import Any, List, Optional
from src.constants.errors import ErrorCode
from src.constants.events import AuditEvent
from src.constants.statuses import InvoiceStatus
from src.core.exceptions import AppException
from src.dal import transaction
from src.helpers.identifier_helper import generate_invoice_no, generate_receipt_no
from src.models.public.billing import Invoice, InvoiceLine, InvoicePayment, InvoiceTaxLine
from src.repository.audit_repository import AuditRepository
from src.repository.billing_repository import BillingRepository
from src.schemas.billing_schema import InvoiceLineCreate
from src.validation.billing_validation import validate_cancellation_reason, validate_invoice_totals
from src.validation.common import validate_positive_paise


class BillingService:
    def __init__(self) -> None:
        self.billing_repo = BillingRepository()
        self.audit_repo = AuditRepository()

    async def create_invoice(
        self,
        company_id: int,
        branch_id: int,
        code_prefix: str,
        patient_id: int,
        lines_data: List[InvoiceLineCreate],
        discount_paise: int = 0,
        visit_id: Optional[int] = None,
        actor_id: Optional[int] = None,
    ) -> Invoice:
        if not lines_data:
            raise AppException("Invoice must contain at least one line item.", code=ErrorCode.VALIDATION_ERROR)

        subtotal_paise = 0
        tax_paise = 0

        for line in lines_data:
            validate_positive_paise(line.unit_price_paise, "Unit price")
            line_taxable = line.unit_price_paise * line.quantity
            subtotal_paise += line_taxable

        total_paise = validate_invoice_totals(subtotal_paise, discount_paise, tax_paise)

        async with transaction() as session:
            seq_val = await self.audit_repo.get_next_branch_sequence(
                branch_id=branch_id,
                counter_name="invoice_no",
                session=session,
            )
            invoice_no = generate_invoice_no(code_prefix, seq_val)

            invoice = Invoice(
                company_id=company_id,
                branch_id=branch_id,
                patient_id=patient_id,
                visit_id=visit_id,
                invoice_no=invoice_no,
                status=str(InvoiceStatus.POSTED),
                subtotal_paise=subtotal_paise,
                discount_paise=discount_paise,
                tax_paise=tax_paise,
                round_off_paise=0,
                total_paise=total_paise,
                paid_paise=0,
                balance_paise=total_paise,
                created_by=actor_id or 1,
            )
            saved_inv = await self.billing_repo.save(invoice, session=session)

            for line in lines_data:
                line_taxable = line.unit_price_paise * line.quantity
                inv_line = InvoiceLine(
                    invoice_id=saved_inv.id,
                    item_type=line.item_type,
                    description=line.description,
                    quantity=line.quantity,
                    unit_price_paise=line.unit_price_paise,
                    taxable_amount_paise=line_taxable,
                    tax_amount_paise=0,
                    total_paise=line_taxable,
                )
                saved_line = await self.billing_repo.add_invoice_line(inv_line, session=session)

                # Record immutable tax snapshot
                tax_line = InvoiceTaxLine(
                    line_id=saved_line.id,
                    hsn_sac_code=line.hsn_sac_code or "9993",
                    cgst_rate=Decimal("0.00"),
                    cgst_paise=0,
                    sgst_rate=Decimal("0.00"),
                    sgst_paise=0,
                    igst_rate=Decimal("0.00"),
                    igst_paise=0,
                )
                await self.billing_repo.add_tax_line(tax_line, session=session)

            await self.audit_repo.log_event(
                company_id=company_id,
                branch_id=branch_id,
                user_id=actor_id,
                action=str(AuditEvent.INVOICE_CREATED),
                entity_type="invoice",
                entity_id=saved_inv.id,
                session=session,
            )
            return saved_inv

    async def record_payment(
        self,
        invoice_id: int,
        code_prefix: str,
        amount_paise: int,
        payment_method: str = "cash",
        ref_no: Optional[str] = None,
        actor_id: Optional[int] = None,
    ) -> InvoicePayment:
        validate_positive_paise(amount_paise, "Payment amount")
        inv = await self.billing_repo.get_by_id(invoice_id)
        if not inv:
            raise AppException("Invoice not found.", code=ErrorCode.NOT_FOUND)

        if inv.status == str(InvoiceStatus.CANCELLED):
            raise AppException("Cannot record payment for a cancelled invoice.", code=ErrorCode.BAD_REQUEST)

        async with transaction() as session:
            seq_val = await self.audit_repo.get_next_branch_sequence(
                branch_id=inv.branch_id,
                counter_name="receipt_no",
                session=session,
            )
            receipt_no = generate_receipt_no(code_prefix, seq_val)

            payment = InvoicePayment(
                company_id=inv.company_id,
                invoice_id=inv.id,
                receipt_no=receipt_no,
                amount_paise=amount_paise,
                payment_method=payment_method,
                ref_no=ref_no,
                received_by=actor_id or 1,
            )
            saved_pay = await self.billing_repo.add_payment(payment, session=session)

            inv.paid_paise += amount_paise
            inv.balance_paise = max(0, inv.total_paise - inv.paid_paise)
            if inv.balance_paise == 0:
                inv.status = str(InvoiceStatus.PAID)
            else:
                inv.status = str(InvoiceStatus.PARTIALLY_PAID)

            await self.billing_repo.save(inv, session=session)

            await self.audit_repo.log_event(
                company_id=inv.company_id,
                branch_id=inv.branch_id,
                user_id=actor_id,
                action=str(AuditEvent.PAYMENT_RECORDED),
                entity_type="invoice_payment",
                entity_id=saved_pay.id,
                session=session,
            )
            return saved_pay

