"""Financial, invoice, and GST validation rules."""

from src.constants.errors import ErrorCode
from src.core.exceptions import AppException


def validate_invoice_totals(subtotal_paise: int, discount_paise: int, tax_paise: int) -> int:
    if discount_paise > subtotal_paise:
        raise AppException(
            "Discount cannot exceed invoice subtotal.",
            code=ErrorCode.VALIDATION_ERROR,
        )
    return subtotal_paise - discount_paise + tax_paise


def validate_cancellation_reason(reason: str) -> str:
    cleaned = reason.strip()
    if len(cleaned) < 5:
        raise AppException(
            "Cancellation reason must be at least 5 characters.",
            code=ErrorCode.VALIDATION_ERROR,
        )
    return cleaned

