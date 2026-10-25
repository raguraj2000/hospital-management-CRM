"""User accounts, sessions, and multi-tenant memberships."""

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    mobile: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_platform_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failed_logins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
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

    @property
    def email(self) -> str:
        return f"{self.username}@platform.local"

    @property
    def phone(self) -> str:
        return self.mobile

    @property
    def role(self) -> str:
        return "platform_admin" if self.is_platform_admin else "staff"


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = {"schema": "global"}

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # SHA-256 token digest
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )
    deactivated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
