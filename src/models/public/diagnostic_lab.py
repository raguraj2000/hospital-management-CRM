"""Diagnostic pathology and lab test models."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.timestamps import TimestampMixin


class LabTest(Base, TimestampMixin):
    __tablename__ = "lab_tests"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    price_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    specimen: Mapped[str] = mapped_column(String(50), nullable=False)


class LabTestParameter(Base):
    __tablename__ = "lab_test_parameters"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    test_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ref_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)
    ref_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)


class LabPackage(Base, TimestampMixin):
    __tablename__ = "lab_packages"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)


class LabOrder(Base, TimestampMixin):
    __tablename__ = "lab_orders"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    order_no: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ordered", nullable=False)
    specimen_collected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class LabResult(Base, TimestampMixin):
    __tablename__ = "lab_results"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    parameter_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    value: Mapped[str] = mapped_column(String(100), nullable=False)
    is_abnormal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class LabRelease(Base):
    __tablename__ = "lab_releases"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    released_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    released_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

