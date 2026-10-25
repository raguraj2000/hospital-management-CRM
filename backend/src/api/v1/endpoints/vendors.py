"""Pharmaceutical and Consumables Vendors Router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, select, update
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, save_entity, transaction
from src.models.public.financial import Vendor
from src.schemas.common import api_response

router = APIRouter(prefix="/vendors", tags=["Vendors"])


# Request Schemas
class VendorCreatePayload(BaseModel):
    name: str
    gstin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    state_code: Optional[str] = Field(None, alias="stateCode")
    address: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class VendorUpdatePayload(BaseModel):
    vendor_id: int = Field(..., alias="vendorId")
    name: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    state_code: Optional[str] = Field(None, alias="stateCode")
    address: Optional[str] = None
    branch_id: Optional[int] = Field(None, alias="branchId")


class VendorDeletePayload(BaseModel):
    vendor_id: int = Field(..., alias="vendorId")
    branch_id: Optional[int] = Field(None, alias="branchId")


# Endpoints
@router.get("/list")
async def list_vendors(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(Vendor)
        .where(Vendor.branch_id == context.branch_id)
        .order_by(Vendor.name)
        .limit(limit)
        .offset(offset)
    )
    vendors = await execute_all(stmt)
    return api_response(
        data={"vendors": [{
            "id": v.id,
            "name": v.name,
            "gstin": v.gstin,
            "phone": v.phone,
            "email": v.email,
            "address": v.address,
        } for v in vendors]},
        message="Vendors retrieved successfully",
    )


@router.post("/create")
async def create_vendor(
    payload: VendorCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    async with transaction() as session:
        v = Vendor(
            company_id=context.company_id,
            branch_id=branch_id,
            name=payload.name.strip(),
            gstin=payload.gstin.strip().upper() if payload.gstin else None,
            phone=payload.phone,
            email=payload.email,
            state_code=payload.state_code,
            address=payload.address,
        )
        saved = await save_entity(v, session=session)

    return api_response(
        data={"vendor": {"id": saved.id, "name": saved.name}},
        message="Vendor registered successfully",
        status_code=201,
    )


@router.delete("/delete")
async def delete_vendor(
    payload: VendorDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(Vendor).where(Vendor.id == payload.vendor_id, Vendor.branch_id == branch_id))
    if not v:
        raise AppException("Vendor not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = delete(Vendor).where(Vendor.id == v.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Vendor deleted successfully")


@router.patch("/update")
async def update_vendor(
    payload: VendorUpdatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    v = await execute_one_or_none(select(Vendor).where(Vendor.id == payload.vendor_id, Vendor.branch_id == branch_id))
    if not v:
        raise AppException("Vendor not found", code=ErrorCode.NOT_FOUND, status_code=404)

    vals: Dict[str, Any] = {}
    if payload.name:
        vals["name"] = payload.name.strip()
    if payload.gstin is not None:
        vals["gstin"] = payload.gstin.strip().upper()
    if payload.phone is not None:
        vals["phone"] = payload.phone
    if payload.email is not None:
        vals["email"] = payload.email
    if payload.address is not None:
        vals["address"] = payload.address

    if vals:
        async with transaction() as session:
            stmt = update(Vendor).where(Vendor.id == v.id).values(**vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Vendor updated successfully")
