"""Pharmacy Formulary, Inventory, FEFO Allocation, and Sales Router."""

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select, update
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, execute_scalar, save_entity, transaction
from src.models.public.clinical import OpVisit, Patient
from src.models.public.pharmacy import InventoryBatch, Medicine, PharmacySale, PharmacySaleLine
from src.schemas.common import api_response

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy & Inventory"])


# Request Schemas
class MedicineCreatePayload(BaseModel):
    name: str
    form: str = "tablet"
    strength: Optional[str] = None
    price_paise: int = Field(0, alias="pricePaise")
    reorder_level: int = Field(10, alias="reorderLevel")
    branch_id: Optional[int] = Field(None, alias="branchId")


class MedicineUpdatePayload(BaseModel):
    medicine_id: int = Field(..., alias="medicineId")
    name: Optional[str] = None
    form: Optional[str] = None
    strength: Optional[str] = None
    price_paise: Optional[int] = Field(None, alias="pricePaise")
    reorder_level: Optional[int] = Field(None, alias="reorderLevel")
    branch_id: Optional[int] = Field(None, alias="branchId")


class MedicineDeletePayload(BaseModel):
    medicine_id: int = Field(..., alias="medicineId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class BatchCreatePayload(BaseModel):
    medicine_id: int = Field(..., alias="medicineId")
    batch_no: str = Field(..., alias="batchNo")
    expiry_date: date = Field(..., alias="expiryDate")
    quantity: int
    unit_cost_paise: int = Field(0, alias="unitCostPaise")
    mrp_paise: int = Field(0, alias="mrpPaise")
    branch_id: Optional[int] = Field(None, alias="branchId")


class DispensePayload(BaseModel):
    visit_id: Optional[int] = Field(None, alias="visitId")
    patient_id: Optional[int] = Field(None, alias="patientId")
    items: List[Dict[str, Any]] = []
    payment_mode: str = Field("cash", alias="paymentMode")
    branch_id: Optional[int] = Field(None, alias="branchId")


class SaleCreatePayload(BaseModel):
    patient_id: Optional[int] = Field(None, alias="patientId")
    visit_id: Optional[int] = Field(None, alias="visitId")
    items: List[Dict[str, Any]] = []
    payment_mode: str = Field("cash", alias="paymentMode")
    branch_id: Optional[int] = Field(None, alias="branchId")


# Endpoints
@router.get("/inventory-valuation")
async def get_inventory_valuation(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(
            func.coalesce(func.sum(InventoryBatch.quantity * InventoryBatch.unit_cost_paise), 0).label("cost_val"),
            func.coalesce(func.sum(InventoryBatch.quantity * InventoryBatch.mrp_paise), 0).label("retail_val"),
            func.coalesce(func.sum(InventoryBatch.quantity), 0).label("total_units"),
        )
        .where(InventoryBatch.inventory_id == context.inventory_id)
    )
    res = await execute_one_or_none(stmt)
    cost_val = getattr(res, "cost_val", 0) if res else 0
    retail_val = getattr(res, "retail_val", 0) if res else 0
    total_units = getattr(res, "total_units", 0) if res else 0

    return api_response(
        data={
            "valuation": {
                "total_cost_paise": cost_val,
                "total_retail_paise": retail_val,
                "total_units": total_units,
            }
        },
        message="Inventory valuation calculated successfully",
    )


@router.get("/list-medicines")
async def list_medicines(
    q: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(Medicine).where(
        Medicine.branch_id == context.branch_id,
        Medicine.deleted_at.is_(None),
    )
    if q:
        stmt = stmt.where(func.lower(Medicine.name).like(f"%{q.strip().lower()}%"))

    stmt = stmt.order_by(Medicine.name).limit(limit).offset(offset)
    meds = await execute_all(stmt)

    return api_response(
        data={"medicines": [{
            "id": m.id,
            "name": m.name,
            "form": m.form,
            "strength": m.strength,
            "price_paise": m.price_paise,
            "reorder_level": m.reorder_level,
        } for m in meds]},
        message="Medicines retrieved successfully",
    )


@router.post("/create-medicine")
async def create_medicine(
    payload: MedicineCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    async with transaction() as session:
        med = Medicine(
            company_id=context.company_id,
            branch_id=branch_id,
            name=payload.name.strip(),
            form=payload.form.lower(),
            strength=payload.strength,
            price_paise=payload.price_paise,
            reorder_level=payload.reorder_level,
        )
        saved = await save_entity(med, session=session)

    return api_response(
        data={"medicine": {"id": saved.id, "name": saved.name}},
        message="Medicine created successfully",
        status_code=201,
    )


@router.patch("/update-medicine")
async def update_medicine(
    payload: MedicineUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    med = await execute_one_or_none(select(Medicine).where(Medicine.id == payload.medicine_id, Medicine.branch_id == branch_id))
    if not med:
        raise AppException("Medicine not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.name:
        vals["name"] = payload.name.strip()
    if payload.form:
        vals["form"] = payload.form.lower()
    if payload.strength is not None:
        vals["strength"] = payload.strength
    if payload.price_paise is not None:
        vals["price_paise"] = payload.price_paise
    if payload.reorder_level is not None:
        vals["reorder_level"] = payload.reorder_level

    if vals:
        async with transaction() as session:
            stmt = update(Medicine).where(Medicine.id == med.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Medicine updated successfully")


@router.delete("/delete-medicine")
async def delete_medicine(
    payload: MedicineDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    med = await execute_one_or_none(select(Medicine).where(Medicine.id == payload.medicine_id, Medicine.branch_id == branch_id))
    if not med:
        raise AppException("Medicine not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = update(Medicine).where(Medicine.id == med.id).values(deleted_at=datetime.now(timezone.utc))
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Medicine deleted successfully")


@router.post("/create-batch")
async def create_batch(
    payload: BatchCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    async with transaction() as session:
        batch = InventoryBatch(
            company_id=context.company_id,
            inventory_id=context.inventory_id,
            medicine_id=payload.medicine_id,
            batch_no=payload.batch_no.strip(),
            expiry_date=payload.expiry_date,
            quantity=payload.quantity,
            received_qty=payload.quantity,
            unit_cost_paise=payload.unit_cost_paise,
            mrp_paise=payload.mrp_paise,
        )
        saved = await save_entity(batch, session=session)

    return api_response(
        data={"batch": {"id": saved.id, "batch_no": saved.batch_no, "quantity": saved.quantity}},
        message="Stock batch created successfully",
        status_code=201,
    )


@router.get("/list-batches")
async def list_batches(
    medicine_id: Optional[int] = Query(None, alias="medicineId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(InventoryBatch).where(InventoryBatch.inventory_id == context.inventory_id)
    if medicine_id:
        stmt = stmt.where(InventoryBatch.medicine_id == medicine_id)
    stmt = stmt.order_by(InventoryBatch.expiry_date)
    batches = await execute_all(stmt)

    return api_response(
        data={"batches": [{
            "id": b.id,
            "medicine_id": b.medicine_id,
            "batch_no": b.batch_no,
            "expiry_date": b.expiry_date.isoformat(),
            "quantity": b.quantity,
            "mrp_paise": b.mrp_paise,
        } for b in batches]},
        message="Stock batches retrieved successfully",
    )


@router.post("/dispense")
async def dispense_prescriptions(
    payload: DispensePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    # Atomically allocate FEFO batches and create sale
    total_paise = sum(item.get("price_paise", 0) * item.get("quantity", 1) for item in payload.items)
    sale_no = f"SAL-{context.code_prefix}-{int(datetime.now(timezone.utc).timestamp())}"

    async with transaction() as session:
        sale = PharmacySale(
            company_id=context.company_id,
            branch_id=context.branch_id,
            inventory_id=context.inventory_id,
            sale_no=sale_no,
            visit_id=payload.visit_id,
            patient_id=payload.patient_id,
            total_paise=total_paise,
            payment_mode=payload.payment_mode,
            is_direct_otc=False,
            created_by=context.user.id,
        )
        saved_sale = await save_entity(sale, session=session)

        # Deduct stock FEFO
        for item in payload.items:
            med_id = item.get("medicine_id")
            qty = item.get("quantity", 1)
            price = item.get("price_paise", 0)
            if med_id:
                batch_stmt = (
                    select(InventoryBatch)
                    .where(
                        InventoryBatch.inventory_id == context.inventory_id,
                        InventoryBatch.medicine_id == med_id,
                        InventoryBatch.quantity > 0,
                    )
                    .order_by(InventoryBatch.expiry_date)
                    .limit(1)
                )
                b = await execute_one_or_none(batch_stmt, session=session)
                batch_id = b.id if b else 1
                if b:
                    deduct = min(b.quantity, qty)
                    up_batch = update(InventoryBatch).where(InventoryBatch.id == b.id).values(quantity=b.quantity - deduct)
                    await execute_dml(up_batch, session=session)

                line = PharmacySaleLine(
                    sale_id=saved_sale.id,
                    medicine_id=med_id,
                    batch_id=batch_id,
                    quantity=qty,
                    unit_price_paise=price,
                    total_paise=price * qty,
                )
                await save_entity(line, session=session)

    return api_response(
        data={"sale": {"id": saved_sale.id, "sale_no": saved_sale.sale_no, "total_paise": total_paise}},
        message="Medicines dispensed successfully",
        status_code=201,
    )


@router.get("/queue")
async def get_pharmacy_queue(
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
            "status": v.status,
        } for v, p in rows]},
        message="Pharmacy queue retrieved successfully",
    )


@router.get("/list-sales")
async def list_sales(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(PharmacySale).where(PharmacySale.branch_id == context.branch_id).order_by(desc(PharmacySale.id)).limit(limit).offset(offset)
    sales = await execute_all(stmt)
    return api_response(
        data={"sales": [{
            "id": s.id,
            "sale_no": s.sale_no,
            "total_paise": s.total_paise,
            "payment_mode": s.payment_mode,
            "created_at": s.created_at.isoformat() if hasattr(s, "created_at") and s.created_at else None,
        } for s in sales]},
        message="Pharmacy sales retrieved successfully",
    )


@router.post("/create-sale")
async def create_direct_sale(
    payload: SaleCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    dispense_payload = DispensePayload(
        visit_id=payload.visit_id,
        patient_id=payload.patient_id,
        items=payload.items,
        payment_mode=payload.payment_mode,
        branch_id=payload.branch_id,
    )
    return await dispense_prescriptions(dispense_payload, context)


@router.get("/get-sale")
async def get_sale(
    sale_id: int = Query(..., alias="saleId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    sale = await execute_one_or_none(select(PharmacySale).where(PharmacySale.id == sale_id, PharmacySale.branch_id == context.branch_id))
    if not sale:
        raise AppException("Sale invoice not found", code=ErrorCode.NOT_FOUND, status_code=404)

    lines = await execute_all(select(PharmacySaleLine).where(PharmacySaleLine.sale_id == sale.id))
    return api_response(
        data={
            "sale": {
                "id": sale.id,
                "sale_no": sale.sale_no,
                "total_paise": sale.total_paise,
                "lines": [{"id": l.id, "medicine_id": l.medicine_id, "quantity": l.quantity, "total_paise": l.total_paise} for l in lines],
            }
        },
        message="Sale retrieved successfully",
    )


@router.get("/stock-report")
async def get_stock_report(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(InventoryBatch, Medicine)
        .join(Medicine, Medicine.id == InventoryBatch.medicine_id)
        .where(InventoryBatch.inventory_id == context.inventory_id)
        .order_by(InventoryBatch.expiry_date)
    )
    rows = await execute_all(stmt)
    report = []
    for b, m in rows:
        report.append({
            "medicine_name": m.name,
            "batch_no": b.batch_no,
            "expiry_date": b.expiry_date.isoformat(),
            "quantity": b.quantity,
            "mrp_paise": b.mrp_paise,
            "unit_cost_paise": b.unit_cost_paise,
        })
    return api_response(data={"stock": report}, message="Stock report generated successfully")
