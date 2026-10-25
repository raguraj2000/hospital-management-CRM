-- ==============================================================================
-- Table: master.payment_methods
-- Purpose: Master catalog of accepted payment channels
-- Source: packages/shared/src/index.ts (PAYMENT_MODES, VENDOR_PAYMENT_MODES)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS master.payment_methods (
    code VARCHAR(20) PRIMARY KEY, -- 'cash', 'upi', 'card', 'cheque', 'bank_transfer'
    name VARCHAR(60) NOT NULL,
    requires_reference BOOLEAN NOT NULL DEFAULT false, -- True for cheque / bank UTR reference
    is_digital BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE master.payment_methods IS 'Master reference of financial tender types for patient receipts and vendor disbursements';
