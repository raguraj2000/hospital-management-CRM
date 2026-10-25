"""Platform Administration Router (Multi-Tenant SuperAdmin)."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, select, update
from src.api.dependencies import get_current_user
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.core.security import hash_password
from src.dal import execute_all, execute_dml, execute_one_or_none, execute_scalar, save_entity, transaction
from src.models.global_schema.organizations import Organization, PlatformPayment
from src.models.global_schema.users import OrganizationMembership, User
from src.models.public.hierarchy import Branch
from src.schemas.common import api_response

router = APIRouter(prefix="/platform", tags=["Platform Administration"])


def require_platform_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_platform_admin:
        raise AppException("Platform superadmin privileges required.", code=ErrorCode.FORBIDDEN, status_code=403)
    return user


class CustomerCreateRequest(BaseModel):
    name: str
    id_prefix: Optional[str] = Field(None, alias="idPrefix")
    branch_name: Optional[str] = Field("Main Branch", alias="branchName")
    branch_slug: Optional[str] = Field("main", alias="branchSlug")
    owner_name: str = Field(..., alias="ownerName")
    owner_mobile: str = Field(..., alias="ownerMobile")
    owner_password: str = Field(..., alias="ownerPassword")


class CustomerUpdateRequest(BaseModel):
    customer_id: int = Field(..., alias="customerId")
    name: Optional[str] = None
    plan_name: Optional[str] = Field(None, alias="planName")
    yearly_fee_paise: Optional[int] = Field(None, alias="yearlyFeePaise")
    grace_days: Optional[int] = Field(None, alias="graceDays")
    max_branches: Optional[int] = Field(None, alias="maxBranches")
    max_staff: Optional[int] = Field(None, alias="maxStaff")


class CustomerStatusRequest(BaseModel):
    customer_id: int = Field(..., alias="customerId")
    action: str = Field("activate", description="'activate' or 'suspend'")


class OwnerUpdateRequest(BaseModel):
    customer_id: int = Field(..., alias="customerId")
    user_id: int = Field(..., alias="userId")


class OwnerPasswordResetRequest(BaseModel):
    customer_id: int = Field(..., alias="customerId")
    password: str


class PlatformPaymentCreateRequest(BaseModel):
    customer_id: int = Field(..., alias="customerId")
    amount_paise: int = Field(..., alias="amountPaise")
    paid_on: Optional[str] = Field(None, alias="paidOn")
    gateway_ref: Optional[str] = Field(None, alias="gatewayRef")
    note: Optional[str] = None


@router.get("/list-customers")
async def list_customers(
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    stmt = select(Organization).order_by(Organization.id)
    orgs = await execute_all(stmt)

    customers = []
    for o in orgs:
        # Get owner
        owner_stmt = (
            select(User)
            .join(OrganizationMembership, OrganizationMembership.user_id == User.id)
            .where(
                OrganizationMembership.company_id == o.id,
                OrganizationMembership.is_owner == True,
            )
            .limit(1)
        )
        owner = await execute_one_or_none(owner_stmt)

        branch_count_stmt = select(Branch.id).where(Branch.company_id == o.id)
        branches = await execute_all(branch_count_stmt)

        customers.append({
            "id": o.id,
            "name": o.name,
            "slug": o.slug,
            "is_active": o.is_active,
            "billing_tier": o.billing_tier,
            "branches": len(branches),
            "owner_name": owner.name if owner else None,
            "owner_mobile": owner.mobile if owner else None,
            "created_at": o.created_at.isoformat() if hasattr(o, "created_at") and o.created_at else None,
        })

    return api_response(data={"customers": customers}, message="Customers retrieved successfully")


@router.post("/create-customer")
async def create_customer(
    payload: CustomerCreateRequest,
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    # Check if mobile taken
    user_stmt = select(User).where((User.mobile == payload.owner_mobile) | (User.username == payload.owner_mobile))
    taken = await execute_one_or_none(user_stmt)
    if taken:
        raise AppException("This mobile number already has an account", code=ErrorCode.CONFLICT, status_code=409)

    slug = (payload.id_prefix or payload.name).lower().replace(" ", "-")[:40]
    async with transaction() as session:
        org = Organization(
            name=payload.name.strip(),
            slug=slug,
            billing_tier="starter",
            is_active=True,
        )
        saved_org = await save_entity(org, session=session)

        pwd_hash = hash_password(payload.owner_password)
        owner_user = User(
            username=payload.owner_mobile.strip(),
            mobile=payload.owner_mobile.strip(),
            name=payload.owner_name.strip(),
            password_hash=pwd_hash,
            is_platform_admin=False,
            is_active=True,
        )
        saved_owner = await save_entity(owner_user, session=session)

        membership = OrganizationMembership(
            company_id=saved_org.id,
            user_id=saved_owner.id,
            is_owner=True,
            is_active=True,
        )
        await save_entity(membership, session=session)

        main_branch = Branch(
            company_id=saved_org.id,
            name=payload.branch_name or "Main Branch",
            slug=payload.branch_slug or "main",
            code_prefix=(payload.branch_slug or "MAIN").upper()[:6],
            is_active=True,
        )
        await save_entity(main_branch, session=session)

    return api_response(
        data={"customer_id": saved_org.id, "owner_id": saved_owner.id},
        message="Customer organization provisioned successfully",
        status_code=201,
    )


@router.patch("/update-customer")
async def update_customer(
    payload: CustomerUpdateRequest,
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    org = await execute_one_or_none(select(Organization).where(Organization.id == payload.customer_id))
    if not org:
        raise AppException("Customer not found", code=ErrorCode.NOT_FOUND, status_code=404)

    update_vals: Dict[str, Any] = {}
    if payload.name:
        update_vals["name"] = payload.name
    if payload.plan_name:
        update_vals["billing_tier"] = payload.plan_name

    if update_vals:
        async with transaction() as session:
            stmt = update(Organization).where(Organization.id == payload.customer_id).values(**update_vals)
            await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "customer_id": payload.customer_id}, message="Customer updated successfully")


@router.post("/toggle-customer-status")
async def toggle_customer_status(
    payload: CustomerStatusRequest,
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    org = await execute_one_or_none(select(Organization).where(Organization.id == payload.customer_id))
    if not org:
        raise AppException("Customer not found", code=ErrorCode.NOT_FOUND, status_code=404)

    is_active = (payload.action.lower() == "activate")
    async with transaction() as session:
        stmt = update(Organization).where(Organization.id == payload.customer_id).values(is_active=is_active)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True, "is_active": is_active}, message=f"Customer {'activated' if is_active else 'suspended'} successfully")


@router.get("/get-customer-owner")
async def get_customer_owner(
    customer_id: int = Query(..., alias="customerId"),
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    org = await execute_one_or_none(select(Organization).where(Organization.id == customer_id))
    if not org:
        raise AppException("Customer not found", code=ErrorCode.NOT_FOUND, status_code=404)

    owner_stmt = (
        select(User)
        .join(OrganizationMembership, OrganizationMembership.user_id == User.id)
        .where(OrganizationMembership.company_id == customer_id, OrganizationMembership.is_owner == True)
        .limit(1)
    )
    owner = await execute_one_or_none(owner_stmt)

    candidates_stmt = (
        select(User)
        .join(OrganizationMembership, OrganizationMembership.user_id == User.id)
        .where(OrganizationMembership.company_id == customer_id, OrganizationMembership.is_owner == False)
    )
    candidates = await execute_all(candidates_stmt)

    return api_response(
        data={
            "owner": {
                "id": owner.id,
                "name": owner.name,
                "mobile": owner.mobile,
            } if owner else None,
            "candidates": [{"id": c.id, "name": c.name, "mobile": c.mobile} for c in candidates],
        },
        message="Owner retrieved successfully",
    )


@router.put("/update-customer-owner")
async def update_customer_owner(
    payload: OwnerUpdateRequest,
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    next_user = await execute_one_or_none(
        select(User)
        .join(OrganizationMembership, OrganizationMembership.user_id == User.id)
        .where(OrganizationMembership.company_id == payload.customer_id, User.id == payload.user_id)
    )
    if not next_user:
        raise AppException("Person not found in this hospital", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        # Demote existing owner
        demote_stmt = (
            update(OrganizationMembership)
            .where(OrganizationMembership.company_id == payload.customer_id)
            .values(is_owner=False)
        )
        await execute_dml(demote_stmt, session=session)

        # Promote new owner
        promote_stmt = (
            update(OrganizationMembership)
            .where(
                OrganizationMembership.company_id == payload.customer_id,
                OrganizationMembership.user_id == payload.user_id,
            )
            .values(is_owner=True)
        )
        await execute_dml(promote_stmt, session=session)

    return api_response(data={"ok": True}, message="Hospital owner updated successfully")


@router.post("/reset-owner-password")
async def reset_owner_password(
    payload: OwnerPasswordResetRequest,
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    owner_stmt = (
        select(User)
        .join(OrganizationMembership, OrganizationMembership.user_id == User.id)
        .where(OrganizationMembership.company_id == payload.customer_id, OrganizationMembership.is_owner == True)
        .limit(1)
    )
    owner = await execute_one_or_none(owner_stmt)
    if not owner:
        raise AppException("This hospital has no owner", code=ErrorCode.NOT_FOUND, status_code=404)

    new_hash = hash_password(payload.password)
    async with transaction() as session:
        stmt = update(User).where(User.id == owner.id).values(password_hash=new_hash)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Owner password reset successfully")


@router.get("/list-customer-payments")
async def list_customer_payments(
    customer_id: int = Query(..., alias="customerId"),
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    stmt = select(PlatformPayment).where(PlatformPayment.company_id == customer_id).order_by(desc(PlatformPayment.id))
    payments = await execute_all(stmt)
    return api_response(
        data={"payments": [{
            "id": p.id,
            "amount_paise": p.amount_paise,
            "gateway_ref": p.gateway_ref,
            "status": p.status,
            "notes": p.notes,
        } for p in payments]},
        message="Payments retrieved successfully",
    )


@router.post("/record-customer-payment")
async def record_customer_payment(
    payload: PlatformPaymentCreateRequest,
    admin: User = Depends(require_platform_admin),
) -> Dict[str, Any]:
    ref = payload.gateway_ref or f"PAY-{int(datetime.now(timezone.utc).timestamp())}"
    async with transaction() as session:
        payment = PlatformPayment(
            company_id=payload.customer_id,
            amount_paise=payload.amount_paise,
            gateway_ref=ref,
            status="completed",
            notes=payload.note,
        )
        saved = await save_entity(payment, session=session)

    return api_response(
        data={"id": saved.id, "gateway_ref": saved.gateway_ref},
        message="Payment recorded successfully",
        status_code=201,
    )
