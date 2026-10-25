"""Validation rules for organizations, regions, and facilities."""

import re
from typing import Optional
from src.constants.errors import ErrorCode
from src.core.exceptions import AppException

SLUG_REGEX = re.compile(r"^[a-z0-9-]+$")
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")


def validate_slug(slug: str) -> str:
    cleaned = slug.strip().lower()
    if not SLUG_REGEX.match(cleaned):
        raise AppException(
            "Slug must contain only lowercase alphanumeric characters and hyphens.",
            code=ErrorCode.VALIDATION_ERROR,
        )
    return cleaned


def validate_gstin(gstin: Optional[str]) -> Optional[str]:
    if not gstin:
        return None
    cleaned = gstin.strip().upper()
    if not GSTIN_REGEX.match(cleaned):
        raise AppException("Invalid 15-character GSTIN format.", code=ErrorCode.VALIDATION_ERROR)
    return cleaned

