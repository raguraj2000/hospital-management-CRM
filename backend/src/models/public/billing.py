"""Patient billing, GST invoicing, cashier receipts, and audit trail."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Boolean, Date, DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.timestamps import TimestampMixin


class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    patient_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    visit_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    invoice_no: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="posted", nullable=False)
    subtotal_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    discount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    tax_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    round_off_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    paid_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    balance_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    is_cancelled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cancelled_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    item_type: Mapped[str] = mapped_column(String(40), nullable=False)  # opd, medicine, lab, procedure
    reference_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(default=1, nullable=False)
    unit_price_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    taxable_amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tax_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)


class InvoiceTaxLine(Base):
    __tablename__ = "invoice_tax_lines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    line_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    hsn_sac_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    cgst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    cgst_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    sgst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    sgst_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    igst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    igst_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)


class InvoicePayment(Base):
    __tablename__ = "invoice_payments"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    invoice_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    receipt_no: Mapped[str] = mapped_column(String(60), nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    received_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    @property
    def payment_method(self) -> str:
        return self.mode

    @payment_method.setter
    def payment_method(self, value: str) -> None:
        self.mode = value

    @property
    def ref_no(self) -> Optional[str]:
        return self.reference

    @ref_no.setter
    def ref_no(self, value: Optional[str]) -> None:
        self.reference = value


class CreditDebitNote(Base, TimestampMixin):
    __tablename__ = "credit_debit_notes"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    original_invoice_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    note_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'credit' or 'debit'
    note_no: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)


class VisitCharge(Base, TimestampMixin):
    __tablename__ = "visit_charges"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    charge_type: Mapped[str] = mapped_column(String(40), nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_billed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    diff: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )

