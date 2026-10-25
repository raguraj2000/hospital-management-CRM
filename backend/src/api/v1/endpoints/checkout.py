"""Atomic combined OPD + Pharmacy checkout router."""

from typing import Any, Dict
from fastapi import APIRouter, Depends
from src.api.dependencies import BranchContext, get_branch_context
from src.schemas.checkout_schema import CheckoutRequest, CheckoutResponse
from src.schemas.common import api_response
from src.service.checkout_service import CheckoutService

router = APIRouter(prefix="/checkout", tags=["Atomic Checkout"])


@router.post("/process")
async def process_checkout(
    payload: CheckoutRequest,
    context: BranchContext = Depends(get_branch_context),
    checkout_service: CheckoutService = Depends(),
) -> Dict[str, Any]:
    res = await checkout_service.execute_checkout(
        company_id=context.company_id,
        branch_id=context.branch_id,
        code_prefix=context.code_prefix,
        inventory_id=context.inventory_id,
        request=payload,
        actor_id=context.user.id,
    )
    return api_response(data=res.model_dump(), message="Checkout processed successfully")
