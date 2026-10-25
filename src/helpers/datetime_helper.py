"""Date, time, and timezone utilities."""

from datetime import date, datetime, timezone
from typing import Optional


def get_utc_now() -> datetime:
    """Returns current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def format_iso(dt: Optional[datetime]) -> Optional[str]:
    """Formats datetime to ISO 8601 string."""
    if dt is None:
        return None
    return dt.isoformat()


def is_expired(expiry_date: date) -> bool:
    """Checks if a given date is strictly before today."""
    return expiry_date < date.today()

