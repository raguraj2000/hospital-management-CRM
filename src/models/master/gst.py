"""Master statutory GST tax codes and effective-dated rate schedules."""

from datetime import date
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Boolean, Date, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base


class GstTaxCode(Base):
    __tablename__ = "gst_tax_codes"
    __table_args__ = {"schema": "master"}

    code: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    is_nil_rated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_exempt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class GstRate(Base):
    __tablename__ = "gst_rates"
    __table_args__ = {"schema": "master"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tax_code: Mapped[str] = mapped_column(String(20), nullable=False)
    cgst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    sgst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    igst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    cess_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    total_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

