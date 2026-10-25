"""Patient billing, GST invoicing, cashier receipts, and audit trail."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional
from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.audit_fields import SoftDeleteMixin
from src.models.mixins.timestamps import TimestampMixin


class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    invoice_no: Mapped[str] = mapped_column(String(50), nullable=False)
    visit_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    patient_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    patient_name_snapshot: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    patient_gstin: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    seller_gstin_snapshot: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    seller_state_code: Mapped[str] = mapped_column(String(10), default="33", nullable=False)
    place_of_supply_state_code: Mapped[str] = mapped_column(String(10), default="33", nullable=False)
    is_inter_state: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, default=func.current_date, nullable=False)
    taxable_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    cgst_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    sgst_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    igst_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    cess_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_tax_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    discount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    round_off_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    grand_total_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    paid_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    balance_due_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    is_immutable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    posted_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    cancelled_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    cancel_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    @property
    def invoice_number(self) -> str:
        return self.invoice_no

    @property
    def total_gross_paise(self) -> int:
        return self.grand_total_paise

    @property
    def total_paise(self) -> int:
        return self.grand_total_paise

    @property
    def subtotal_paise(self) -> int:
        return self.taxable_amount_paise

    @property
    def paid_paise(self) -> int:
        return self.paid_amount_paise

    @property
    def balance_paise(self) -> int:
        return self.balance_due_paise

    @property
    def tax_paise(self) -> int:
        return self.total_tax_paise

    @property
    def is_cancelled(self) -> bool:
        return self.status == "cancelled"

    @property
    def cancelled_reason(self) -> Optional[str]:
        return self.cancel_reason


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    line_type: Mapped[str] = mapped_column(String(40), default="opd", nullable=False)
    reference_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    hsn_sac_code: Mapped[str] = mapped_column(String(20), default="999312", nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=Decimal("1"), nullable=False)
    unit_price_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    gross_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    discount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    taxable_value_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    gst_tax_code: Mapped[str] = mapped_column(String(20), default="EXEMPT", nullable=False)
    gst_rate_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    total_tax_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    net_line_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    @property
    def item_type(self) -> str:
        return self.line_type

    @property
    def total_paise(self) -> int:
        return self.net_line_amount_paise

    @property
    def taxable_amount_paise(self) -> int:
        return self.taxable_value_paise

    @property
    def tax_amount_paise(self) -> int:
        return self.total_tax_paise


class InvoiceTaxLine(Base):
    __tablename__ = "invoice_tax_lines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    gst_tax_code: Mapped[str] = mapped_column(String(20), nullable=False)
    taxable_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    cgst_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    sgst_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    igst_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    cess_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_tax_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)


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


class CreditDebitNote(Base):
    __tablename__ = "credit_debit_notes"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    original_invoice_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    note_no: Mapped[str] = mapped_column(String(50), nullable=False)
    note_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'CREDIT' or 'DEBIT'
    note_date: Mapped[date] = mapped_column(Date, default=func.current_date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    taxable_adjustment_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    tax_adjustment_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_adjustment_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    @property
    def amount_paise(self) -> int:
        return self.total_adjustment_paise


class VisitCharge(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "visit_charges"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    invoice_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    @property
    def is_billed(self) -> bool:
        return self.invoice_id is not None

    @property
    def charge_type(self) -> str:
        return self.description


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    entity: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    detail: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    client_ip: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    @property
    def entity_type(self) -> str:
        return self.entity

    @property
    def diff(self) -> Any:
        return self.detail
