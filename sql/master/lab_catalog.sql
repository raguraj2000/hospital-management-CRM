-- ==============================================================================
-- Table: master.lab_catalog
-- Purpose: Master standardized catalog of clinical laboratory diagnostic tests
-- Source: packages/shared/src/lab-catalog.ts (LAB_CATALOG)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS master.lab_catalog (
    code VARCHAR(40) PRIMARY KEY, -- E.g. 'CBC', 'WIDAL', 'LIPID', 'RBS', 'HBA1C'
    name VARCHAR(150) NOT NULL,
    department VARCHAR(80) NOT NULL, -- E.g. 'HAEMATOLOGY', 'BIOCHEMISTRY', 'SEROLOGY'
    kind VARCHAR(20) NOT NULL DEFAULT 'panel' CHECK (kind IN ('panel', 'card')),
    specimen VARCHAR(60) NOT NULL DEFAULT 'Blood',
    default_price_paise BIGINT NOT NULL DEFAULT 0,
    hsn_sac_code VARCHAR(15) NULL REFERENCES master.hsn_sac_codes(code),
    is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE master.lab_catalog IS 'Platform standard laboratory test master templates inherited by branch laboratories';
