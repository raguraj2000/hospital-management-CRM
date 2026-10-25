"""Serialization and currency parsing helpers."""

from decimal import Decimal
from typing import Union
from src.constants.application import PAISE_PER_INR


def inr_to_paise(amount_inr: Union[Decimal, float, str, int]) -> int:
    """Converts INR currency value to integer paise without floating point error."""
    dec = Decimal(str(amount_inr))
    return int((dec * Decimal(PAISE_PER_INR)).quantize(Decimal("1")))


def paise_to_inr(paise: int) -> Decimal:
    """Converts integer paise to Decimal INR representation."""
    return (Decimal(paise) / Decimal(PAISE_PER_INR)).quantize(Decimal("0.01"))

