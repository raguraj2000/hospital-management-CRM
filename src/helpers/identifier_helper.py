"""Unique sequence and business identifier generation."""

from datetime import datetime


def generate_uhid(sequence_num: int, prefix: str = "UHID") -> str:
    """Generates standard patient UHID e.g. UHID-202610-0001."""
    period = datetime.now().strftime("%Y%m")
    return f"{prefix}-{period}-{sequence_num:04d}"


def generate_token_no(sequence_num: int, prefix: str = "T") -> str:
    """Generates outpatient daily queue token e.g. T-042."""
    return f"{prefix}-{sequence_num:03d}"


def generate_invoice_no(prefix: str, sequence_num: int) -> str:
    """Generates sequential tax invoice number e.g. MAIN-INV-00104."""
    return f"{prefix}-INV-{sequence_num:05d}"


def generate_receipt_no(prefix: str, sequence_num: int) -> str:
    """Generates cashier receipt number e.g. MAIN-REC-00104."""
    return f"{prefix}-REC-{sequence_num:05d}"

