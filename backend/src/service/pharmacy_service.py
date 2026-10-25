"""Pharmacy retail sales and FEFO batch allocation service."""

from typing import Any, List, Optional
from src.constants.errors import ErrorCode
from src.constants.statuses import StockMovementType
from src.core.exceptions import AppException
from src.dal import transaction
from src.helpers.identifier_helper import generate_invoice_no
from src.models.public.pharmacy import InventoryMovement, PharmacySale, PharmacySaleLine
from src.repository.audit_repository import AuditRepository
from src.repository.pharmacy_repository import PharmacyRepository
from src.schemas.pharmacy_schema import SaleItemRequest
from src.validation.pharmacy_validation import validate_batch_not_expired, validate_dispense_quantity


class PharmacyService:
    def __init__(self) -> None:
        self.pharmacy_repo = PharmacyRepository()
        self.audit_repo = AuditRepository()

    async def process_sale(
        self,
        company_id: int,
        branch_id: int,
        inventory_id: int,
        items: List[SaleItemRequest],
        patient_id: Optional[int] = None,
        visit_id: Optional[int] = None,
        payment_mode: str = "cash",
        actor_id: Optional[int] = None,
    ) -> PharmacySale:
        if not items:
            raise AppException("Sale must contain at least one medicine item.", code=ErrorCode.VALIDATION_ERROR)

        async with transaction() as session:
            seq_val = await self.audit_repo.get_next_branch_sequence(
                branch_id=branch_id,
                counter_name="pharmacy_sale",
                session=session,
            )
            sale_no = f"SALE-{seq_val:05d}"

            total_paise = 0
            allocated_lines: List[PharmacySaleLine] = []

            for item in items:
                med = await self.pharmacy_repo.get_by_id(item.medicine_id, session=session)
                if not med or med.branch_id != branch_id:
                    raise AppException(f"Medicine ID {item.medicine_id} not found.", code=ErrorCode.NOT_FOUND)

                # Fetch batches adhering strictly to FEFO (earliest expiry first)
                batches = await self.pharmacy_repo.get_fefo_batches(
                    inventory_id=inventory_id,
                    medicine_id=item.medicine_id,
                    session=session,
                )
                available = sum(b.quantity for b in batches)
                validate_dispense_quantity(item.quantity, available, med.name)

                remaining = item.quantity
                for b in batches:
                    if remaining <= 0:
                        break
                    validate_batch_not_expired(b.expiry_date, b.batch_no)

                    deduct = min(b.quantity, remaining)
                    b.quantity -= deduct
                    remaining -= deduct
                    line_total = deduct * med.price_paise
                    total_paise += line_total

                    line = PharmacySaleLine(
                        medicine_id=med.id,
                        batch_id=b.id,
                        quantity=deduct,
                        unit_price_paise=med.price_paise,
                        total_paise=line_total,
                    )
                    allocated_lines.append(line)

                    # Append to stock movement ledger
                    movement = InventoryMovement(
                        company_id=company_id,
                        inventory_id=inventory_id,
                        medicine_id=med.id,
                        batch_id=b.id,
                        movement_type=str(StockMovementType.OUTWARD_SALE),
                        quantity_delta=-deduct,
                        balance_after=b.quantity,
                        reference_type="pharmacy_sale",
                        created_by=actor_id or 1,
                    )
                    await self.pharmacy_repo.record_movement(movement, session=session)

            sale = PharmacySale(
                company_id=company_id,
                branch_id=branch_id,
                inventory_id=inventory_id,
                sale_no=sale_no,
                visit_id=visit_id,
                patient_id=patient_id,
                total_paise=total_paise,
                payment_mode=payment_mode,
                is_direct_otc=(visit_id is None),
                created_by=actor_id or 1,
            )
            saved_sale = await self.pharmacy_repo.create_sale(sale, session=session)

            for line in allocated_lines:
                line.sale_id = saved_sale.id
                await self.pharmacy_repo.add_sale_line(line, session=session)

            return saved_sale

