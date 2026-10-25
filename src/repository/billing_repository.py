"""Billing, Invoices, Line Items, and Payments repository."""

from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.dal import execute_all, execute_one_or_none, save_entity
from src.models.public.billing import Invoice, InvoiceLine, InvoicePayment, InvoiceTaxLine
from src.repository.base import BaseRepository


class BillingRepository(BaseRepository[Invoice]):
    def __init__(self) -> None:
        super().__init__(Invoice)

    async def get_by_invoice_no(
        self,
        invoice_no: str,
        session: Optional[AsyncSession] = None,
    ) -> Optional[Invoice]:
        stmt = select(Invoice).where(Invoice.invoice_no == invoice_no)
        return await execute_one_or_none(stmt, session=session)

    async def list_for_branch(
        self,
        branch_id: int,
        limit: int = 50,
        offset: int = 0,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[Invoice]:
        stmt = (
            select(Invoice)
            .where(Invoice.branch_id == branch_id)
            .order_by(Invoice.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return await execute_all(stmt, session=session)

    async def get_lines_for_invoice(
        self,
        invoice_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[InvoiceLine]:
        stmt = select(InvoiceLine).where(InvoiceLine.invoice_id == invoice_id).order_by(InvoiceLine.id.asc())
        return await execute_all(stmt, session=session)

    async def get_payments_for_invoice(
        self,
        invoice_id: int,
        session: Optional[AsyncSession] = None,
    ) -> Sequence[InvoicePayment]:
        stmt = select(InvoicePayment).where(InvoicePayment.invoice_id == invoice_id).order_by(InvoicePayment.id.asc())
        return await execute_all(stmt, session=session)

    async def add_invoice_line(
        self,
        line: InvoiceLine,
        session: AsyncSession,
    ) -> InvoiceLine:
        return await save_entity(line, session=session)

    async def add_tax_line(
        self,
        tax_line: InvoiceTaxLine,
        session: AsyncSession,
    ) -> InvoiceTaxLine:
        return await save_entity(tax_line, session=session)

    async def add_payment(
        self,
        payment: InvoicePayment,
        session: AsyncSession,
    ) -> InvoicePayment:
        return await save_entity(payment, session=session)

