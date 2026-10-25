"""Deterministic pagination offset and limit calculation."""

from typing import Tuple
from src.constants.application import DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT


def calculate_pagination(
    page: int = 1,
    limit: int = DEFAULT_PAGINATION_LIMIT,
) -> Tuple[int, int]:
    """Calculates safe (offset, limit) clamping bounds."""
    safe_page = max(1, page)
    safe_limit = max(1, min(limit, MAX_PAGINATION_LIMIT))
    offset = (safe_page - 1) * safe_limit
    return offset, safe_limit

