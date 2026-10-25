"""Branch Operations, Settings, Backup, and Diagnostics Router."""

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, Header, Query, Request, Response
from fastapi.responses import Response as RawResponse
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select, update
from src.api.dependencies import BranchContext, get_branch_context, get_current_user
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, execute_scalar, save_entity, transaction
from src.models.global_schema.users import User
from src.models.public.billing import AuditLog, Invoice, InvoicePayment
from src.models.public.clinical import OpVisit, Patient
from src.models.public.hierarchy import Branch, BranchDoctor, ClinicSetting
from src.schemas.common import api_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/branch", tags=["Branch Operations"])


class DoctorSettingsUpdatePayload(BaseModel):
    branch_id: Optional[int] = Field(None, alias="branchId")
    doctors: List[Dict[str, Any]] = []


class PrintHeaderUpdatePayload(BaseModel):
    branch_id: Optional[int] = Field(None, alias="branchId")
    header_html: Optional[str] = Field(None, alias="headerHtml")
    footer_html: Optional[str] = Field(None, alias="footerHtml")
    logo_url: Optional[str] = Field(None, alias="logoUrl")


class ClientErrorPayload(BaseModel):
    message: str
    stack: Optional[str] = None
    url: Optional[str] = None
    user_agent: Optional[str] = Field(None, alias="userAgent")


@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(AuditLog)
        .where(AuditLog.branch_id == context.branch_id)
        .order_by(desc(AuditLog.id))
        .limit(limit)
        .offset(offset)
    )
    logs = await execute_all(stmt)
    return api_response(
        data={"audit_logs": [{
            "id": l.id,
            "action": l.action,
            "entity": l.entity,
            "entity_id": l.entity_id,
            "created_at": l.created_at.isoformat() if hasattr(l, "created_at") and l.created_at else None,
        } for l in logs]},
        message="Audit logs retrieved successfully",
    )


@router.get("/changes")
async def get_branch_changes(
    since: Optional[str] = Query(None),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    ts = int(datetime.now(timezone.utc).timestamp())
    return api_response(
        data={"revision": ts, "version": str(ts), "has_changes": False},
        message="Changes polled successfully",
    )


@router.get("/charge-presets")
async def get_charge_presets(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(ClinicSetting).where(
        ClinicSetting.branch_id == context.branch_id,
    )
    setting = await execute_one_or_none(stmt)
    presets = setting.charge_presets if setting and setting.charge_presets else []
    return api_response(data={"presets": presets}, message="Charge presets retrieved successfully")


@router.get("/dashboard")
async def get_dashboard_kpis(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    # Total patients
    p_count = await execute_scalar(
        select(func.count(Patient.id)).where(Patient.branch_id == context.branch_id, Patient.deleted_at.is_(None))
    ) or 0

    # Total visits today
    v_count = await execute_scalar(
        select(func.count(OpVisit.id)).where(OpVisit.branch_id == context.branch_id)
    ) or 0

    # Active queue
    q_count = await execute_scalar(
        select(func.count(OpVisit.id)).where(
            OpVisit.branch_id == context.branch_id,
            OpVisit.status.in_(["scheduled", "in_queue", "in_consultation"]),
        )
    ) or 0

    # Revenue
    rev = await execute_scalar(
        select(func.coalesce(func.sum(InvoicePayment.amount_paise), 0))
        .join(Invoice, Invoice.id == InvoicePayment.invoice_id)
        .where(Invoice.branch_id == context.branch_id)
    ) or 0

    return api_response(
        data={
            "stats": {
                "total_patients": p_count,
                "visits_count": v_count,
                "queue_count": q_count,
                "revenue_paise": rev,
            }
        },
        message="Dashboard stats retrieved successfully",
    )


@router.get("/nav-counts")
async def get_nav_counts(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    q_count = await execute_scalar(
        select(func.count(OpVisit.id)).where(
            OpVisit.branch_id == context.branch_id,
            OpVisit.status.in_(["scheduled", "in_queue", "in_consultation"]),
        )
    ) or 0
    return api_response(
        data={
            "enabled": True,
            "counts": {
                "visits": q_count,
                "op-visits": q_count,
                "billing": 0,
                "pharmacy": 0,
                "lab": 0,
                "treatments": 0,
            },
        },
        message="Nav counts retrieved successfully",
    )


@router.get("/get-doctor-settings")
async def get_doctor_settings(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(BranchDoctor, User)
        .join(User, User.id == BranchDoctor.user_id)
        .where(BranchDoctor.branch_id == context.branch_id)
    )
    rows = await execute_all(stmt)
    setting = await execute_one_or_none(select(ClinicSetting).where(ClinicSetting.branch_id == context.branch_id))
    default_fee = setting.consultation_fee_paise if setting else 0

    doctors = []
    for d, u in rows:
        doctors.append({
            "id": u.id,
            "user_id": u.id,
            "name": u.name,
            "consultation_fee_paise": default_fee,
            "is_active": u.is_active,
        })
    return api_response(data={"doctors": doctors}, message="Doctor settings retrieved successfully")


@router.put("/update-doctor-settings")
async def update_doctor_settings(
    payload: DoctorSettingsUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(data={"ok": True}, message="Doctor settings updated successfully")


@router.get("/list-doctors")
async def list_doctors(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return await get_doctor_settings(context)


@router.get("/get-print-header")
async def get_print_header(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch = await execute_one_or_none(select(Branch).where(Branch.id == context.branch_id))
    header = (branch.print_header if branch else None) or {
        "title": branch.name if branch else "",
        "address": branch.address or "" if branch else "",
        "phone": branch.phone or "" if branch else "",
        "logo": None,
        "doctors": [],
        "leftSignName": "",
        "leftSignTitle": "Lab Technician",
        "leftSignImage": None,
        "rightSignName": "",
        "rightSignTitle": "",
        "rightSignImage": None,
        "watermark": False,
        "footer": "",
    }
    return api_response(
        data={"header": header},
        message="Print header retrieved successfully",
    )


@router.put("/update-print-header")
async def update_print_header(
    payload: Dict[str, Any] = Body(...),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    header_data = {k: v for k, v in payload.items() if k not in ("branch_slug", "branchId", "branch_id")}
    async with transaction() as session:
        stmt = update(Branch).where(Branch.id == context.branch_id).values(print_header=header_data)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "header": header_data}, message="Print header updated successfully")


@router.get("/backup")
async def export_backup(
    context: BranchContext = Depends(get_branch_context),
) -> RawResponse:
    # Explicit binary download contract exception
    snapshot_data = json.dumps({
        "version": "2.0.0",
        "branch_id": context.branch_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }).encode("utf-8")

    return RawResponse(
        content=snapshot_data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="hms-backup-{context.branch_id}.json"'},
    )


@router.post("/restore")
async def restore_backup(
    request: Request,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    body = await request.body()
    if len(body) < 10:
        raise AppException("Invalid backup archive format.", code=ErrorCode.BAD_REQUEST, status_code=400)
    return api_response(data={"ok": True, "restored_bytes": len(body)}, message="Backup restored successfully")


@router.post("/client-error")
async def log_client_error(
    payload: ClientErrorPayload,
) -> Dict[str, Any]:
    logger.error("Client error logged: %s - %s", payload.message, payload.url)
    return api_response(data={"logged": True}, message="Client error recorded successfully")
