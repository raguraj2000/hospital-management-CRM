"""Staging models for inventory batch imports."""

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base


class InventoryImportBatch(Base):
    __tablename__ = "inventory_import_batches"
    __table_args__ = {"schema": "staging"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    inventory_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    filename: Mapped[str] = mapped_column(String(200), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    uploaded_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.current_timestamp(),
        nullable=False,
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)


class InventoryImportRow(Base):
    __tablename__ = "inventory_import_rows"
    __table_args__ = {"schema": "staging"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_payload: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

