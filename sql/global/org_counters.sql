-- ==============================================================================
-- Table: global.org_counters
-- Purpose: Enterprise-wide atomic sequence generator (e.g. UHID sequential numbers)
-- Source: packages/core/src/db/schema.ts (org_counter)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS global.org_counters (
    company_id BIGINT NOT NULL REFERENCES global.organizations(id) ON DELETE CASCADE,
    name VARCHAR(60) NOT NULL,
    value BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (company_id, name)
);

COMMENT ON TABLE global.org_counters IS 'Atomic counters for organization-wide running numbers that must never collide across branches';
