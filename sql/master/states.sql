-- ==============================================================================
-- Table: master.states
-- Purpose: Indian States & Union Territories with statutory 2-digit GST state codes
-- Source: db-design.md Section 9 (GST and Financial Auditability)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS master.states (
    code VARCHAR(10) PRIMARY KEY,       -- State abbreviation (e.g. 'TN', 'MH', 'KA')
    country_code VARCHAR(3) NOT NULL REFERENCES master.countries(code) DEFAULT 'IND',
    name VARCHAR(100) NOT NULL,
    gst_state_code VARCHAR(2) NOT NULL, -- 2-digit GST TIN code (e.g. '33' for Tamil Nadu, '27' for Maharashtra)
    is_union_territory BOOLEAN NOT NULL DEFAULT false, -- Dictates UTGST vs SGST
    is_active BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT uq_gst_state_code UNIQUE (country_code, gst_state_code)
);

CREATE INDEX IF NOT EXISTS ix_states_gst_code ON master.states (gst_state_code);
COMMENT ON TABLE master.states IS 'State reference data storing official 2-digit GST state codes used in GSTIN tax resolution';
