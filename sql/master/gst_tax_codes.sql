-- ==============================================================================
-- Table: master.gst_tax_codes
-- Purpose: Symbolic tax code classifications for billing line items
-- Source: db-design.md Section 9 (GST Configuration)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS master.gst_tax_codes (
    code VARCHAR(20) PRIMARY KEY, -- E.g. 'GST_0', 'GST_5', 'GST_12', 'GST_18', 'GST_28', 'EXEMPT', 'NIL'
    name VARCHAR(60) NOT NULL,
    description TEXT NULL,
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE master.gst_tax_codes IS 'Tax code categorization identifiers linked to effective-dated rate schedules';
