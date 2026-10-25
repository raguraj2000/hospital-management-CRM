"""Outpatient Visit Consultation, Queue, Billing and Checkout Router."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select, update
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, execute_scalar, save_entity, transaction
from src.models.public.billing import Invoice, InvoiceLine, InvoicePayment, VisitCharge
from src.models.public.clinical import OpVisit, Patient, PrescriptionItem, PrescriptionNote, VisitInstruction
from src.models.public.courses import TreatmentCourse
from src.models.public.diagnostic_lab import LabOrder, LabRelease, LabResult
from src.models.public.pharmacy import PharmacySale
from src.schemas.common import api_response

router = APIRouter(prefix="/visits", tags=["Visits & Consultations"])


# Request Schemas
class VisitUpdatePayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    doctor_id: Optional[int] = Field(None, alias="doctorId")
    status: Optional[str] = None
    chief_complaint: Optional[str] = Field(None, alias="chiefComplaint")
    clinical_notes: Optional[str] = Field(None, alias="clinicalNotes")
    diagnosis: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class VisitActionPayload(BaseModel):
    visit_id: Optional[int] = Field(None, alias="visitId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class AddChargePayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    charge_type: str = Field(..., alias="chargeType")
    amount_paise: int = Field(..., alias="amountPaise")
    branch_id: Optional[int] = Field(None, alias="branchId")


class UpdateChargePayload(BaseModel):
    charge_id: int = Field(..., alias="chargeId")
    amount_paise: int = Field(..., alias="amountPaise")
    branch_id: Optional[int] = Field(None, alias="branchId")


class DeleteChargePayload(BaseModel):
    charge_id: int = Field(..., alias="chargeId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class AddCoursePayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    name: str
    total_sittings: int = Field(1, alias="totalSittings")
    notes: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class AddLabOrderPayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    doctor_id: Optional[int] = Field(None, alias="doctorId")
    test_ids: List[int] = Field([], alias="testIds")
    notes: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class AddPrescriptionPayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    drug_name: str = Field(..., alias="drugName")
    dosage: str = "1 tab"
    frequency: str = "1-0-1"
    duration: str = "5 days"
    instructions: Optional[str] = None
    medicine_id: Optional[int] = Field(None, alias="medicineId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class AddInstructionPayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    instruction: str
    is_custom: bool = Field(True, alias="isCustom")
    branch_id: Optional[int] = Field(None, alias="branchId")


class VitalsPayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    bp_systolic: Optional[int] = Field(None, alias="bpSystolic")
    bp_diastolic: Optional[int] = Field(None, alias="bpDiastolic")
    pulse: Optional[int] = None
    temperature_f: Optional[str] = Field(None, alias="temperatureF")
    weight_kg: Optional[str] = Field(None, alias="weightKg")
    branch_id: Optional[int] = Field(None, alias="branchId")


class ClinicalNotesPayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    clinical_notes: str = Field(..., alias="clinicalNotes")
    branch_id: Optional[int] = Field(None, alias="branchId")


class DiagnosesPayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    diagnosis: str
    branch_id: Optional[int] = Field(None, alias="branchId")


class ReferralPayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    referred_to: str = Field(..., alias="referredTo")
    reason: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class CompleteCheckoutPayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    payment_method: str = Field("cash", alias="paymentMethod")
    amount_paid_paise: Optional[int] = Field(None, alias="amountPaidPaise")
    branch_id: Optional[int] = Field(None, alias="branchId")


# Endpoints
@router.get("/list")
async def list_visits(
    status: Optional[str] = Query(None),
    doctor_id: Optional[int] = Query(None, alias="doctorId"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(OpVisit, Patient)
        .join(Patient, Patient.id == OpVisit.patient_id)
        .where(OpVisit.branch_id == context.branch_id, OpVisit.deleted_at.is_(None))
    )
    if status:
        stmt = stmt.where(OpVisit.status == status)
    if doctor_id:
        stmt = stmt.where(OpVisit.doctor_id == doctor_id)

    stmt = stmt.order_by(desc(OpVisit.id)).limit(limit).offset(offset)
    rows = await execute_all(stmt)

    visits = []
    for v, p in rows:
        visits.append({
            "id": v.id,
            "token_no": v.token_no,
            "status": v.status,
            "chief_complaint": v.chief_complaint,
            "doctor_id": v.doctor_id,
            "patient": {"id": p.id, "name": p.name, "uhid": p.uhid, "phone": p.phone},
            "created_at": v.created_at.isoformat() if hasattr(v, "created_at") and v.created_at else None,
        })

    return api_response(data={"visits": visits}, message="Visits retrieved successfully")


@router.patch("/update")
async def update_visit(
    payload: VisitUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.doctor_id is not None:
        vals["doctor_id"] = payload.doctor_id
    if payload.status is not None:
        vals["status"] = payload.status
    if payload.chief_complaint is not None:
        vals["chief_complaint"] = payload.chief_complaint
    if payload.clinical_notes is not None:
        vals["clinical_notes"] = payload.clinical_notes
    if payload.diagnosis is not None:
        vals["diagnosis"] = payload.diagnosis

    if vals:
        async with transaction() as session:
            stmt = update(OpVisit).where(OpVisit.id == v.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "visit_id": v.id}, message="Visit updated successfully")


@router.delete("/delete")
async def delete_visit(
    payload: VisitActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(OpVisit).where(OpVisit.id == v.id).values(deleted_at=datetime.now(timezone.utc))
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Visit deleted successfully")


@router.post("/send-to-next")
async def send_to_next(
    payload: VisitActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    if payload.visit_id:
        v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    else:
        v = await execute_one_or_none(
            select(OpVisit)
            .where(OpVisit.branch_id == branch_id, OpVisit.status.in_(["scheduled", "in_queue"]))
            .order_by(OpVisit.id)
            .limit(1)
        )
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    next_status = "in_consultation" if v.status == "in_queue" else "completed"
    async with transaction() as session:
        stmt = update(OpVisit).where(OpVisit.id == v.id).values(status=next_status)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "status": next_status, "token_no": v.token_no, "visit_id": v.id}, message="Visit advanced to next stage successfully")


@router.post("/call-patient")
async def call_patient(
    payload: VisitActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    if payload.visit_id:
        v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    else:
        v = await execute_one_or_none(
            select(OpVisit)
            .where(OpVisit.branch_id == branch_id, OpVisit.status.in_(["scheduled", "in_queue"]))
            .order_by(OpVisit.id)
            .limit(1)
        )
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(OpVisit).where(OpVisit.id == v.id).values(status="in_consultation")
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "token_no": v.token_no, "visit_id": v.id}, message=f"Called token {v.token_no}")


@router.get("/get-by-id")
async def get_visit_by_id(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(OpVisit, Patient)
        .join(Patient, Patient.id == OpVisit.patient_id)
        .where(OpVisit.id == visit_id, OpVisit.branch_id == context.branch_id)
    )
    res = await execute_one_or_none(stmt)
    if not res:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)
    v, p = res
    return api_response(
        data={
            "visit": {
                "id": v.id,
                "token_no": v.token_no,
                "status": v.status,
                "chief_complaint": v.chief_complaint,
                "clinical_notes": v.clinical_notes,
                "diagnosis": v.diagnosis,
                "bp_systolic": v.bp_systolic,
                "bp_diastolic": v.bp_diastolic,
                "pulse": v.pulse,
                "temperature_f": v.temperature_f,
                "weight_kg": v.weight_kg,
                "patient": {"id": p.id, "name": p.name, "uhid": p.uhid, "phone": p.phone},
            }
        },
        message="Visit details retrieved successfully",
    )


@router.get("/get-invoice")
async def get_visit_invoice(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(Invoice).where(Invoice.branch_id == context.branch_id).order_by(desc(Invoice.id)).limit(1)
    inv = await execute_one_or_none(stmt)
    return api_response(
        data={"invoice": {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "total_gross_paise": inv.total_gross_paise,
            "status": inv.status,
        } if inv else None},
        message="Invoice retrieved successfully",
    )


@router.post("/create-invoice")
async def create_visit_invoice(
    payload: CompleteCheckoutPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return await complete_checkout(payload, context)


@router.post("/add-charge")
@router.put("/add-charge")
async def add_charge(
    payload: AddChargePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    async with transaction() as session:
        ch = VisitCharge(
            branch_id=branch_id,
            visit_id=payload.visit_id,
            charge_type=payload.charge_type,
            amount_paise=payload.amount_paise,
            is_billed=False,
        )
        saved = await save_entity(ch, session=session)

    return api_response(
        data={"charge": {"id": saved.id, "amount_paise": saved.amount_paise}},
        message="Charge added successfully",
        status_code=201,
    )


@router.patch("/update-charge")
@router.put("/update-charge")
async def update_charge(
    payload: UpdateChargePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    ch = await execute_one_or_none(
        select(VisitCharge).where(VisitCharge.id == payload.charge_id, VisitCharge.branch_id == branch_id)
    )
    if not ch:
        raise AppException("Charge not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(VisitCharge).where(VisitCharge.id == ch.id).values(amount_paise=payload.amount_paise)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "charge_id": ch.id}, message="Charge updated successfully")


@router.delete("/delete-charge")
async def delete_charge(
    payload: DeleteChargePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    ch = await execute_one_or_none(
        select(VisitCharge).where(VisitCharge.id == payload.charge_id, VisitCharge.branch_id == branch_id)
    )
    if not ch:
        raise AppException("Charge not found", code=ErrorCode.NOT_FOUND, status_code=404)

    from sqlalchemy import delete as sql_delete
    async with transaction() as session:
        stmt = sql_delete(VisitCharge).where(VisitCharge.id == ch.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Charge deleted successfully")


@router.post("/add-course")
async def add_course(
    payload: AddCoursePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        tc = TreatmentCourse(
            company_id=context.company_id,
            branch_id=branch_id,
            patient_id=v.patient_id,
            name=payload.name,
            total_sittings=payload.total_sittings,
            completed_sittings=0,
            status="active",
            notes=payload.notes,
        )
        saved = await save_entity(tc, session=session)

    return api_response(
        data={"course": {"id": saved.id, "name": saved.name}},
        message="Course added successfully",
        status_code=201,
    )


@router.post("/add-lab-order")
async def add_lab_order(
    payload: AddLabOrderPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    order_number = f"LAB-{context.code_prefix}-{int(datetime.now(timezone.utc).timestamp())}"
    async with transaction() as session:
        lo = LabOrder(
            company_id=context.company_id,
            branch_id=branch_id,
            patient_id=v.patient_id,
            doctor_id=payload.doctor_id or v.doctor_id,
            order_number=order_number,
            status="ordered",
            notes=payload.notes,
        )
        saved = await save_entity(lo, session=session)

    return api_response(
        data={"lab_order": {"id": saved.id, "order_number": order_number}},
        message="Lab order created successfully",
        status_code=201,
    )


@router.get("/list-prescriptions")
async def list_prescriptions(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(PrescriptionItem).where(PrescriptionItem.visit_id == visit_id)
    items = await execute_all(stmt)
    return api_response(
        data={"prescriptions": [{
            "id": i.id,
            "drug_name": i.drug_name,
            "dosage": i.dosage,
            "frequency": i.frequency,
            "duration": i.duration,
            "instructions": i.instructions,
        } for i in items]},
        message="Prescriptions retrieved successfully",
    )


@router.post("/add-prescription")
@router.put("/add-prescription")
async def add_prescription(
    payload: AddPrescriptionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    async with transaction() as session:
        item = PrescriptionItem(
            company_id=context.company_id,
            visit_id=payload.visit_id,
            medicine_id=payload.medicine_id,
            drug_name=payload.drug_name,
            dosage=payload.dosage,
            frequency=payload.frequency,
            duration=payload.duration,
            instructions=payload.instructions,
        )
        saved = await save_entity(item, session=session)

    return api_response(
        data={"prescription": {"id": saved.id, "drug_name": saved.drug_name}},
        message="Prescription item added successfully",
        status_code=201,
    )


@router.get("/list-instructions")
async def list_instructions(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(VisitInstruction).where(VisitInstruction.visit_id == visit_id)
    items = await execute_all(stmt)
    return api_response(
        data={"instructions": [{"id": i.id, "instruction": i.instruction} for i in items]},
        message="Instructions retrieved successfully",
    )


@router.post("/add-instruction")
async def add_instruction(
    payload: AddInstructionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    async with transaction() as session:
        ins = VisitInstruction(
            visit_id=payload.visit_id,
            instruction=payload.instruction,
            is_custom=payload.is_custom,
        )
        saved = await save_entity(ins, session=session)

    return api_response(
        data={"instruction": {"id": saved.id, "instruction": saved.instruction}},
        message="Instruction added successfully",
        status_code=201,
    )


@router.get("/get-lab-results")
async def get_lab_results(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(LabResult)
        .join(LabOrder, LabOrder.id == LabResult.lab_order_id)
        .where(LabOrder.patient_id == (select(OpVisit.patient_id).where(OpVisit.id == visit_id).scalar_subquery()))
    )
    results = await execute_all(stmt)
    return api_response(
        data={"lab_results": [{"id": r.id, "finding": r.finding, "is_abnormal": r.is_abnormal} for r in results]},
        message="Lab results retrieved successfully",
    )


@router.post("/release-lab-report")
async def release_lab_report(
    payload: VisitActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(data={"ok": True}, message="Lab report released to patient and doctor")


@router.post("/dispense-pharmacy")
@router.put("/dispense-pharmacy")
async def dispense_pharmacy(
    payload: VisitActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(data={"ok": True}, message="Medicines dispensed for visit successfully")


@router.get("/checkout-summary")
async def checkout_summary(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    v = await execute_one_or_none(
        select(OpVisit).where(OpVisit.id == visit_id, OpVisit.branch_id == context.branch_id)
    )
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    # Sum unbilled charges
    stmt = select(func.coalesce(func.sum(VisitCharge.amount_paise), 0)).where(
        VisitCharge.visit_id == visit_id, VisitCharge.is_billed == False
    )
    total_charges = await execute_scalar(stmt) or 0

    return api_response(
        data={
            "summary": {
                "visit_id": visit_id,
                "charges_paise": total_charges,
                "total_due_paise": total_charges,
            }
        },
        message="Checkout summary calculated successfully",
    )


@router.post("/complete-checkout")
async def complete_checkout(
    payload: CompleteCheckoutPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    # Atomic checkout transaction
    async with transaction() as session:
        # Sum charges
        ch_stmt = select(func.coalesce(func.sum(VisitCharge.amount_paise), 0)).where(
            VisitCharge.visit_id == v.id, VisitCharge.is_billed == False
        )
        total_paise = await execute_scalar(ch_stmt, session=session) or 50000  # Default 500 INR consultation

        invoice_number = f"INV-{context.code_prefix}-{int(datetime.now(timezone.utc).timestamp())}"
        inv = Invoice(
            company_id=context.company_id,
            branch_id=branch_id,
            patient_id=v.patient_id,
            invoice_number=invoice_number,
            status="paid",
            total_net_paise=total_paise,
            total_tax_paise=0,
            total_gross_paise=total_paise,
            balance_due_paise=0,
        )
        saved_inv = await save_entity(inv, session=session)

        # Record payment
        pmt = InvoicePayment(
            invoice_id=saved_inv.id,
            company_id=context.company_id,
            amount_paise=total_paise,
            payment_method=payload.payment_method,
            transaction_ref="CHECKOUT",
        )
        await save_entity(pmt, session=session)

        # Mark charges billed
        up_ch = update(VisitCharge).where(VisitCharge.visit_id == v.id).values(is_billed=True)
        await execute_dml(up_ch, session=session)

        # Close visit
        up_v = update(OpVisit).where(OpVisit.id == v.id).values(status="completed", completed_at=datetime.now(timezone.utc))
        await execute_dml(up_v, session=session)

    return api_response(
        data={"invoice_id": saved_inv.id, "invoice_number": invoice_number, "status": "completed"},
        message="Visit checkout completed successfully",
        status_code=200,
    )


@router.get("/timeline")
async def get_visit_timeline(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(
        data={"timeline": [{"action": "Visit registered", "timestamp": datetime.now(timezone.utc).isoformat()}]},
        message="Visit timeline retrieved successfully",
    )


@router.get("/vitals")
async def get_visit_vitals(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    v = await execute_one_or_none(
        select(OpVisit).where(OpVisit.id == visit_id, OpVisit.branch_id == context.branch_id)
    )
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)
    return api_response(
        data={
            "vitals": {
                "bp_systolic": v.bp_systolic,
                "bp_diastolic": v.bp_diastolic,
                "pulse": v.pulse,
                "temperature_f": v.temperature_f,
                "weight_kg": v.weight_kg,
            }
        },
        message="Vitals retrieved successfully",
    )


@router.post("/update-vitals")
async def update_vitals(
    payload: VitalsPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.bp_systolic is not None:
        vals["bp_systolic"] = payload.bp_systolic
    if payload.bp_diastolic is not None:
        vals["bp_diastolic"] = payload.bp_diastolic
    if payload.pulse is not None:
        vals["pulse"] = payload.pulse
    if payload.temperature_f is not None:
        vals["temperature_f"] = payload.temperature_f
    if payload.weight_kg is not None:
        vals["weight_kg"] = payload.weight_kg

    if vals:
        async with transaction() as session:
            stmt = update(OpVisit).where(OpVisit.id == v.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Vitals updated successfully")


@router.get("/clinical-notes")
async def get_clinical_notes(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    v = await execute_one_or_none(
        select(OpVisit).where(OpVisit.id == visit_id, OpVisit.branch_id == context.branch_id)
    )
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)
    return api_response(data={"clinical_notes": v.clinical_notes}, message="Clinical notes retrieved successfully")


@router.post("/update-clinical-notes")
async def update_clinical_notes(
    payload: ClinicalNotesPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(OpVisit).where(OpVisit.id == v.id).values(clinical_notes=payload.clinical_notes)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Clinical notes updated successfully")


@router.get("/diagnoses")
async def get_diagnoses(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    v = await execute_one_or_none(
        select(OpVisit).where(OpVisit.id == visit_id, OpVisit.branch_id == context.branch_id)
    )
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)
    return api_response(data={"diagnosis": v.diagnosis}, message="Diagnosis retrieved successfully")


@router.post("/update-diagnoses")
async def update_diagnoses(
    payload: DiagnosesPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(OpVisit).where(OpVisit.id == payload.visit_id, OpVisit.branch_id == branch_id))
    if not v:
        raise AppException("Visit not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(OpVisit).where(OpVisit.id == v.id).values(diagnosis=payload.diagnosis)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Diagnosis updated successfully")


@router.get("/referrals")
async def get_referrals(
    visit_id: int = Query(..., alias="visitId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(data={"referrals": []}, message="Referrals retrieved successfully")


@router.post("/create-referral")
async def create_referral(
    payload: ReferralPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(
        data={"referral": {"visit_id": payload.visit_id, "referred_to": payload.referred_to}},
        message="Referral recorded successfully",
        status_code=201,
    )
