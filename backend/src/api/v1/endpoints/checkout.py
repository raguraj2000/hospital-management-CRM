"""Atomic combined OPD + Pharmacy checkout endpoint."""

from fastapi import APIRouter, Depends
from src.api.dependencies import BranchContext, require_permission
from src.constants.permissions import Permission
from src.schemas.checkout_schema import CheckoutRequest, CheckoutResponse
from src.service.checkout_service import CheckoutService

router = APIRouter(prefix="/b/{branch_slug}/checkout", tags=["Checkout"])


@router.post("", response_model=CheckoutResponse)
async def process_checkout(
    payload: CheckoutRequest,
    context: BranchContext = Depends(require_permission(Permission.BILLING_INVOICE_CREATE)),
    checkout_service: CheckoutService = Depends(),
) -> CheckoutResponse:
    return await checkout_service.execute_checkout(
        company_id=context.company_id,
        branch_id=context.branch_id,
        code_prefix=context.code_prefix,
        inventory_id=context.inventory_id,
        request=payload,
        actor_id=context.user.id,
    )

