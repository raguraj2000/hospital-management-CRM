-- ==============================================================================
-- Trigger Function: public.fn_update_timestamp
-- Purpose: Standard trigger automatically maintaining updated_at across all tables
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fn_update_timestamp IS 'Automatically updates updated_at column on record modification';
