"""Treatment Courses, Procedures, and Templates Router."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, select, update
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, save_entity, transaction
from src.models.public.clinical import Patient, TreatmentDose
from src.models.public.courses import CourseItem, CourseSitting, CourseTemplate, TreatmentCourse
from src.schemas.common import api_response

router = APIRouter(prefix="/treatment", tags=["Treatment Courses & Procedures"])


# Request Schemas
class CourseItemStatusPayload(BaseModel):
    item_id: int = Field(..., alias="itemId")
    status: str = Field(..., description="'completed', 'pending', or 'cancelled'")
    branch_id: Optional[int] = Field(None, alias="branchId")


class CourseTemplateCreatePayload(BaseModel):
    name: str
    total_sittings: int = Field(1, alias="totalSittings")
    default_notes: Optional[str] = Field(None, alias="defaultNotes")
    branch_id: Optional[int] = Field(None, alias="branchId")


class CourseTemplateUpdatePayload(BaseModel):
    template_id: int = Field(..., alias="templateId")
    name: Optional[str] = None
    total_sittings: Optional[int] = Field(None, alias="totalSittings")
    default_notes: Optional[str] = Field(None, alias="defaultNotes")
    branch_id: Optional[int] = Field(None, alias="branchId")


class CourseTemplateDeletePayload(BaseModel):
    template_id: int = Field(..., alias="templateId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class SittingUpdatePayload(BaseModel):
    sitting_id: int = Field(..., alias="sittingId")
    notes: Optional[str] = None
    status: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class SittingActionPayload(BaseModel):
    sitting_id: int = Field(..., alias="sittingId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class CourseActionPayload(BaseModel):
    course_id: int = Field(..., alias="courseId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class ScheduleSittingPayload(BaseModel):
    course_id: int = Field(..., alias="courseId")
    scheduled_at: Optional[datetime] = Field(None, alias="scheduledAt")
    notes: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class DoseAdministerPayload(BaseModel):
    dose_id: int = Field(..., alias="doseId")
    notes: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


# Endpoints
@router.patch("/update-item-status")
@router.post("/update-item-status")
async def update_item_status(
    payload: CourseItemStatusPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    item = await execute_one_or_none(select(CourseItem).where(CourseItem.id == payload.item_id))
    if not item:
        raise AppException("Course item not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(CourseItem).where(CourseItem.id == item.id).values(status=payload.status)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "status": payload.status}, message="Item status updated successfully")


@router.get("/list-templates")
async def list_templates(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(CourseTemplate).where(CourseTemplate.company_id == context.company_id)
    templates = await execute_all(stmt)
    return api_response(
        data={"templates": [{
            "id": t.id,
            "name": t.name,
            "total_sittings": t.total_sittings,
            "default_notes": t.default_notes,
        } for t in templates]},
        message="Templates retrieved successfully",
    )


@router.post("/create-template")
async def create_template(
    payload: CourseTemplateCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    async with transaction() as session:
        tmpl = CourseTemplate(
            company_id=context.company_id,
            name=payload.name.strip(),
            total_sittings=payload.total_sittings,
            default_notes=payload.default_notes,
        )
        saved = await save_entity(tmpl, session=session)

    return api_response(
        data={"template": {"id": saved.id, "name": saved.name}},
        message="Course template created successfully",
        status_code=201,
    )


@router.patch("/update-template")
@router.put("/update-template")
async def update_template(
    payload: CourseTemplateUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    tmpl = await execute_one_or_none(select(CourseTemplate).where(CourseTemplate.id == payload.template_id))
    if not tmpl:
        raise AppException("Template not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.name:
        vals["name"] = payload.name.strip()
    if payload.total_sittings is not None:
        vals["total_sittings"] = payload.total_sittings
    if payload.default_notes is not None:
        vals["default_notes"] = payload.default_notes

    if vals:
        async with transaction() as session:
            stmt = update(CourseTemplate).where(CourseTemplate.id == tmpl.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Template updated successfully")


@router.delete("/delete-template")
async def delete_template(
    payload: CourseTemplateDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    tmpl = await execute_one_or_none(select(CourseTemplate).where(CourseTemplate.id == payload.template_id))
    if not tmpl:
        raise AppException("Template not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = delete(CourseTemplate).where(CourseTemplate.id == tmpl.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Template deleted successfully")


@router.patch("/update-sitting")
async def update_sitting(
    payload: SittingUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    sitting = await execute_one_or_none(select(CourseSitting).where(CourseSitting.id == payload.sitting_id))
    if not sitting:
        raise AppException("Sitting not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.notes is not None:
        vals["notes"] = payload.notes
    if payload.status is not None:
        vals["status"] = payload.status

    if vals:
        async with transaction() as session:
            stmt = update(CourseSitting).where(CourseSitting.id == sitting.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Sitting updated successfully")


@router.post("/cancel-sitting")
async def cancel_sitting(
    payload: SittingActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    sitting = await execute_one_or_none(select(CourseSitting).where(CourseSitting.id == payload.sitting_id))
    if not sitting:
        raise AppException("Sitting not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(CourseSitting).where(CourseSitting.id == sitting.id).values(status="cancelled")
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "status": "cancelled"}, message="Sitting cancelled successfully")


@router.post("/start-sitting")
async def start_sitting(
    payload: SittingActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    sitting = await execute_one_or_none(select(CourseSitting).where(CourseSitting.id == payload.sitting_id))
    if not sitting:
        raise AppException("Sitting not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(CourseSitting).where(CourseSitting.id == sitting.id).values(status="in_progress")
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "status": "in_progress"}, message="Sitting started successfully")


@router.delete("/delete-course")
async def delete_course(
    payload: CourseActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    c = await execute_one_or_none(select(TreatmentCourse).where(TreatmentCourse.id == payload.course_id))
    if not c:
        raise AppException("Treatment course not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(TreatmentCourse).where(TreatmentCourse.id == c.id).values(status="deleted")
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Treatment course deleted successfully")


@router.post("/close-course")
async def close_course(
    payload: CourseActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    c = await execute_one_or_none(select(TreatmentCourse).where(TreatmentCourse.id == payload.course_id))
    if not c:
        raise AppException("Treatment course not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(TreatmentCourse).where(TreatmentCourse.id == c.id).values(status="completed")
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "status": "completed"}, message="Treatment course closed successfully")


@router.post("/schedule-sitting")
async def schedule_sitting(
    payload: ScheduleSittingPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    c = await execute_one_or_none(select(TreatmentCourse).where(TreatmentCourse.id == payload.course_id))
    if not c:
        raise AppException("Treatment course not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        sitting = CourseSitting(
            course_id=c.id,
            sitting_number=c.completed_sittings + 1,
            scheduled_at=payload.scheduled_at or datetime.now(timezone.utc),
            status="scheduled",
            notes=payload.notes,
        )
        saved = await save_entity(sitting, session=session)

    return api_response(
        data={"sitting": {"id": saved.id, "sitting_number": saved.sitting_number}},
        message="Sitting scheduled successfully",
        status_code=201,
    )


@router.get("/queue")
async def get_treatment_queue(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(CourseSitting, TreatmentCourse, Patient)
        .join(TreatmentCourse, TreatmentCourse.id == CourseSitting.course_id)
        .join(Patient, Patient.id == TreatmentCourse.patient_id)
        .where(
            TreatmentCourse.branch_id == context.branch_id,
            CourseSitting.status.in_(["scheduled", "in_progress"]),
        )
        .order_by(CourseSitting.scheduled_at)
    )
    rows = await execute_all(stmt)
    queue = []
    for s, c, p in rows:
        queue.append({
            "sitting_id": s.id,
            "course_name": c.name,
            "patient_name": p.name,
            "uhid": p.uhid,
            "sitting_number": s.sitting_number,
            "status": s.status,
            "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
        })
    return api_response(data={"queue": queue}, message="Treatment queue retrieved successfully")


@router.post("/administer")
async def administer_dose(
    payload: DoseAdministerPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    dose = await execute_one_or_none(select(TreatmentDose).where(TreatmentDose.id == payload.dose_id))
    if not dose:
        raise AppException("Dose not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = (
            update(TreatmentDose)
            .where(TreatmentDose.id == dose.id)
            .values(administered_by=context.user.id, administered_at=datetime.now(timezone.utc), notes=payload.notes)
        )
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Dose administered successfully")


@router.post("/undo-administer")
async def undo_administer_dose(
    payload: DoseAdministerPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    dose = await execute_one_or_none(select(TreatmentDose).where(TreatmentDose.id == payload.dose_id))
    if not dose:
        raise AppException("Dose not found", code=ErrorCode.NOT_FOUND, status_code=404)

    return api_response(data={"ok": True}, message="Administration undone successfully")


@router.get("/due-treatments")
async def get_due_treatments(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return await get_treatment_queue(context)


@router.get("/get-course")
async def get_course(
    course_id: int = Query(..., alias="courseId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    c = await execute_one_or_none(
        select(TreatmentCourse).where(TreatmentCourse.id == course_id, TreatmentCourse.branch_id == context.branch_id)
    )
    if not c:
        raise AppException("Course not found", code=ErrorCode.NOT_FOUND, status_code=404)

    sittings = await execute_all(select(CourseSitting).where(CourseSitting.course_id == c.id).order_by(CourseSitting.sitting_number))
    return api_response(
        data={
            "course": {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "total_sittings": c.total_sittings,
                "completed_sittings": c.completed_sittings,
                "notes": c.notes,
                "sittings": [{"id": s.id, "sitting_number": s.sitting_number, "status": s.status} for s in sittings],
            }
        },
        message="Course retrieved successfully",
    )
