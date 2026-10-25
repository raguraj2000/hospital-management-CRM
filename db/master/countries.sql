-- ==============================================================================
-- Table: master.countries
-- Purpose: ISO country code reference data
-- Source: db-design.md Section 5 (Master Reference)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS master.countries (
    code VARCHAR(3) PRIMARY KEY,      -- ISO 3166-1 alpha-3 code (e.g. 'IND')
    alpha2 VARCHAR(2) NOT NULL UNIQUE,-- ISO 3166-1 alpha-2 code (e.g. 'IN')
    name VARCHAR(100) NOT NULL,
    dial_code VARCHAR(10) NOT NULL,   -- E.g. '+91'
    is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE master.countries IS 'Standard ISO country directory';
