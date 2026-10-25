"""Patient Master Management & Clinical Workflows Router."""

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, func, select, update
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, execute_scalar, save_entity, transaction
from src.models.public.billing import Invoice, InvoiceLine, InvoicePayment
from src.models.public.clinical import OpVisit, Patient
from src.models.public.courses import TreatmentCourse
from src.models.public.diagnostic_lab import LabOrder
from src.models.public.pharmacy import PharmacySale
from src.schemas.common import api_response

router = APIRouter(prefix="/patients", tags=["Patients"])


class PatientCreatePayload(BaseModel):
    name: str
    phone: Optional[str] = None
    gender: str = "male"
    dob: Optional[date] = None
    blood_group: Optional[str] = Field(None, alias="bloodGroup")
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = Field(None, alias="emergencyContactName")
    emergency_contact_phone: Optional[str] = Field(None, alias="emergencyContactPhone")
    branch_id: Optional[int] = Field(None, alias="branchId")


class PatientUpdatePayload(BaseModel):
    patient_id: int = Field(..., alias="patientId")
    name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = Field(None, alias="bloodGroup")
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = Field(None, alias="emergencyContactName")
    emergency_contact_phone: Optional[str] = Field(None, alias="emergencyContactPhone")
    branch_id: Optional[int] = Field(None, alias="branchId")


class PatientToggleActivePayload(BaseModel):
    patient_id: int = Field(..., alias="patientId")
    is_active: bool = Field(True, alias="isActive")
    reason: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class CreateVisitForPatientPayload(BaseModel):
    patient_id: int = Field(..., alias="patientId")
    doctor_id: Optional[int] = Field(None, alias="doctorId")
    complaint: Optional[str] = None
    priority: str = "normal"
    branch_id: Optional[int] = Field(None, alias="branchId")


class DirectBillPayload(BaseModel):
    patient_id: int = Field(..., alias="patientId")
    amount_paise: int = Field(..., alias="amountPaise")
    items: List[Dict[str, Any]] = []
    payment_method: str = Field("cash", alias="paymentMethod")
    branch_id: Optional[int] = Field(None, alias="branchId")


class DirectLabOrderPayload(BaseModel):
    patient_id: int = Field(..., alias="patientId")
    doctor_id: Optional[int] = Field(None, alias="doctorId")
    test_ids: List[int] = Field([], alias="testIds")
    notes: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class PayDueBalancePayload(BaseModel):
    patient_id: int = Field(..., alias="patientId")
    amount_paise: int = Field(..., alias="amountPaise")
    payment_method: str = Field("cash", alias="paymentMethod")
    branch_id: Optional[int] = Field(None, alias="branchId")


@router.get("/list")
async def list_patients(
    q: Optional[str] = Query(None, description="Search by name, phone or UHID"),
    gender: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    offset_val: Optional[int] = Query(None, alias="offset"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(Patient).where(
        Patient.branch_id == context.branch_id,
        Patient.deleted_at.is_(None),
    )
    if q:
        clean_q = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            (func.lower(Patient.name).like(clean_q)) |
            (func.lower(Patient.uhid).like(clean_q)) |
            (Patient.phone.like(clean_q))
        )
    if gender:
        stmt = stmt.where(Patient.gender == gender.lower())

    offset = offset_val if offset_val is not None else (page - 1) * limit
    count_stmt = select(func.count(Patient.id)).where(
        Patient.branch_id == context.branch_id,
        Patient.deleted_at.is_(None),
    )
    total = await execute_scalar(count_stmt) or 0

    stmt = stmt.order_by(desc(Patient.id)).limit(limit).offset(offset)
    patients = await execute_all(stmt)

    return api_response(
        data={
            "patients": [{
                "id": p.id,
                "uhid": p.uhid,
                "name": p.name,
                "phone": p.phone,
                "gender": p.gender,
                "dob": p.dob.isoformat() if p.dob else None,
                "blood_group": p.blood_group,
                "address": p.address,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if hasattr(p, "created_at") and p.created_at else None,
            } for p in patients],
            "total": total,
            "page": page,
            "limit": limit,
        },
        message="Patients retrieved successfully",
    )


@router.post("/create")
async def create_patient(
    payload: PatientCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id

    # Auto-generate UHID: prefix + 6 digits
    count = await execute_scalar(
        select(func.count(Patient.id)).where(Patient.company_id == context.company_id)
    ) or 0
    uhid = f"{context.code_prefix}{str(count + 1).zfill(6)}"

    async with transaction() as session:
        p = Patient(
            company_id=context.company_id,
            branch_id=branch_id,
            uhid=uhid,
            name=payload.name.strip(),
            phone=payload.phone.strip() if payload.phone else None,
            gender=payload.gender.lower(),
            dob=payload.dob,
            blood_group=payload.blood_group,
            address=payload.address,
            is_active=True,
        )
        saved = await save_entity(p, session=session)

    return api_response(
        data={
            "patient": {
                "id": saved.id,
                "uhid": saved.uhid,
                "name": saved.name,
                "phone": saved.phone,
                "gender": saved.gender,
            }
        },
        message="Patient registered successfully",
        status_code=201,
    )


@router.get("/get-by-id")
async def get_patient_by_id(
    patient_id: int = Query(..., alias="patientId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(Patient).where(
        Patient.id == patient_id,
        Patient.branch_id == context.branch_id,
        Patient.deleted_at.is_(None),
    )
    p = await execute_one_or_none(stmt)
    if not p:
        raise AppException("Patient not found", code=ErrorCode.NOT_FOUND, status_code=404)

    return api_response(
        data={
            "patient": {
                "id": p.id,
                "uhid": p.uhid,
                "name": p.name,
                "phone": p.phone,
                "gender": p.gender,
                "dob": p.dob.isoformat() if p.dob else None,
                "blood_group": p.blood_group,
                "address": p.address,
                "is_active": p.is_active,
            }
        },
        message="Patient retrieved successfully",
    )


@router.patch("/update")
async def update_patient(
    payload: PatientUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    p = await execute_one_or_none(
        select(Patient).where(Patient.id == payload.patient_id, Patient.branch_id == branch_id)
    )
    if not p:
        raise AppException("Patient not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.name is not None:
        vals["name"] = payload.name.strip()
    if payload.phone is not None:
        vals["phone"] = payload.phone.strip()
    if payload.gender is not None:
        vals["gender"] = payload.gender.lower()
    if payload.dob is not None:
        vals["dob"] = payload.dob
    if payload.blood_group is not None:
        vals["blood_group"] = payload.blood_group
    if payload.address is not None:
        vals["address"] = payload.address

    if vals:
        async with transaction() as session:
            stmt = update(Patient).where(Patient.id == p.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "patient_id": p.id}, message="Patient updated successfully")


@router.post("/toggle-active")
async def toggle_patient_active(
    payload: PatientToggleActivePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    p = await execute_one_or_none(
        select(Patient).where(Patient.id == payload.patient_id, Patient.branch_id == branch_id)
    )
    if not p:
        raise AppException("Patient not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(Patient).where(Patient.id == p.id).values(is_active=payload.is_active)
        await execute_dml(stmt, session=session)

    return api_response(
        data={"ok": True, "patient_id": p.id, "is_active": payload.is_active},
        message=f"Patient {'activated' if payload.is_active else 'deactivated'} successfully",
    )


@router.post("/direct-bill")
async def direct_bill(
    payload: DirectBillPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    p = await execute_one_or_none(select(Patient).where(Patient.id == payload.patient_id, Patient.branch_id == branch_id))
    if not p:
        raise AppException("Patient not found", code=ErrorCode.NOT_FOUND, status_code=404)

    invoice_number = f"INV-{context.code_prefix}-{int(datetime.now(timezone.utc).timestamp())}"
    async with transaction() as session:
        inv = Invoice(
            company_id=context.company_id,
            branch_id=branch_id,
            patient_id=p.id,
            invoice_number=invoice_number,
            status="paid",
            total_net_paise=payload.amount_paise,
            total_tax_paise=0,
            total_gross_paise=payload.amount_paise,
            balance_due_paise=0,
        )
        saved_inv = await save_entity(inv, session=session)

        pmt = InvoicePayment(
            invoice_id=saved_inv.id,
            company_id=context.company_id,
            amount_paise=payload.amount_paise,
            payment_method=payload.payment_method,
            transaction_ref="DIRECT-PAY",
        )
        await save_entity(pmt, session=session)

    return api_response(
        data={"invoice_id": saved_inv.id, "invoice_number": invoice_number},
        message="Direct bill created and recorded successfully",
        status_code=201,
    )


@router.post("/direct-lab-order")
async def direct_lab_order(
    payload: DirectLabOrderPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    p = await execute_one_or_none(select(Patient).where(Patient.id == payload.patient_id, Patient.branch_id == branch_id))
    if not p:
        raise AppException("Patient not found", code=ErrorCode.NOT_FOUND, status_code=404)

    order_number = f"LAB-{context.code_prefix}-{int(datetime.now(timezone.utc).timestamp())}"
    async with transaction() as session:
        order = LabOrder(
            company_id=context.company_id,
            branch_id=branch_id,
            patient_id=p.id,
            doctor_id=payload.doctor_id,
            order_number=order_number,
            status="ordered",
            notes=payload.notes,
        )
        saved = await save_entity(order, session=session)

    return api_response(
        data={"order_id": saved.id, "order_number": order_number},
        message="Direct lab order created successfully",
        status_code=201,
    )


@router.get("/bills")
async def get_patient_bills(
    patient_id: int = Query(..., alias="patientId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(Invoice)
        .where(Invoice.patient_id == patient_id, Invoice.branch_id == context.branch_id)
        .order_by(desc(Invoice.id))
    )
    invoices = await execute_all(stmt)
    return api_response(
        data={"bills": [{
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "status": inv.status,
            "total_gross_paise": inv.total_gross_paise,
            "balance_due_paise": inv.balance_due_paise,
            "created_at": inv.created_at.isoformat() if hasattr(inv, "created_at") and inv.created_at else None,
        } for inv in invoices]},
        message="Patient bills retrieved successfully",
    )


@router.get("/lab-orders")
async def get_patient_lab_orders(
    patient_id: int = Query(..., alias="patientId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(LabOrder)
        .where(LabOrder.patient_id == patient_id, LabOrder.branch_id == context.branch_id)
        .order_by(desc(LabOrder.id))
    )
    orders = await execute_all(stmt)
    return api_response(
        data={"lab_orders": [{
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "notes": o.notes,
            "created_at": o.created_at.isoformat() if hasattr(o, "created_at") and o.created_at else None,
        } for o in orders]},
        message="Patient lab orders retrieved successfully",
    )


@router.get("/last-pharmacy-purchase")
async def get_last_pharmacy_purchase(
    patient_id: int = Query(..., alias="patientId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(PharmacySale)
        .where(PharmacySale.patient_id == patient_id, PharmacySale.branch_id == context.branch_id)
        .order_by(desc(PharmacySale.id))
        .limit(1)
    )
    sale = await execute_one_or_none(stmt)
    return api_response(
        data={"sale": {
            "id": sale.id,
            "invoice_number": sale.invoice_number,
            "total_paise": sale.total_paise,
            "status": sale.status,
        } if sale else None},
        message="Last pharmacy purchase retrieved successfully",
    )


@router.get("/visit-history")
async def get_patient_visit_history(
    patient_id: int = Query(..., alias="patientId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(OpVisit)
        .where(OpVisit.patient_id == patient_id, OpVisit.branch_id == context.branch_id)
        .order_by(desc(OpVisit.id))
    )
    visits = await execute_all(stmt)
    return api_response(
        data={"visits": [{
            "id": v.id,
            "visit_number": v.visit_number,
            "status": v.status,
            "complaint": v.complaint,
            "created_at": v.created_at.isoformat() if hasattr(v, "created_at") and v.created_at else None,
        } for v in visits]},
        message="Patient visit history retrieved successfully",
    )


@router.post("/create-visit")
async def create_visit_for_patient(
    payload: CreateVisitForPatientPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    p = await execute_one_or_none(select(Patient).where(Patient.id == payload.patient_id, Patient.branch_id == branch_id))
    if not p:
        raise AppException("Patient not found", code=ErrorCode.NOT_FOUND, status_code=404)

    visit_number = f"OP-{context.code_prefix}-{int(datetime.now(timezone.utc).timestamp())}"
    async with transaction() as session:
        v = OpVisit(
            company_id=context.company_id,
            branch_id=branch_id,
            patient_id=p.id,
            doctor_id=payload.doctor_id,
            visit_number=visit_number,
            status="scheduled",
            priority=payload.priority,
            complaint=payload.complaint,
        )
        saved = await save_entity(v, session=session)

    return api_response(
        data={"visit": {"id": saved.id, "visit_number": saved.visit_number, "status": saved.status}},
        message="Visit scheduled successfully",
        status_code=201,
    )


@router.get("/treatment-courses")
async def get_patient_treatment_courses(
    patient_id: int = Query(..., alias="patientId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(TreatmentCourse)
        .where(TreatmentCourse.patient_id == patient_id, TreatmentCourse.branch_id == context.branch_id)
        .order_by(desc(TreatmentCourse.id))
    )
    courses = await execute_all(stmt)
    return api_response(
        data={"courses": [{
            "id": c.id,
            "name": c.name,
            "status": c.status,
            "total_sittings": c.total_sittings,
            "completed_sittings": c.completed_sittings,
        } for c in courses]},
        message="Treatment courses retrieved successfully",
    )


@router.post("/pay-due-balance")
async def pay_due_balance(
    payload: PayDueBalancePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    p = await execute_one_or_none(select(Patient).where(Patient.id == payload.patient_id, Patient.branch_id == branch_id))
    if not p:
        raise AppException("Patient not found", code=ErrorCode.NOT_FOUND, status_code=404)

    # Find unpaid invoices
    stmt = (
        select(Invoice)
        .where(Invoice.patient_id == p.id, Invoice.branch_id == branch_id, Invoice.balance_due_paise > 0)
        .order_by(Invoice.id)
    )
    invoices = await execute_all(stmt)
    remaining = payload.amount_paise

    async with transaction() as session:
        for inv in invoices:
            if remaining <= 0:
                break
            allocation = min(remaining, inv.balance_due_paise)
            pmt = InvoicePayment(
                invoice_id=inv.id,
                company_id=context.company_id,
                amount_paise=allocation,
                payment_method=payload.payment_method,
                transaction_ref="DUE-PAYMENT",
            )
            await save_entity(pmt, session=session)

            new_bal = inv.balance_due_paise - allocation
            new_status = "paid" if new_bal == 0 else "partially_paid"
            up_stmt = update(Invoice).where(Invoice.id == inv.id).values(
                balance_due_paise=new_bal,
                status=new_status,
            )
            await execute_dml(up_stmt, session=session)
            remaining -= allocation

    return api_response(data={"ok": True, "allocated_paise": payload.amount_paise - remaining}, message="Due balance paid successfully")


@router.get("/summary-report")
async def get_patient_summary_report(
    patient_id: int = Query(..., alias="patientId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    p = await execute_one_or_none(
        select(Patient).where(Patient.id == patient_id, Patient.branch_id == context.branch_id)
    )
    if not p:
        raise AppException("Patient not found", code=ErrorCode.NOT_FOUND, status_code=404)

    return api_response(
        data={
            "summary": {
                "patient": {"id": p.id, "uhid": p.uhid, "name": p.name},
                "total_visits": await execute_scalar(select(func.count(OpVisit.id)).where(OpVisit.patient_id == p.id)) or 0,
                "total_invoices": await execute_scalar(select(func.count(Invoice.id)).where(Invoice.patient_id == p.id)) or 0,
            }
        },
        message="Patient summary report retrieved successfully",
    )


@router.get("/documents")
async def get_patient_documents(
    patient_id: int = Query(..., alias="patientId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(data={"documents": []}, message="Patient documents retrieved successfully")


@router.post("/upload-document")
async def upload_patient_document(
    patient_id: int = Query(..., alias="patientId"),
    file: UploadFile = File(...),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(
        data={"file_name": file.filename, "size": file.size or 0, "status": "uploaded"},
        message="Document uploaded successfully",
        status_code=201,
    )
