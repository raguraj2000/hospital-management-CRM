"""Common reusable domain validation functions."""

import re
from typing import Optional
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")
PHONE_REGEX = re.compile(r"^\+?[0-9]{7,15}$")


def validate_email(email: str) -> str:
    cleaned = email.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise AppException("Invalid email address format.", code=ErrorCode.VALIDATION_ERROR)
    return cleaned


def validate_phone(phone: str) -> str:
    cleaned = phone.strip()
    if not PHONE_REGEX.match(cleaned):
        raise AppException("Invalid phone number format.", code=ErrorCode.VALIDATION_ERROR)
    return cleaned


def validate_positive_paise(amount: int, field_name: str = "amount") -> int:
    if amount < 0:
        raise AppException(
            f"{field_name} cannot be negative.",
            code=ErrorCode.NEGATIVE_AMOUNT_NOT_ALLOWED,
        )
    return amount

