"""Organizational hierarchy models (Regions, Inventory Locations, Branches)."""

from datetime import datetime
from typing import Any, List, Optional
from sqlalchemy import BigInteger, Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.timestamps import TimestampMixin


class Region(Base, TimestampMixin):
    __tablename__ = "regions"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class InventoryLocation(Base, TimestampMixin):
    __tablename__ = "inventory_locations"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[str] = mapped_column(String(40), default="pharmacy", nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class RegionInventory(Base, TimestampMixin):
    __tablename__ = "region_inventory"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    region_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    inventory_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Branch(Base, TimestampMixin):
    __tablename__ = "branches"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    region_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    primary_inventory_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    slug: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code_prefix: Mapped[str] = mapped_column(String(10), nullable=False)
    gstin: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    state_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    print_header: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    allowed_networks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class BranchDoctor(Base):
    __tablename__ = "branch_doctors"
    __table_args__ = {"schema": "public"}

    branch_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )


class BranchCounter(Base):
    __tablename__ = "branch_counters"
    __table_args__ = {"schema": "public"}

    branch_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)


class ClinicSetting(Base):
    __tablename__ = "clinic_settings"
    __table_args__ = {"schema": "public"}

    branch_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    consultation_fee_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    default_doctor_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    charge_presets: Mapped[List[Any]] = mapped_column(JSONB, default=list, nullable=False)
    fee_slots: Mapped[List[Any]] = mapped_column(JSONB, default=list, nullable=False)
    nav_counts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

