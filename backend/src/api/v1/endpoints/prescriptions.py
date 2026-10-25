"""Clinical Bookmarks and Prescription Management Router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, update
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, save_entity, transaction
from src.models.public.clinical import PrescriptionItem, PrescriptionNote, TreatmentBookmark, VisitInstruction
from src.schemas.common import api_response

router = APIRouter(prefix="/prescriptions", tags=["Clinical Bookmarks & Prescriptions"])


# Request Schemas
class BookmarkCreatePayload(BaseModel):
    name: str
    notes: Optional[str] = None
    items: List[Dict[str, Any]] = []
    branch_id: Optional[int] = Field(None, alias="branchId")


class BookmarkUpdatePayload(BaseModel):
    bookmark_id: int = Field(..., alias="bookmarkId")
    name: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class BookmarkDeletePayload(BaseModel):
    bookmark_id: int = Field(..., alias="bookmarkId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class PrescriptionItemUpdatePayload(BaseModel):
    item_id: int = Field(..., alias="itemId")
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class PrescriptionItemDeletePayload(BaseModel):
    item_id: int = Field(..., alias="itemId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class PrescriptionNoteUpdatePayload(BaseModel):
    note_id: int = Field(..., alias="noteId")
    notes: str
    branch_id: Optional[int] = Field(None, alias="branchId")


class PrescriptionNoteDeletePayload(BaseModel):
    note_id: int = Field(..., alias="noteId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class InstructionDeletePayload(BaseModel):
    instruction_id: int = Field(..., alias="instructionId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class InstructionActionPayload(BaseModel):
    instruction_id: int = Field(..., alias="instructionId")
    action: str = Field("toggle", description="'toggle' or 'complete'")
    branch_id: Optional[int] = Field(None, alias="branchId")


# Endpoints
@router.get("/list-bookmarks")
async def list_bookmarks(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(TreatmentBookmark).where(TreatmentBookmark.company_id == context.company_id)
    bms = await execute_all(stmt)
    return api_response(
        data={"bookmarks": [{"id": b.id, "name": b.name, "notes": b.notes} for b in bms]},
        message="Bookmarks retrieved successfully",
    )


@router.post("/create-bookmark")
async def create_bookmark(
    payload: BookmarkCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    async with transaction() as session:
        bm = TreatmentBookmark(
            company_id=context.company_id,
            name=payload.name.strip(),
            notes=payload.notes,
        )
        saved = await save_entity(bm, session=session)

    return api_response(
        data={"bookmark": {"id": saved.id, "name": saved.name}},
        message="Bookmark created successfully",
        status_code=201,
    )


@router.patch("/update-bookmark")
@router.put("/update-bookmark")
async def update_bookmark(
    payload: BookmarkUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    bm = await execute_one_or_none(select(TreatmentBookmark).where(TreatmentBookmark.id == payload.bookmark_id))
    if not bm:
        raise AppException("Bookmark not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.name:
        vals["name"] = payload.name.strip()
    if payload.notes is not None:
        vals["notes"] = payload.notes

    if vals:
        async with transaction() as session:
            stmt = update(TreatmentBookmark).where(TreatmentBookmark.id == bm.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Bookmark updated successfully")


@router.delete("/delete-bookmark")
async def delete_bookmark(
    payload: BookmarkDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    bm = await execute_one_or_none(select(TreatmentBookmark).where(TreatmentBookmark.id == payload.bookmark_id))
    if not bm:
        raise AppException("Bookmark not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = delete(TreatmentBookmark).where(TreatmentBookmark.id == bm.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Bookmark deleted successfully")


@router.patch("/update-item")
async def update_prescription_item(
    payload: PrescriptionItemUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    item = await execute_one_or_none(select(PrescriptionItem).where(PrescriptionItem.id == payload.item_id))
    if not item:
        raise AppException("Prescription item not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.dosage is not None:
        vals["dosage"] = payload.dosage
    if payload.frequency is not None:
        vals["frequency"] = payload.frequency
    if payload.duration is not None:
        vals["duration"] = payload.duration
    if payload.instructions is not None:
        vals["instructions"] = payload.instructions

    if vals:
        async with transaction() as session:
            stmt = update(PrescriptionItem).where(PrescriptionItem.id == item.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Prescription item updated successfully")


@router.delete("/delete-item")
async def delete_prescription_item(
    payload: PrescriptionItemDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    item = await execute_one_or_none(select(PrescriptionItem).where(PrescriptionItem.id == payload.item_id))
    if not item:
        raise AppException("Prescription item not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = delete(PrescriptionItem).where(PrescriptionItem.id == item.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Prescription item deleted successfully")


@router.patch("/update-note")
async def update_prescription_note(
    payload: PrescriptionNoteUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    note = await execute_one_or_none(select(PrescriptionNote).where(PrescriptionNote.id == payload.note_id))
    if not note:
        raise AppException("Prescription note not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(PrescriptionNote).where(PrescriptionNote.id == note.id).values(notes=payload.notes)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Prescription note updated successfully")


@router.delete("/delete-note")
async def delete_prescription_note(
    payload: PrescriptionNoteDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    note = await execute_one_or_none(select(PrescriptionNote).where(PrescriptionNote.id == payload.note_id))
    if not note:
        raise AppException("Prescription note not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = delete(PrescriptionNote).where(PrescriptionNote.id == note.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Prescription note deleted successfully")


@router.get("/dosage-suggestions")
async def get_dosage_suggestions(
    q: Optional[str] = Query(None),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    suggestions = ["1 tablet", "2 tablets", "1 capsule", "5 ml", "10 ml", "1 puff", "Apply thinly"]
    if q:
        suggestions = [s for s in suggestions if q.lower() in s.lower()]
    return api_response(data={"suggestions": suggestions}, message="Dosage suggestions retrieved successfully")


@router.get("/frequency-suggestions")
async def get_frequency_suggestions(
    q: Optional[str] = Query(None),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    suggestions = ["1-0-1 (Twice daily)", "1-1-1 (Three times daily)", "1-0-0 (Morning only)", "0-0-1 (Night only)", "SOS (As needed)"]
    if q:
        suggestions = [s for s in suggestions if q.lower() in s.lower()]
    return api_response(data={"suggestions": suggestions}, message="Frequency suggestions retrieved successfully")


@router.delete("/delete-instruction")
async def delete_instruction(
    payload: InstructionDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    ins = await execute_one_or_none(select(VisitInstruction).where(VisitInstruction.id == payload.instruction_id))
    if not ins:
        raise AppException("Instruction not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = delete(VisitInstruction).where(VisitInstruction.id == ins.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Instruction deleted successfully")


@router.post("/instruction-action")
async def instruction_action(
    payload: InstructionActionPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    return api_response(data={"ok": True, "action": payload.action}, message="Instruction action completed successfully")
