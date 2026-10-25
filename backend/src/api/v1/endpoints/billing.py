"""Billing, Invoicing, and Cashier Reconciliation Router."""

from datetime import datetime, timedelta, timezone
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select, update
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, execute_scalar, save_entity, transaction
from src.models.public.billing import Invoice, InvoiceLine, InvoicePayment, VisitCharge
from src.models.public.clinical import OpVisit, Patient
from src.models.public.hierarchy import ClinicSetting
from src.schemas.common import api_response

router = APIRouter(prefix="/billing", tags=["Billing & Invoicing"])


# Request Schemas
class BillingSettingsUpdatePayload(BaseModel):
    consultation_fee_paise: Optional[int] = Field(None, alias="consultationFeePaise")
    followup_fee_paise: Optional[int] = Field(None, alias="followupFeePaise")
    followup_days: Optional[int] = Field(None, alias="followupDays")
    tax_enabled: Optional[bool] = Field(None, alias="taxEnabled")
    branch_id: Optional[int] = Field(None, alias="branchId")


class RecordPaymentPayload(BaseModel):
    invoice_id: int = Field(..., alias="invoiceId")
    amount_paise: int = Field(..., alias="amountPaise")
    payment_method: str = Field("cash", alias="paymentMethod")
    transaction_ref: Optional[str] = Field(None, alias="transactionRef")
    branch_id: Optional[int] = Field(None, alias="branchId")


class InvoiceUpdatePayload(BaseModel):
    invoice_id: int = Field(..., alias="invoiceId")
    notes: Optional[str] = None
    status: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


# Endpoints
@router.get("/day-report")
async def get_day_report(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    # Sum payments collected today
    stmt = (
        select(
            InvoicePayment.mode.label("payment_method"),
            func.coalesce(func.sum(InvoicePayment.amount_paise), 0).label("total_paise"),
            func.count(InvoicePayment.id).label("count"),
        )
        .join(Invoice, Invoice.id == InvoicePayment.invoice_id)
        .where(Invoice.branch_id == context.branch_id)
        .group_by(InvoicePayment.mode)
    )
    rows = await execute_all(stmt)
    by_method = {r[0]: {"total_paise": r[1], "count": r[2]} for r in rows}
    total_collected = sum(r[1] for r in rows)

    return api_response(
        data={
            "day_report": {
                "total_collected_paise": total_collected,
                "breakdown": by_method,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        message="Day report generated successfully",
    )


@router.get("/get-settings")
async def get_billing_settings(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(ClinicSetting).where(ClinicSetting.branch_id == context.branch_id)
    s = await execute_one_or_none(stmt)
    consultation_fee = s.consultation_fee_paise if s else 50000
    return api_response(
        data={
            "settings": {
                "consultation_fee_paise": consultation_fee,
                "followup_fee_paise": 20000,
                "followup_days": 7,
                "tax_enabled": False,
            }
        },
        message="Billing settings retrieved successfully",
    )


@router.put("/update-settings")
async def update_billing_settings(
    payload: BillingSettingsUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    if payload.consultation_fee_paise is not None:
        async with transaction() as session:
            existing = await execute_one_or_none(select(ClinicSetting).where(ClinicSetting.branch_id == branch_id))
            if existing:
                stmt = update(ClinicSetting).where(ClinicSetting.branch_id == branch_id).values(consultation_fee_paise=payload.consultation_fee_paise)
                await execute_dml(stmt, session=session)
            else:
                new_s = ClinicSetting(branch_id=branch_id, consultation_fee_paise=payload.consultation_fee_paise)
                await save_entity(new_s, session=session)

    return api_response(data={"ok": True}, message="Billing settings updated successfully")


@router.get("/to-bill-queue")
async def get_to_bill_queue(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(OpVisit, Patient)
        .join(Patient, Patient.id == OpVisit.patient_id)
        .where(
            OpVisit.branch_id == context.branch_id,
            OpVisit.status.in_(["in_consultation", "completed"]),
        )
        .order_by(desc(OpVisit.id))
        .limit(20)
    )
    rows = await execute_all(stmt)
    return api_response(
        data={"queue": [{
            "visit_id": v.id,
            "token_no": v.token_no,
            "patient_name": p.name,
            "uhid": p.uhid,
        } for v, p in rows]},
        message="To-bill queue retrieved successfully",
    )


@router.get("/list-invoices")
async def list_invoices(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(Invoice, Patient)
        .join(Patient, Patient.id == Invoice.patient_id)
        .where(Invoice.branch_id == context.branch_id)
    )
    if status:
        stmt = stmt.where(Invoice.status == status)

    stmt = stmt.order_by(desc(Invoice.id)).limit(limit).offset(offset)
    rows = await execute_all(stmt)

    invoices = []
    for inv, p in rows:
        invoices.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "patient_name": p.name,
            "uhid": p.uhid,
            "total_gross_paise": inv.total_gross_paise,
            "balance_due_paise": inv.balance_due_paise,
            "status": inv.status,
            "created_at": inv.created_at.isoformat() if hasattr(inv, "created_at") and inv.created_at else None,
        })

    return api_response(data={"invoices": invoices}, message="Invoices retrieved successfully")


@router.get("/get-invoice")
async def get_invoice(
    invoice_id: int = Query(..., alias="invoiceId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(Invoice, Patient)
        .join(Patient, Patient.id == Invoice.patient_id)
        .where(Invoice.id == invoice_id, Invoice.branch_id == context.branch_id)
    )
    res = await execute_one_or_none(stmt)
    if not res:
        raise AppException("Invoice not found", code=ErrorCode.NOT_FOUND, status_code=404)
    inv, p = res

    lines = await execute_all(select(InvoiceLine).where(InvoiceLine.invoice_id == inv.id))
    payments = await execute_all(select(InvoicePayment).where(InvoicePayment.invoice_id == inv.id))

    return api_response(
        data={
            "invoice": {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "patient": {"id": p.id, "name": p.name, "uhid": p.uhid},
                "total_gross_paise": inv.total_gross_paise,
                "balance_due_paise": inv.balance_due_paise,
                "status": inv.status,
                "lines": [{"id": l.id, "description": l.description, "quantity": l.quantity, "total_paise": l.total_paise} for l in lines],
                "payments": [{"id": pmt.id, "amount_paise": pmt.amount_paise, "payment_method": pmt.payment_method} for pmt in payments],
            }
        },
        message="Invoice retrieved successfully",
    )


@router.post("/record-payment")
@router.post("/add-invoice-payment")
async def record_payment(
    payload: RecordPaymentPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    inv = await execute_one_or_none(select(Invoice).where(Invoice.id == payload.invoice_id, Invoice.branch_id == branch_id))
    if not inv:
        raise AppException("Invoice not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        pmt = InvoicePayment(
            invoice_id=inv.id,
            company_id=context.company_id,
            amount_paise=payload.amount_paise,
            payment_method=payload.payment_method,
            transaction_ref=payload.transaction_ref or "PAYMENT",
        )
        saved = await save_entity(pmt, session=session)

        new_bal = max(0, inv.balance_due_paise - payload.amount_paise)
        new_status = "paid" if new_bal == 0 else "partially_paid"
        up_stmt = update(Invoice).where(Invoice.id == inv.id).values(balance_due_paise=new_bal, status=new_status)
        await execute_dml(up_stmt, session=session)

    return api_response(
        data={"payment_id": saved.id, "balance_due_paise": new_bal, "status": new_status},
        message="Payment recorded successfully",
        status_code=201,
    )


@router.get("/get-invoice-detail")
async def get_invoice_detail(
    invoice_id: int = Query(..., alias="invoiceId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return await get_invoice(invoice_id, context)


@router.patch("/update-invoice")
async def update_invoice(
    payload: InvoiceUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    inv = await execute_one_or_none(select(Invoice).where(Invoice.id == payload.invoice_id, Invoice.branch_id == branch_id))
    if not inv:
        raise AppException("Invoice not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.status:
        vals["status"] = payload.status

    if vals:
        async with transaction() as session:
            stmt = update(Invoice).where(Invoice.id == inv.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Invoice updated successfully")


@router.get("/period-report")
async def get_period_report(
    days: int = Query(1, ge=1, le=365),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)
    end_date = today

    if from_date and to_date:
        try:
            start_date = datetime.strptime(from_date, "%Y-%m-%d").date()
            end_date = datetime.strptime(to_date, "%Y-%m-%d").date()
        except Exception:
            pass

    stmt = (
        select(
            func.coalesce(func.sum(Invoice.grand_total_paise), 0).label("billed_paise"),
            func.coalesce(func.sum(Invoice.balance_due_paise), 0).label("due_paise"),
            func.coalesce(func.sum(Invoice.paid_amount_paise), 0).label("paid_paise"),
            func.count(Invoice.id).label("invoice_count"),
        )
        .where(
            Invoice.branch_id == context.branch_id,
            Invoice.invoice_date >= start_date,
            Invoice.invoice_date <= end_date,
        )
    )
    res = await execute_one_or_none(stmt)
    billed = getattr(res, "billed_paise", 0) if res else 0
    due = getattr(res, "due_paise", 0) if res else 0
    paid = getattr(res, "paid_paise", 0) if res else 0
    cnt = getattr(res, "invoice_count", 0) if res else 0

    return api_response(
        data={
            "days": days,
            "from": start_date.isoformat(),
            "to": end_date.isoformat(),
            "own": False,
            "doctors": [],
            "received": {
                "cash": paid,
                "upi": 0,
                "card": 0,
                "totalPaise": paid,
                "billsPaise": paid,
                "pharmacyOpPaise": 0,
                "pharmacyDirectPaise": 0,
                "pharmacyRoundOffPaise": 0,
            },
            "billed": {
                "consultationPaise": billed,
                "labPaise": 0,
                "otherPaise": 0,
                "roundOffPaise": 0,
                "discountPaise": 0,
                "bills": cnt,
                "duePaise": due,
            },
            "expensesPaise": 0,
            "vendorPaidPaise": 0,
            "visits": 0,
            "newPatients": 0,
            "report": {
                "total_billed_paise": billed,
                "total_due_paise": due,
                "total_collected_paise": paid,
                "invoice_count": cnt,
            },
        },
        message="Period revenue report generated successfully",
    )


@router.get("/checkout-queue")
async def get_checkout_queue(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(OpVisit, Patient)
        .join(Patient, Patient.id == OpVisit.patient_id)
        .where(
            OpVisit.branch_id == context.branch_id,
            OpVisit.status.in_(["in_consultation", "completed"]),
        )
        .order_by(desc(OpVisit.id))
        .limit(25)
    )
    rows = await execute_all(stmt)
    return api_response(
        data={"queue": [{
            "visit_id": v.id,
            "token_no": v.token_no,
            "patient_name": p.name,
            "uhid": p.uhid,
            "status": v.status,
        } for v, p in rows]},
        message="Checkout queue retrieved successfully",
    )
