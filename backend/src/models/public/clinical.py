"""Clinical models (Patients, Outpatient Visits, Prescriptions, Doses)."""

from datetime import date, datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base
from src.models.mixins.audit_fields import SoftDeleteMixin
from src.models.mixins.timestamps import TimestampMixin


class Patient(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "patients"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    uhid: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class OpVisit(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "op_visits"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    patient_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    doctor_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    token_no: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="registered", nullable=False)
    chief_complaint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    clinical_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bp_systolic: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bp_diastolic: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pulse: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    temperature_f: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    weight_kg: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class PrescriptionItem(Base, TimestampMixin):
    __tablename__ = "prescription_items"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    medicine_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    drug_name: Mapped[str] = mapped_column(String(150), nullable=False)
    dosage: Mapped[str] = mapped_column(String(50), nullable=False)
    frequency: Mapped[str] = mapped_column(String(50), nullable=False)
    duration: Mapped[str] = mapped_column(String(50), nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PrescriptionNote(Base, TimestampMixin):
    __tablename__ = "prescription_notes"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)


class TreatmentDose(Base, TimestampMixin):
    __tablename__ = "treatment_doses"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(150), nullable=False)
    dose: Mapped[str] = mapped_column(String(60), nullable=False)
    route: Mapped[str] = mapped_column(String(40), nullable=False)
    administered_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    administered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class VisitInstruction(Base):
    __tablename__ = "visit_instructions"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TreatmentBookmark(Base, TimestampMixin):
    __tablename__ = "treatment_bookmarks"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    doctor_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)


class TreatmentBookmarkLine(Base):
    __tablename__ = "treatment_bookmark_lines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    bookmark_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(150), nullable=False)
    dosage: Mapped[str] = mapped_column(String(50), nullable=False)
    frequency: Mapped[str] = mapped_column(String(50), nullable=False)
    duration: Mapped[str] = mapped_column(String(50), nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

