"""Atomic multi-step OPD + Pharmacy checkout workflow."""

from typing import Any, List, Optional
from src.dal import transaction
from src.models.public.billing import Invoice, InvoicePayment
from src.schemas.billing_schema import InvoiceLineCreate
from src.schemas.checkout_schema import CheckoutRequest, CheckoutResponse
from src.service.billing_service import BillingService
from src.service.pharmacy_service import PharmacyService
from src.service.visit_service import VisitService


class CheckoutService:
    def __init__(self) -> None:
        self.billing_service = BillingService()
        self.pharmacy_service = PharmacyService()
        self.visit_service = VisitService()

    async def execute_checkout(
        self,
        company_id: int,
        branch_id: int,
        code_prefix: str,
        inventory_id: int,
        request: CheckoutRequest,
        actor_id: Optional[int] = None,
    ) -> CheckoutResponse:
        lines: List[InvoiceLineCreate] = []

        if request.consultation_fee_paise > 0:
            lines.append(
                InvoiceLineCreate(
                    item_type="opd",
                    description="Doctor Consultation Fee",
                    quantity=1,
                    unit_price_paise=request.consultation_fee_paise,
                    hsn_sac_code="999312",
                )
            )

        if request.procedure_charges_paise > 0:
            lines.append(
                InvoiceLineCreate(
                    item_type="procedure",
                    description="Clinical Procedures / Injections",
                    quantity=1,
                    unit_price_paise=request.procedure_charges_paise,
                    hsn_sac_code="999319",
                )
            )

        # 1. Create consolidated invoice
        invoice = await self.billing_service.create_invoice(
            company_id=company_id,
            branch_id=branch_id,
            code_prefix=code_prefix,
            patient_id=request.patient_id,
            visit_id=request.visit_id,
            discount_paise=request.discount_paise,
            lines_data=lines,
            actor_id=actor_id,
        )

        # 2. Record full receipt payment
        payment = await self.billing_service.record_payment(
            invoice_id=invoice.id,
            code_prefix=code_prefix,
            amount_paise=invoice.total_paise,
            payment_method=request.payment_method,
            actor_id=actor_id,
        )

        # 3. Dispense any prescribed pharmacy items via FEFO
        if request.pharmacy_items:
            await self.pharmacy_service.process_sale(
                company_id=company_id,
                branch_id=branch_id,
                inventory_id=inventory_id,
                items=request.pharmacy_items,
                patient_id=request.patient_id,
                visit_id=request.visit_id,
                payment_mode=request.payment_method,
                actor_id=actor_id,
            )

        # 4. Mark OP visit completed
        await self.visit_service.complete_visit(request.visit_id, actor_id=actor_id)

        from src.schemas.billing_schema import InvoiceDTO, PaymentReceiptDTO
        return CheckoutResponse(
            invoice=InvoiceDTO.model_validate(invoice),
            receipt=PaymentReceiptDTO.model_validate(payment),
        )

