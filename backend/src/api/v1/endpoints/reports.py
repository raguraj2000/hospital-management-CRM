"""Dynamic Reporting Module and Catalog Router."""

import csv
from datetime import date, datetime, timezone
import io
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_one_or_none, execute_scalar
from src.models.public.billing import Invoice, InvoicePayment
from src.models.public.clinical import OpVisit, Patient
from src.models.public.diagnostic_lab import LabOrder
from src.models.public.financial import Expense, PurchaseInvoice
from src.models.public.pharmacy import InventoryBatch, Medicine, PharmacySale
from src.schemas.common import api_response

router = APIRouter(prefix="/reports", tags=["Dynamic Reports"])


# Report Catalog Definitions
REPORT_CATALOG = [
    {
        "id": "daily_cashier_summary",
        "title": "Daily Cashier Summary",
        "category": "Billing",
        "description": "Daily reconciliation of cash, card, and UPI collections.",
        "parameters": [
            {"name": "report_date", "type": "date", "required": False, "description": "Date of collection"}
        ],
        "columns": ["payment_method", "transaction_count", "total_amount_paise"],
        "export_formats": ["csv", "json"],
    },
    {
        "id": "revenue_period_analysis",
        "title": "Revenue Performance Report",
        "category": "Finance",
        "description": "Revenue, dues, and operational collections across a selected period.",
        "parameters": [
            {"name": "start_date", "type": "date", "required": False},
            {"name": "end_date", "type": "date", "required": False},
        ],
        "columns": ["date", "invoices_generated", "gross_billed_paise", "collections_paise", "balance_due_paise"],
        "export_formats": ["csv", "json"],
    },
    {
        "id": "pharmacy_stock_expiry",
        "title": "Pharmacy Stock Expiry & Reorder",
        "category": "Pharmacy",
        "description": "Inventory batches approaching expiry and medicines below reorder threshold.",
        "parameters": [
            {"name": "days_to_expiry", "type": "int", "required": False, "default": 90}
        ],
        "columns": ["medicine_name", "batch_no", "expiry_date", "stock_units", "unit_cost_paise", "mrp_paise"],
        "export_formats": ["csv", "json"],
    },
    {
        "id": "lab_workload_summary",
        "title": "Laboratory Workload & Turnaround",
        "category": "Laboratory",
        "description": "Summary of diagnostic orders, test volumes, and completion statuses.",
        "parameters": [
            {"name": "start_date", "type": "date", "required": False},
            {"name": "end_date", "type": "date", "required": False},
        ],
        "columns": ["order_number", "patient_name", "uhid", "status", "ordered_at"],
        "export_formats": ["csv", "json"],
    },
    {
        "id": "opd_attendance_summary",
        "title": "OPD Attendance and Doctor Roster",
        "category": "Clinical",
        "description": "Outpatient consultation attendance, queue timings, and patient volumes.",
        "parameters": [
            {"name": "visit_date", "type": "date", "required": False}
        ],
        "columns": ["token_no", "patient_name", "uhid", "doctor_id", "status", "complaint"],
        "export_formats": ["csv", "json"],
    },
]


class ReportGeneratePayload(BaseModel):
    model_config = {"populate_by_name": True}

    report_id: str = Field(..., alias="reportId")
    parameters: Dict[str, Any] = {}
    branch_id: Optional[int] = Field(None, alias="branchId")


@router.get("/catalog")
async def get_report_catalog(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(data={"reports": REPORT_CATALOG}, message="Report catalog retrieved successfully")


@router.post("/generate")
async def generate_report(
    payload: ReportGeneratePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    definition = next((r for r in REPORT_CATALOG if r["id"] == payload.report_id), None)
    if not definition:
        raise AppException(f"Report '{payload.report_id}' not found in catalog.", code=ErrorCode.NOT_FOUND, status_code=404)

    rows: List[Dict[str, Any]] = []
    summary: Dict[str, Any] = {}

    if payload.report_id == "daily_cashier_summary":
        stmt = (
            select(
                InvoicePayment.mode.label("payment_method"),
                func.count(InvoicePayment.id).label("count"),
                func.coalesce(func.sum(InvoicePayment.amount_paise), 0).label("total"),
            )
            .join(Invoice, Invoice.id == InvoicePayment.invoice_id)
            .where(Invoice.branch_id == context.branch_id)
            .group_by(InvoicePayment.mode)
        )
        results = await execute_all(stmt)
        for r in results:
            rows.append({
                "payment_method": r[0],
                "transaction_count": r[1],
                "total_amount_paise": r[2],
            })
        summary["total_collected_paise"] = sum(r["total_amount_paise"] for r in rows)

    elif payload.report_id == "pharmacy_stock_expiry":
        stmt = (
            select(InventoryBatch, Medicine)
            .join(Medicine, Medicine.id == InventoryBatch.medicine_id)
            .where(InventoryBatch.inventory_id == context.inventory_id)
            .order_by(InventoryBatch.expiry_date)
            .limit(100)
        )
        results = await execute_all(stmt)
        for b, m in results:
            rows.append({
                "medicine_name": m.name,
                "batch_no": b.batch_no,
                "expiry_date": b.expiry_date.isoformat(),
                "stock_units": b.quantity,
                "unit_cost_paise": b.unit_cost_paise,
                "mrp_paise": b.mrp_paise,
            })
        summary["total_batches"] = len(rows)

    elif payload.report_id == "lab_workload_summary":
        stmt = (
            select(LabOrder, Patient)
            .join(Patient, Patient.id == LabOrder.patient_id)
            .where(LabOrder.branch_id == context.branch_id)
            .order_by(desc(LabOrder.id))
            .limit(100)
        )
        results = await execute_all(stmt)
        for o, p in results:
            rows.append({
                "order_number": o.order_number,
                "patient_name": p.name,
                "uhid": p.uhid,
                "status": o.status,
                "ordered_at": o.created_at.isoformat() if hasattr(o, "created_at") and o.created_at else None,
            })
        summary["total_orders"] = len(rows)

    elif payload.report_id == "opd_attendance_summary":
        stmt = (
            select(OpVisit, Patient)
            .join(Patient, Patient.id == OpVisit.patient_id)
            .where(OpVisit.branch_id == context.branch_id)
            .order_by(desc(OpVisit.id))
            .limit(100)
        )
        results = await execute_all(stmt)
        for v, p in results:
            rows.append({
                "token_no": v.token_no,
                "patient_name": p.name,
                "uhid": p.uhid,
                "doctor_id": v.doctor_id,
                "status": v.status,
                "complaint": v.chief_complaint,
            })
        summary["total_visits"] = len(rows)

    else:
        # Default revenue summary
        stmt = (
            select(Invoice)
            .where(Invoice.branch_id == context.branch_id)
            .order_by(desc(Invoice.id))
            .limit(50)
        )
        invoices = await execute_all(stmt)
        for inv in invoices:
            rows.append({
                "date": inv.created_at.isoformat() if hasattr(inv, "created_at") and inv.created_at else None,
                "invoices_generated": 1,
                "gross_billed_paise": inv.total_gross_paise,
                "collections_paise": inv.total_gross_paise - inv.balance_due_paise,
                "balance_due_paise": inv.balance_due_paise,
            })
        summary["total_invoices"] = len(invoices)

    return api_response(
        data={
            "report": {
                "metadata": definition,
                "columns": definition["columns"],
                "rows": rows,
                "summary": summary,
            }
        },
        message="Report generated successfully",
    )


@router.get("/export")
async def export_report(
    report_id: Optional[str] = Query(None, alias="reportId"),
    report_id_snake: Optional[str] = Query(None, alias="report_id"),
    format: str = Query("csv"),
    context: BranchContext = Depends(get_branch_context),
) -> Response:
    effective_report_id = report_id or report_id_snake
    if not effective_report_id:
        raise AppException("Missing report_id query parameter.", code=ErrorCode.BAD_REQUEST, status_code=400)

    # Generate report data first
    gen_payload = ReportGeneratePayload(report_id=effective_report_id)
    gen_resp = await generate_report(gen_payload, context)
    report_data = gen_resp["data"]["report"]
    columns = report_data["columns"]
    rows = report_data["rows"]

    # Stream CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns)
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k, "") for k in columns})

    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{report_id}-{context.branch_id}.csv"'},
    )
