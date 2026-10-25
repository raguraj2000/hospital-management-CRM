-- ==============================================================================
-- Trigger: public.trg_enforce_invoice_immutability
-- Purpose: Enforces financial immutability. Prevents UPDATE or DELETE of posted invoices
-- Source: db-design.md Section 9 (Financial Immutability and Auditing)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_check_invoice_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_immutable = true THEN
        -- Only status transitions to 'cancelled' or 'refunded' are permitted via official credit note flow
        IF TG_OP = 'UPDATE' AND (NEW.status IN ('cancelled', 'refunded') AND OLD.status IN ('posted', 'part_paid', 'paid')) THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'Financial Audit Violation: Posted invoice % is immutable and cannot be altered or deleted. Issue a Credit Note instead.', OLD.invoice_no;
    END IF;

    -- Automatically mark immutable once posted or when a payment is attached
    IF NEW.status IN ('posted', 'part_paid', 'paid') THEN
        NEW.is_immutable := true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_immutability ON public.invoices;
CREATE TRIGGER trg_invoice_immutability
    BEFORE UPDATE OR DELETE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_check_invoice_immutability();

COMMENT ON FUNCTION public.fn_check_invoice_immutability IS 'Prevents tampering with finalized patient invoices for statutory GST compliance';
