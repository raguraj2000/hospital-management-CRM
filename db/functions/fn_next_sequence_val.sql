-- ==============================================================================
-- Function: public.fn_next_sequence_val
-- Purpose: Concurrency-safe atomic counter sequence generator per facility
-- Source: packages/core/src/audit.ts (nextNumber)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_next_sequence_val(
    p_branch_id BIGINT,
    p_name VARCHAR
) RETURNS BIGINT AS $$
DECLARE
    v_val BIGINT;
BEGIN
    INSERT INTO public.branch_counters (branch_id, name, value, updated_at)
    VALUES (p_branch_id, p_name, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (branch_id, name)
    DO UPDATE SET value = public.branch_counters.value + 1, updated_at = CURRENT_TIMESTAMP
    RETURNING value INTO v_val;

    RETURN v_val;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION public.fn_next_sequence_val IS 'Atomic running number generator for branch OP tokens and invoice numbers';
