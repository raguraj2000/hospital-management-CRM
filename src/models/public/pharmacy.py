"""Pharmacy formulary, FEFO batch stock, and retail POS sales."""

from datetime import date
from typing import Optional
from sqlalchemy import BigInteger, Boolean, Date, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.audit_fields import SoftDeleteMixin
from src.models.mixins.timestamps import TimestampMixin


class Medicine(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "medicines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    form: Mapped[str] = mapped_column(String(50), nullable=False)
    strength: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    price_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    reorder_level: Mapped[int] = mapped_column(Integer, default=10, nullable=False)


class InventoryBatch(Base, TimestampMixin):
    __tablename__ = "inventory_batches"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    inventory_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    medicine_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    batch_no: Mapped[str] = mapped_column(String(50), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    received_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unit_cost_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    mrp_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)


class InventoryMovement(Base, TimestampMixin):
    __tablename__ = "inventory_movements"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    inventory_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    medicine_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    batch_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)


class PharmacySale(Base, TimestampMixin):
    __tablename__ = "pharmacy_sales"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    inventory_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sale_no: Mapped[str] = mapped_column(String(40), nullable=False)
    visit_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    patient_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    total_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    round_off_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(30), default="cash", nullable=False)
    is_direct_otc: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)


class PharmacySaleLine(Base):
    __tablename__ = "pharmacy_sale_lines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    medicine_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    batch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)

