"""Domain statuses and state enumeration types."""

from enum import StrEnum


class VisitStatus(StrEnum):
    REGISTERED = "registered"
    WAITING = "waiting"
    ENGAGED = "engaged"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InvoiceStatus(StrEnum):
    DRAFT = "draft"
    POSTED = "posted"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    CANCELLED = "cancelled"


class PaymentMethod(StrEnum):
    CASH = "cash"
    UPI = "upi"
    CARD = "card"
    NET_BANKING = "net_banking"
    INSURANCE = "insurance"
    CREDIT = "credit"


class LabOrderStatus(StrEnum):
    ORDERED = "ordered"
    COLLECTED = "collected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class StockMovementType(StrEnum):
    INWARD = "inward"
    OUTWARD_SALE = "outward_sale"
    DISPENSE = "dispense"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    EXPIRED = "expired"
    DAMAGED = "damaged"

