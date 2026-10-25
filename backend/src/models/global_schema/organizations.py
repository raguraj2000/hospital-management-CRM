"""Global organizations and tenancy platform models."""

from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.timestamps import TimestampMixin


class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code_prefix: Mapped[str] = mapped_column(String(10), default="", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    plan_name: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    yearly_fee_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    paid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    grace_days: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    max_branches: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_staff: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    modules_off: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    support_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delete_on: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def slug(self) -> str:
        return (self.code_prefix or self.name or "").lower().replace(" ", "-")

    @property
    def billing_tier(self) -> str:
        return self.plan_name or "starter"

    @property
    def deactivated_at(self) -> Optional[datetime]:
        return self.deleted_at


class OrganizationPlan(Base, TimestampMixin):
    __tablename__ = "organization_plans"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_yearly_fee_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    max_branches: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_staff: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    features: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PlatformPayment(Base):
    __tablename__ = "platform_payments"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    paid_on: Mapped[date] = mapped_column(Date, nullable=False)
    period_from: Mapped[date] = mapped_column(Date, nullable=False)
    period_to: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    @property
    def notes(self) -> Optional[str]:
        return self.note

    @property
    def gateway_ref(self) -> str:
        return f"PAY-{self.id}"

    @property
    def status(self) -> str:
        return "completed"


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
