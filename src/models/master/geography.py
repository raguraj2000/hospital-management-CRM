"""Master geographic reference tables (Countries, States)."""

from typing import Optional
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base


class Country(Base):
    __tablename__ = "countries"
    __table_args__ = {"schema": "master"}

    code: Mapped[str] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    iso3: Mapped[str] = mapped_column(String(3), unique=True, nullable=False)
    phone_code: Mapped[str] = mapped_column(String(10), nullable=False)


class State(Base):
    __tablename__ = "states"
    __table_args__ = {"schema": "master"}

    code: Mapped[str] = mapped_column(String(10), primary_key=True)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    gst_state_code: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)

