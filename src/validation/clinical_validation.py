"""Clinical patient and visit validation rules."""

from typing import Set
from src.constants.errors import ErrorCode
from src.constants.statuses import VisitStatus
from src.core.exceptions import AppException

ALLOWED_STATUS_TRANSITIONS = {
    VisitStatus.REGISTERED: {VisitStatus.WAITING, VisitStatus.CANCELLED},
    VisitStatus.WAITING: {VisitStatus.ENGAGED, VisitStatus.CANCELLED},
    VisitStatus.ENGAGED: {VisitStatus.COMPLETED, VisitStatus.CANCELLED},
    VisitStatus.COMPLETED: set(),
    VisitStatus.CANCELLED: set(),
}


def validate_visit_transition(current_status: str, new_status: str) -> None:
    curr = VisitStatus(current_status)
    target = VisitStatus(new_status)
    if target not in ALLOWED_STATUS_TRANSITIONS.get(curr, set()):
        raise AppException(
            f"Invalid visit status transition from '{current_status}' to '{new_status}'.",
            code=ErrorCode.INVALID_STATUS_TRANSITION,
        )

