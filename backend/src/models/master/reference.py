"""Master reference codelists (UOM, Payment Methods, HSN/SAC)."""

from typing import Optional
from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base


class UomCode(Base):
    __tablename__ = "uom_codes"
    __table_args__ = {"schema": "master"}

    code: Mapped[str] = mapped_column(String(15), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)


class PaymentMethodMaster(Base):
    __tablename__ = "payment_methods"
    __table_args__ = {"schema": "master"}

    code: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    requires_ref: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class HsnSacCode(Base):
    __tablename__ = "hsn_sac_codes"
    __table_args__ = {"schema": "master"}

    code: Mapped[str] = mapped_column(String(10), primary_key=True)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'hsn' or 'sac'
    description: Mapped[str] = mapped_column(Text, nullable=False)

