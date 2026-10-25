"""Pharmacy and stock validation rules."""

from datetime import date
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException


def validate_batch_not_expired(expiry_date: date, batch_no: str) -> None:
    if expiry_date < date.today():
        raise AppException(
            f"Cannot allocate expired medicine batch: {batch_no} (expired on {expiry_date}).",
            code=ErrorCode.INSUFFICIENT_STOCK,
        )


def validate_dispense_quantity(requested: int, available: int, medicine_name: str) -> None:
    if requested <= 0:
        raise AppException("Dispense quantity must be positive.", code=ErrorCode.VALIDATION_ERROR)
    if requested > available:
        raise AppException(
            f"Insufficient stock for {medicine_name}: requested {requested}, available {available}.",
            code=ErrorCode.INSUFFICIENT_STOCK,
        )

