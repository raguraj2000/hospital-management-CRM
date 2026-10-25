"""Operational Expenses Router."""

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, func, select
from src.api.dependencies import BranchContext, get_branch_context
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException
from src.dal import execute_all, execute_dml, execute_one_or_none, save_entity, transaction
from src.models.public.financial import Expense
from src.schemas.common import api_response

router = APIRouter(prefix="/expenses", tags=["Operational Expenses"])


class ExpenseCreatePayload(BaseModel):
    category: str
    amount_paise: int = Field(..., alias="amountPaise")
    notes: Optional[str] = None
    expense_date: Optional[date] = Field(None, alias="expenseDate")
    payment_mode: str = Field("cash", alias="paymentMode")
    branch_id: Optional[int] = Field(None, alias="branchId")


class ExpenseDeletePayload(BaseModel):
    expense_id: int = Field(..., alias="expenseId")
    branch_id: Optional[int] = Field(None, alias="branchId")


@router.get("/list")
async def list_expenses(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    stmt = (
        select(Expense)
        .where(Expense.branch_id == context.branch_id)
        .order_by(desc(Expense.id))
        .limit(limit)
        .offset(offset)
    )
    expenses = await execute_all(stmt)
    return api_response(
        data={"expenses": [{
            "id": e.id,
            "category": e.category,
            "amount_paise": e.amount_paise,
            "notes": e.notes,
            "expense_date": e.expense_date.isoformat(),
            "payment_mode": e.payment_mode,
        } for e in expenses]},
        message="Expenses retrieved successfully",
    )


@router.post("/create")
async def create_expense(
    payload: ExpenseCreatePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    async with transaction() as session:
        exp = Expense(
            company_id=context.company_id,
            branch_id=branch_id,
            category=payload.category.strip(),
            amount_paise=payload.amount_paise,
            notes=payload.notes,
            expense_date=payload.expense_date or date.today(),
            payment_mode=payload.payment_mode,
            created_by=context.user.id,
        )
        saved = await save_entity(exp, session=session)

    return api_response(
        data={"expense": {"id": saved.id, "amount_paise": saved.amount_paise}},
        message="Expense recorded successfully",
        status_code=201,
    )


@router.delete("/delete")
async def delete_expense(
    payload: ExpenseDeletePayload,
    context: BranchContext = Depends(get_branch_context),
) -> Dict[str, Any]:
    branch_id = payload.branch_id or context.branch_id
    exp = await execute_one_or_none(select(Expense).where(Expense.id == payload.expense_id, Expense.branch_id == branch_id))
    if not exp:
        raise AppException("Expense not found", code=ErrorCode.NOT_FOUND, status_code=404)

    async with transaction() as session:
        stmt = delete(Expense).where(Expense.id == exp.id)
        await execute_dml(stmt, session=session)

    return api_response(data={"ok": True}, message="Expense deleted successfully")
