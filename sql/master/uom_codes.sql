-- ==============================================================================
-- Table: master.uom_codes
-- Purpose: Units of Measurement for pharmaceuticals and clinical consumables
-- Source: packages/shared/src/index.ts (FORM_UNIT)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS master.uom_codes (
    code VARCHAR(20) PRIMARY KEY, -- E.g. 'tab', 'cap', 'bottle', 'vial', 'tube', 'unit'
    name VARCHAR(60) NOT NULL,    -- E.g. 'Tablet', 'Capsule', 'Syrup Bottle', 'Injection Vial'
    description TEXT NULL,
    is_discrete BOOLEAN NOT NULL DEFAULT true, -- True if counted as whole integers
    is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE master.uom_codes IS 'Standard units of measurement for medicine inventory stock and dispensing';
