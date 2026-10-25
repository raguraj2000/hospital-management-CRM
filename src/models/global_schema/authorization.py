"""Authorization, roles, permissions, and user overrides."""

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.timestamps import TimestampMixin


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    module: Mapped[str] = mapped_column(String(40), nullable=False)
    resource: Mapped[str] = mapped_column(String(40), nullable=False)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )


class Role(Base, TimestampMixin):
    __tablename__ = "roles"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = {"schema": "global"}

    role_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    permission_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )


class UserRole(Base, TimestampMixin):
    __tablename__ = "user_roles"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    branch_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    region_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    inventory_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    assigned_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)


class UserPermissionOverride(Base):
    __tablename__ = "user_permission_overrides"
    __table_args__ = {"schema": "global"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    permission_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    branch_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    region_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    inventory_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    is_granted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    granted_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )
