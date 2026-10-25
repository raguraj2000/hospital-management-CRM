"""Master lab test catalog and reference parameters."""

from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base


class MasterLabCatalog(Base):
    __tablename__ = "lab_catalog"
    __table_args__ = {"schema": "master"}

    code: Mapped[str] = mapped_column(String(30), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    specimen: Mapped[str] = mapped_column(String(50), nullable=False)
    method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    turnaround_hours: Mapped[int] = mapped_column(default=24, nullable=False)


class MasterLabParameter(Base):
    __tablename__ = "lab_parameters"
    __table_args__ = {"schema": "master"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    test_code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ref_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)
    ref_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)
    text_range: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

