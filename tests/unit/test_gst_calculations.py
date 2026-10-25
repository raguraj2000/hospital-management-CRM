"""Unit tests for deterministic whole-paise financial calculations."""

from decimal import Decimal
from src.helpers.serialization_helper import inr_to_paise, paise_to_inr
from src.validation.billing_validation import validate_invoice_totals


def test_inr_paise_conversion() -> None:
    assert inr_to_paise("100.50") == 10050
    assert inr_to_paise(100.50) == 10050
    assert inr_to_paise("0.05") == 5
    assert paise_to_inr(10050) == Decimal("100.50")


def test_invoice_total_calculation() -> None:
    # Subtotal ₹1,000 (100000 paise), Discount ₹100 (10000 paise), Tax ₹120 (12000 paise)
    subtotal = 100000
    discount = 10000
    tax = 12000
    total = validate_invoice_totals(subtotal, discount, tax)
    assert total == 102000  # ₹1,020.00

