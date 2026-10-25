-- ==============================================================================
-- Table: master.hsn_sac_codes
-- Purpose: Harmonized System of Nomenclature (HSN) and Service Accounting Codes (SAC)
-- Source: db-design.md Section 9 (GST & Financial Auditability)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS master.hsn_sac_codes (
    code VARCHAR(15) PRIMARY KEY,   -- E.g. '3004' (Medicaments), '9993' (Healthcare Services)
    type VARCHAR(10) NOT NULL CHECK (type IN ('HSN', 'SAC')), -- HSN = Goods, SAC = Services
    description TEXT NOT NULL,
    default_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_exempt_by_default BOOLEAN NOT NULL DEFAULT false, -- True for core healthcare consultations
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS ix_hsn_sac_type ON master.hsn_sac_codes (type);
COMMENT ON TABLE master.hsn_sac_codes IS 'Official GST classification directory for pharmaceutical products and clinical procedures';
