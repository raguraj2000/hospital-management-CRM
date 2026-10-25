-- ==============================================================================
-- Table: public.branch_counters
-- Purpose: Atomic running sequence numbers scoped per facility (daily tokens, bill numbers)
-- Source: packages/core/src/db/schema.ts (branch_counter)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.branch_counters (
    branch_id BIGINT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(60) NOT NULL,
    value BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (branch_id, name)
);

COMMENT ON TABLE public.branch_counters IS 'Facility-scoped atomic number generators for daily OP tokens, invoices, and receipts';
