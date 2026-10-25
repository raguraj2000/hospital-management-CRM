"""Unit tests for domain validation rules."""

import pytest
from src.core.exceptions import AppException
from src.validation.clinical_validation import validate_visit_transition
from src.validation.common import validate_email, validate_phone, validate_positive_paise
from src.validation.organization_validation import validate_gstin, validate_slug


def test_validate_email_valid() -> None:
    assert validate_email("  Doctor@Clinic.Com  ") == "doctor@clinic.com"


def test_validate_email_invalid() -> None:
    with pytest.raises(AppException):
        validate_email("not-an-email")


def test_validate_phone_valid() -> None:
    assert validate_phone("+919876543210") == "+919876543210"


def test_validate_slug_valid() -> None:
    assert validate_slug("north-wing-clinic") == "north-wing-clinic"


def test_validate_slug_invalid() -> None:
    with pytest.raises(AppException):
        validate_slug("Invalid Slug with Spaces!")


def test_validate_gstin_valid() -> None:
    gstin = "33AAAAA0000A1Z5"
    assert validate_gstin(gstin) == gstin


def test_validate_visit_transition() -> None:
    # Valid transition
    validate_visit_transition("registered", "waiting")
    validate_visit_transition("waiting", "engaged")
    validate_visit_transition("engaged", "completed")

    # Invalid transition (completed -> registered)
    with pytest.raises(AppException):
        validate_visit_transition("completed", "registered")

