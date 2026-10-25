"""Audit fields mixin for soft-delete and actor tracking."""

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, DateTime
from sqlalchemy.orm import Mapped, mapped_column


class SoftDeleteMixin:
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    deleted_by: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
    )

