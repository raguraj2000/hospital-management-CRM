"""Multi-sitting clinical treatment packages and procedure schedules."""

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.timestamps import TimestampMixin


class TreatmentCourse(Base, TimestampMixin):
    __tablename__ = "treatment_courses"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    patient_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    total_sittings: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_sittings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class CourseSitting(Base, TimestampMixin):
    __tablename__ = "course_sittings"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    course_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sitting_no: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="scheduled", nullable=False)
    performed_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    performed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class CourseItem(Base):
    __tablename__ = "course_items"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sitting_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    item_name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    performed_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)


class CourseTemplate(Base, TimestampMixin):
    __tablename__ = "course_templates"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    total_sittings: Mapped[int] = mapped_column(Integer, nullable=False)
    default_fee_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

