"""Vendor purchases, inward invoices, payments, and clinic expenses."""

from datetime import date
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Date, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.timestamps import TimestampMixin


class Vendor(Base, TimestampMixin):
    __tablename__ = "vendors"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    gstin: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    state_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PurchaseInvoice(Base, TimestampMixin):
    __tablename__ = "purchase_invoices"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    inventory_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    vendor_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    vendor_invoice_no: Mapped[str] = mapped_column(String(60), nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    taxable_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    cgst_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    sgst_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    igst_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    cess_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_tax_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    round_off_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    paid_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)


class PurchaseInvoiceLine(Base):
    __tablename__ = "purchase_invoice_lines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    medicine_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    batch_no: Mapped[str] = mapped_column(String(50), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    free_quantity: Mapped[int] = mapped_column(default=0, nullable=False)
    unit_cost_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mrp_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    taxable_amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)


class PurchaseInvoiceTaxLine(Base):
    __tablename__ = "purchase_invoice_tax_lines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    line_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tax_code: Mapped[str] = mapped_column(String(20), nullable=False)
    cgst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    cgst_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    sgst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    sgst_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    igst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    igst_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    cess_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    cess_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)


class VendorPayment(Base, TimestampMixin):
    __tablename__ = "vendor_payments"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    invoice_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    ref_no: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    paid_at: Mapped[date] = mapped_column(Date, nullable=False)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(30), default="cash", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)

