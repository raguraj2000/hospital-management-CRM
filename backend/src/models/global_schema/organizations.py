"""Global organizations and tenancy platform models."""

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.timestamps import TimestampMixin


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    billing_tier: Mapped[str] = mapped_column(String(40), default="starter", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deactivated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class OrganizationPlan(Base, TimestampMixin):
    __tablename__ = "organization_plans"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    plan_code: Mapped[str] = mapped_column(String(40), nullable=False)
    max_branches: Mapped[int] = mapped_column(default=1, nullable=False)
    max_users: Mapped[int] = mapped_column(default=10, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PlatformPayment(Base, TimestampMixin):
    __tablename__ = "platform_payments"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    gateway_ref: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="completed", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class OrgCounter(Base):
    __tablename__ = "org_counters"
    __table_args__ = {"schema": "global"}

    company_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

