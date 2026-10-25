-- ==============================================================================
-- Function: public.fn_calculate_gst
-- Purpose: Computes CGST, SGST/UTGST, or IGST based on place of supply and rates
-- Source: db-design.md Section 9 (GST Calculations)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_calculate_gst(
    p_taxable_paise BIGINT,
    p_tax_code VARCHAR,
    p_seller_state_code VARCHAR,
    p_place_of_supply_state_code VARCHAR,
    p_invoice_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    is_inter_state BOOLEAN,
    cgst_rate NUMERIC,
    cgst_paise BIGINT,
    sgst_rate NUMERIC,
    sgst_paise BIGINT,
    igst_rate NUMERIC,
    igst_paise BIGINT,
    cess_rate NUMERIC,
    cess_paise BIGINT,
    total_tax_paise BIGINT
) AS $$
DECLARE
    v_rate RECORD;
    v_is_inter BOOLEAN;
    v_cgst_amt BIGINT := 0;
    v_sgst_amt BIGINT := 0;
    v_igst_amt BIGINT := 0;
    v_cess_amt BIGINT := 0;
BEGIN
    -- Determine inter-state (IGST) vs intra-state (CGST + SGST)
    v_is_inter := (p_seller_state_code <> p_place_of_supply_state_code);

    -- Find active rate on invoice date
    SELECT r.cgst_rate, r.sgst_rate, r.igst_rate, r.cess_rate, r.total_rate
    INTO v_rate
    FROM master.gst_rates r
    WHERE r.tax_code = p_tax_code
      AND r.valid_from <= p_invoice_date
      AND (r.valid_to IS NULL OR r.valid_to >= p_invoice_date)
    ORDER BY r.valid_from DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
        -- Default to zero tax if exempt or rate not found
        RETURN QUERY SELECT v_is_inter, 0.00::NUMERIC, 0::BIGINT, 0.00::NUMERIC, 0::BIGINT, 0.00::NUMERIC, 0::BIGINT, 0.00::NUMERIC, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    IF v_is_inter THEN
        -- Inter-state: Charge IGST
        v_igst_amt := ROUND(p_taxable_paise * (v_rate.igst_rate / 100.0));
    ELSE
        -- Intra-state: Split equally between CGST and SGST
        v_cgst_amt := ROUND(p_taxable_paise * (v_rate.cgst_rate / 100.0));
        v_sgst_amt := ROUND(p_taxable_paise * (v_rate.sgst_rate / 100.0));
    END IF;

    IF v_rate.cess_rate > 0 THEN
        v_cess_amt := ROUND(p_taxable_paise * (v_rate.cess_rate / 100.0));
    END IF;

    RETURN QUERY SELECT 
        v_is_inter,
        v_rate.cgst_rate, v_cgst_amt,
        v_rate.sgst_rate, v_sgst_amt,
        v_rate.igst_rate, v_igst_amt,
        v_rate.cess_rate, v_cess_amt,
        (v_cgst_amt + v_sgst_amt + v_igst_amt + v_cess_amt);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.fn_calculate_gst IS 'Calculates exact CGST, SGST, IGST tax breakdown in whole paise based on Place of Supply';
