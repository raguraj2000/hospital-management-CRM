"""Diagnostic Laboratory and Pathology Router."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, select, update
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, save_entity, transaction
from src.models.public.clinical import OpVisit, Patient
from src.models.public.diagnostic_lab import (
    LabOrder,
    LabPackage,
    LabRelease,
    LabResult,
    LabTest,
    LabTestParameter,
)
from src.schemas.common import api_response

router = APIRouter(prefix="/lab", tags=["Diagnostic Laboratory & Pathology"])


# Request Schemas
class OrderUpdatePayload(BaseModel):
    order_id: int = Field(..., alias="orderId")
    status: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class SaveResultsPayload(BaseModel):
    order_id: int = Field(..., alias="orderId")
    results: List[Dict[str, Any]] = []
    branch_id: Optional[int] = Field(None, alias="branchId")


class LabPackageCreatePayload(BaseModel):
    name: str
    code: str
    price_paise: int = Field(0, alias="pricePaise")
    test_ids: List[int] = Field([], alias="testIds")
    branch_id: Optional[int] = Field(None, alias="branchId")


class LabPackageUpdatePayload(BaseModel):
    package_id: int = Field(..., alias="packageId")
    name: Optional[str] = None
    price_paise: Optional[int] = Field(None, alias="pricePaise")
    branch_id: Optional[int] = Field(None, alias="branchId")


class LabPackageDeletePayload(BaseModel):
    package_id: int = Field(..., alias="packageId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class LabTestCreatePayload(BaseModel):
    name: str
    code: str
    category: str = "Biochemistry"
    price_paise: int = Field(0, alias="pricePaise")
    parameters: List[Dict[str, Any]] = []
    branch_id: Optional[int] = Field(None, alias="branchId")


class LabTestUpdatePayload(BaseModel):
    test_id: int = Field(..., alias="testId")
    name: Optional[str] = None
    price_paise: Optional[int] = Field(None, alias="pricePaise")
    category: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class LabTestDeletePayload(BaseModel):
    test_id: int = Field(..., alias="testId")
    branch_id: Optional[int] = Field(None, alias="branchId")


class OrderTestsPayload(BaseModel):
    patient_id: int = Field(..., alias="patientId")
    doctor_id: Optional[int] = Field(None, alias="doctorId")
    test_ids: List[int] = Field([], alias="testIds")
    notes: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class BackToDoctorPayload(BaseModel):
    visit_id: int = Field(..., alias="visitId")
    notes: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


# Endpoints
@router.get("/list-orders")
async def list_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(LabOrder, Patient)
        .join(Patient, Patient.id == LabOrder.patient_id)
        .where(LabOrder.branch_id == context.branch_id)
    )
    if status:
        stmt = stmt.where(LabOrder.status == status)

    stmt = stmt.order_by(desc(LabOrder.id)).limit(limit).offset(offset)
    rows = await execute_all(stmt)

    orders = []
    for o, p in rows:
        orders.append({
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "patient_name": p.name,
            "uhid": p.uhid,
            "notes": o.notes,
            "created_at": o.created_at.isoformat() if hasattr(o, "created_at") and o.created_at else None,
        })

    return api_response(data={"orders": orders}, message="Lab orders retrieved successfully")


@router.patch("/update-order")
async def update_order(
    payload: OrderUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    order = await execute_one_or_none(select(LabOrder).where(LabOrder.id == payload.order_id, LabOrder.branch_id == branch_id))
    if not order:
        raise AppException("Lab order not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.status:
        vals["status"] = payload.status
    if payload.notes is not None:
        vals["notes"] = payload.notes

    if vals:
        async with transaction() as session:
            stmt = update(LabOrder).where(LabOrder.id == order.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Lab order updated successfully")


@router.put("/save-results")
async def save_results(
    payload: SaveResultsPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    order = await execute_one_or_none(select(LabOrder).where(LabOrder.id == payload.order_id, LabOrder.branch_id == branch_id))
    if not order:
        raise AppException("Lab order not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        for r in payload.results:
            result = LabResult(
                lab_order_id=order.id,
                test_id=r.get("test_id", 1),
                parameter_name=r.get("parameter_name", "Result"),
                finding=str(r.get("finding", "")),
                is_abnormal=bool(r.get("is_abnormal", False)),
                notes=r.get("notes"),
            )
            await save_entity(result, session=session)

        # Update order status to completed
        up_order = update(LabOrder).where(LabOrder.id == order.id).values(status="completed")
        await execute_dml(up_order, session=session)

    return api_response(data={"ok": True}, message="Lab results saved successfully")


@router.get("/list-packages")
async def list_packages(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(LabPackage).where(LabPackage.company_id == context.company_id)
    pkgs = await execute_all(stmt)
    return api_response(
        data={"packages": [{
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "price_paise": p.price_paise,
        } for p in pkgs]},
        message="Lab packages retrieved successfully",
    )


@router.post("/create-package")
async def create_package(
    payload: LabPackageCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    async with transaction() as session:
        pkg = LabPackage(
            company_id=context.company_id,
            name=payload.name.strip(),
            code=payload.code.strip().upper(),
            price_paise=payload.price_paise,
            is_active=True,
        )
        saved = await save_entity(pkg, session=session)

    return api_response(
        data={"package": {"id": saved.id, "name": saved.name}},
        message="Lab package created successfully",
        status_code=201,
    )


@router.delete("/delete-package")
async def delete_package(
    payload: LabPackageDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    pkg = await execute_one_or_none(select(LabPackage).where(LabPackage.id == payload.package_id))
    if not pkg:
        raise AppException("Lab package not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = delete(LabPackage).where(LabPackage.id == pkg.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Lab package deleted successfully")


@router.put("/update-package")
async def update_package(
    payload: LabPackageUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    pkg = await execute_one_or_none(select(LabPackage).where(LabPackage.id == payload.package_id))
    if not pkg:
        raise AppException("Lab package not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.name:
        vals["name"] = payload.name.strip()
    if payload.price_paise is not None:
        vals["price_paise"] = payload.price_paise

    if vals:
        async with transaction() as session:
            stmt = update(LabPackage).where(LabPackage.id == pkg.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Lab package updated successfully")


@router.get("/report")
async def get_lab_period_report(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(LabOrder)
        .where(LabOrder.branch_id == context.branch_id)
        .order_by(desc(LabOrder.id))
        .limit(100)
    )
    orders = await execute_all(stmt)
    return api_response(
        data={"orders_count": len(orders), "completed_count": sum(1 for o in orders if o.status == "completed")},
        message="Lab period report generated successfully",
    )


@router.get("/list-tests")
async def list_tests(
    q: Optional[str] = Query(None),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = select(LabTest).where(LabTest.company_id == context.company_id)
    if q:
        stmt = stmt.where(func.lower(LabTest.name).like(f"%{q.strip().lower()}%"))

    tests = await execute_all(stmt)
    return api_response(
        data={"tests": [{
            "id": t.id,
            "code": t.code,
            "name": t.name,
            "category": t.category,
            "price_paise": t.price_paise,
        } for t in tests]},
        message="Lab tests retrieved successfully",
    )


@router.post("/create-test")
async def create_test(
    payload: LabTestCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    async with transaction() as session:
        t = LabTest(
            company_id=context.company_id,
            code=payload.code.strip().upper(),
            name=payload.name.strip(),
            category=payload.category,
            price_paise=payload.price_paise,
            is_active=True,
        )
        saved = await save_entity(t, session=session)

        for p in payload.parameters:
            param = LabTestParameter(
                test_id=saved.id,
                name=p.get("name", "Value"),
                unit=p.get("unit"),
                reference_range=p.get("reference_range"),
                is_active=True,
            )
            await save_entity(param, session=session)

    return api_response(
        data={"test": {"id": saved.id, "name": saved.name}},
        message="Lab test created successfully",
        status_code=201,
    )


@router.delete("/delete-test")
async def delete_test(
    payload: LabTestDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    test = await execute_one_or_none(select(LabTest).where(LabTest.id == payload.test_id))
    if not test:
        raise AppException("Lab test not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = delete(LabTest).where(LabTest.id == test.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Lab test deleted successfully")


@router.get("/get-test")
async def get_test(
    test_id: int = Query(..., alias="testId"),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    test = await execute_one_or_none(select(LabTest).where(LabTest.id == test_id))
    if not test:
        raise AppException("Lab test not found", code=ErrorCode.NOT_FOUND, status_code=404)

    params = await execute_all(select(LabTestParameter).where(LabTestParameter.test_id == test.id))
    return api_response(
        data={
            "test": {
                "id": test.id,
                "code": test.code,
                "name": test.name,
                "category": test.category,
                "price_paise": test.price_paise,
                "parameters": [{"id": p.id, "name": p.name, "unit": p.unit, "reference_range": p.reference_range} for p in params],
            }
        },
        message="Lab test retrieved successfully",
    )


@router.patch("/update-test")
async def update_test(
    payload: LabTestUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    test = await execute_one_or_none(select(LabTest).where(LabTest.id == payload.test_id))
    if not test:
        raise AppException("Lab test not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.name:
        vals["name"] = payload.name.strip()
    if payload.price_paise is not None:
        vals["price_paise"] = payload.price_paise
    if payload.category:
        vals["category"] = payload.category

    if vals:
        async with transaction() as session:
            stmt = update(LabTest).where(LabTest.id == test.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Lab test updated successfully")


@router.post("/load-standard-tests")
async def load_standard_tests(
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    standards = [
        ("CBC", "Complete Blood Count", "Hematology", 35000),
        ("FBS", "Fasting Blood Sugar", "Biochemistry", 8000),
        ("PPBS", "Post Prandial Blood Sugar", "Biochemistry", 8000),
        ("LIPID", "Lipid Profile", "Biochemistry", 55000),
        ("LFT", "Liver Function Test", "Biochemistry", 60000),
        ("KFT", "Kidney Function Test", "Biochemistry", 50000),
        ("URINE_RE", "Urine Routine & Microscopy", "Clinical Pathology", 15000),
    ]

    async with transaction() as session:
        for code, name, cat, price in standards:
            existing = await execute_one_or_none(
                select(LabTest).where(LabTest.company_id == context.company_id, LabTest.code == code)
            )
            if not existing:
                t = LabTest(company_id=context.company_id, code=code, name=name, category=cat, price_paise=price, is_active=True)
                await save_entity(t, session=session)

    return api_response(data={"ok": True, "count": len(standards)}, message="Standard tests loaded successfully")


@router.put("/order-tests")
async def order_tests(
    payload: OrderTestsPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    order_number = f"LAB-{context.code_prefix}-{int(datetime.now(timezone.utc).timestamp())}"
    async with transaction() as session:
        lo = LabOrder(
            company_id=context.company_id,
            branch_id=branch_id,
            patient_id=payload.patient_id,
            doctor_id=payload.doctor_id,
            order_number=order_number,
            status="ordered",
            notes=payload.notes,
        )
        saved = await save_entity(lo, session=session)

    return api_response(
        data={"order": {"id": saved.id, "order_number": order_number}},
        message="Tests ordered successfully",
        status_code=201,
    )


@router.post("/back-to-doctor")
async def back_to_doctor(
    payload: BackToDoctorPayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    async with transaction() as session:
        stmt = update(OpVisit).where(OpVisit.id == payload.visit_id).values(status="in_consultation")
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Patient returned to doctor consultation successfully")
