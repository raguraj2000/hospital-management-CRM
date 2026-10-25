"""Staging models for vendor invoice imports."""

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base


class VendorInvoiceImport(Base):
    __tablename__ = "vendor_invoice_imports"
    __table_args__ = {"schema": "staging"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    filename: Mapped[str] = mapped_column(String(200), nullable=False)
    vendor_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    uploaded_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.current_timestamp(), nullable=False)


class VendorInvoiceImportRow(Base):
    __tablename__ = "vendor_invoice_import_rows"
    __table_args__ = {"schema": "staging"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    import_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(150), nullable=False)
    batch_no: Mapped[str] = mapped_column(String(50), nullable=False)
    expiry: Mapped[str] = mapped_column(String(20), nullable=False)
    cost: Mapped[int] = mapped_column(BigInteger, nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)

