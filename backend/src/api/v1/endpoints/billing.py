"""Billing, Invoicing, and Cashier Reconciliation Router."""

from datetime import datetime, timezone
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
    rows = await execute_all(stmt)
    settings_map = {s.key: s.value for s in rows}
    return api_response(
        data={
            "settings": {
                "consultation_fee_paise": int(settings_map.get("consultation_fee_paise", 50000)),
                "followup_fee_paise": int(settings_map.get("followup_fee_paise", 20000)),
                "followup_days": int(settings_map.get("followup_days", 7)),
                "tax_enabled": settings_map.get("tax_enabled", "false") == "true",
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
    updates = {}
    if payload.consultation_fee_paise is not None:
        updates["consultation_fee_paise"] = str(payload.consultation_fee_paise)
    if payload.followup_fee_paise is not None:
        updates["followup_fee_paise"] = str(payload.followup_fee_paise)
    if payload.followup_days is not None:
        updates["followup_days"] = str(payload.followup_days)
    if payload.tax_enabled is not None:
        updates["tax_enabled"] = "true" if payload.tax_enabled else "false"

    async with transaction() as session:
        for k, v in updates.items():
            existing = await execute_one_or_none(
                select(ClinicSetting).where(ClinicSetting.branch_id == branch_id, ClinicSetting.key == k)
            )
            if existing:
                stmt = update(ClinicSetting).where(ClinicSetting.id == existing.id).values(value=v)
                await execute_dml(stmt, session=session)
            else:
                s = ClinicSetting(branch_id=branch_id, key=k, value=v)
                await save_entity(s, session=session)

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
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(
            func.coalesce(func.sum(Invoice.total_gross_paise), 0).label("billed_paise"),
            func.coalesce(func.sum(Invoice.balance_due_paise), 0).label("due_paise"),
            func.count(Invoice.id).label("invoice_count"),
        )
        .where(Invoice.branch_id == context.branch_id)
    )
    res = await execute_one_or_none(stmt)
    billed = getattr(res, "billed_paise", 0) if res else 0
    due = getattr(res, "due_paise", 0) if res else 0
    cnt = getattr(res, "invoice_count", 0) if res else 0

    return api_response(
        data={
            "report": {
                "total_billed_paise": billed,
                "total_due_paise": due,
                "total_collected_paise": billed - due,
                "invoice_count": cnt,
            }
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
