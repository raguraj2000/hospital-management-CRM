-- ==============================================================================
-- Table: public.branch_doctors
-- Purpose: Roster of active practitioners seeing patients in a branch
-- Source: apps/api/src/db/schema.ts (branch_doctor)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.branch_doctors (
    branch_id BIGINT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES global.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (branch_id, user_id)
);

COMMENT ON TABLE public.branch_doctors IS 'Roster of practitioners available to receive OP visits in this facility';
