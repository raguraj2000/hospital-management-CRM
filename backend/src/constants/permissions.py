"""System-wide granular permission keys matching packages/shared/src/index.ts."""

from enum import StrEnum


class Permission(StrEnum):
    # Patient Management
    PATIENT_READ = "patient.read"
    PATIENT_CREATE = "patient.create"
    PATIENT_UPDATE = "patient.update"
    PATIENT_DELETE = "patient.delete"

    # Outpatient Consultation
    OP_VISIT_READ = "op_visit.read"
    OP_VISIT_CREATE = "op_visit.create"
    OP_VISIT_CANCEL = "op_visit.cancel"
    CLINICAL_WRITE = "clinical.write"
    PRESCRIPTION_WRITE = "prescription.write"

    # Treatments & Procedural Injections
    TREATMENT_ADMINISTER = "treatment.administer"
    TREATMENT_MANAGE = "treatment.manage"
    COURSE_MANAGE = "course.manage"

    # Pharmacy & FEFO Stock
    PHARMACY_READ = "pharmacy.read"
    PHARMACY_MANAGE = "pharmacy.manage"
    PHARMACY_DISPENSE = "pharmacy.dispense"
    INVENTORY_MANAGE = "inventory.manage"

    # Diagnostic Lab & Pathology
    LAB_ORDER = "lab.order"
    LAB_ENTRY = "lab.entry"
    LAB_RELEASE = "lab.release"
    LAB_MANAGE = "lab.manage"

    # Invoicing, Billing & Cashier Receipts
    BILLING_INVOICE_READ = "billing.invoice.read"
    BILLING_INVOICE_CREATE = "billing.invoice.create"
    BILLING_INVOICE_CANCEL = "billing.invoice.cancel"
    BILLING_PAYMENT = "billing.payment"
    BILLING_EXPENSE = "billing.expense"

    # Administration & Platform
    ADMIN_MANAGE_USERS = "admin.manage_users"
    ADMIN_SETTINGS = "admin.settings"
    PLATFORM_ADMIN = "platform.admin"

