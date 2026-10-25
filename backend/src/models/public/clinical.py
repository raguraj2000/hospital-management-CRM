"""Clinical models (Patients, Outpatient Visits, Prescriptions, Doses)."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, Numeric, String, Text, func
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
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    age_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    weight_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    height_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    deactivated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deactivated_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deactivated_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None and self.deactivated_at is None


class OpVisit(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "op_visits"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    patient_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    op_no: Mapped[str] = mapped_column(String(30), nullable=False)
    visit_date: Mapped[date] = mapped_column(Date, default=func.current_date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="registered", nullable=False)
    doctor_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    complaint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    referred_by: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pharmacy_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lab_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    consultation_fee_paise: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    bp_systolic: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bp_diastolic: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pulse: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    temperature_f: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1), nullable=True)
    spo2: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    height_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    @property
    def token_no(self) -> str:
        return self.op_no

    @property
    def doctor_id(self) -> Optional[int]:
        return self.doctor_user_id

    @property
    def chief_complaint(self) -> Optional[str]:
        return self.complaint

    @property
    def clinical_notes(self) -> Optional[str]:
        return self.notes

    @property
    def diagnosis(self) -> Optional[str]:
        return self.notes

    @property
    def completed_at(self) -> Optional[datetime]:
        return self.updated_at if self.status == "completed" else None


class PrescriptionItem(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "prescription_items"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    medicine_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    dose: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    given_here: Mapped[bool] = mapped_column(Boolean, default=false, nullable=False) if False else mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    @property
    def dosage(self) -> str:
        return self.dose or ""

    @property
    def drug_name(self) -> str:
        return ""

    @property
    def frequency(self) -> str:
        return self.dose or ""

    @property
    def duration(self) -> str:
        return f"{self.days} days" if self.days else ""


class PrescriptionNote(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "prescription_notes"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    kind: Mapped[str] = mapped_column(String(30), default="advice", nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    after_item_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    @property
    def notes(self) -> str:
        return self.text


class TreatmentDose(Base, TimestampMixin):
    __tablename__ = "treatment_doses"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    prescription_item_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    patient_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    slot_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    slot: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    amount: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    given_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    given_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    @property
    def medicine_name(self) -> str:
        return ""

    @property
    def dose(self) -> str:
        return self.amount or ""

    @property
    def route(self) -> str:
        return "oral"

    @property
    def administered_by(self) -> Optional[int]:
        return self.given_by

    @property
    def administered_at(self) -> Optional[datetime]:
        return self.given_at

    @property
    def notes(self) -> Optional[str]:
        return self.note


class VisitInstruction(Base):
    __tablename__ = "visit_instructions"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    visit_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    instruction: Mapped[str] = mapped_column(Text, default="", nullable=False)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TreatmentBookmark(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "treatment_bookmarks"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    @property
    def title(self) -> str:
        return self.name

    @property
    def doctor_id(self) -> Optional[int]:
        return self.created_by


class TreatmentBookmarkLine(Base):
    __tablename__ = "treatment_bookmark_lines"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    bookmark_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    kind: Mapped[str] = mapped_column(String(40), default="medicine", nullable=False)
    medicine_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    dose: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    given_here: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    @property
    def medicine_name(self) -> str:
        return ""

    @property
    def dosage(self) -> str:
        return self.dose or ""

    @property
    def frequency(self) -> str:
        return self.dose or ""

    @property
    def duration(self) -> str:
        return f"{self.days} days" if self.days else ""
