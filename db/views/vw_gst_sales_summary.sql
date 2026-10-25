-- ==============================================================================
-- View: public.vw_gst_sales_summary
-- Purpose: Statutory GSTR-1 preparation report aggregating taxable sales and tax splits
-- Source: db-design.md Section 9 (GST Reporting)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_gst_sales_summary AS
SELECT 
    i.company_id,
    i.branch_id,
    br.name AS branch_name,
    br.gstin AS branch_gstin,
    TO_CHAR(i.invoice_date, 'YYYY-MM') AS tax_period,
    l.gst_tax_code,
    l.gst_rate_percent,
    CASE 
        WHEN i.patient_gstin IS NOT NULL AND i.patient_gstin <> '' THEN 'B2B'
        WHEN i.is_inter_state THEN 'B2CL'
        ELSE 'B2CS'
    END AS transaction_type,
    COUNT(DISTINCT i.id) AS invoice_count,
    SUM(l.taxable_value_paise) AS total_taxable_paise,
    SUM(CASE WHEN t.tax_component = 'CGST' THEN t.tax_amount_paise ELSE 0 END) AS total_cgst_paise,
    SUM(CASE WHEN t.tax_component IN ('SGST', 'UTGST') THEN t.tax_amount_paise ELSE 0 END) AS total_sgst_paise,
    SUM(CASE WHEN t.tax_component = 'IGST' THEN t.tax_amount_paise ELSE 0 END) AS total_igst_paise,
    SUM(CASE WHEN t.tax_component = 'CESS' THEN t.tax_amount_paise ELSE 0 END) AS total_cess_paise,
    SUM(l.net_line_amount_paise) AS total_invoice_value_paise
FROM public.invoices i
JOIN public.branches br ON br.id = i.branch_id
JOIN public.invoice_lines l ON l.invoice_id = i.id
LEFT JOIN public.invoice_tax_lines t ON t.invoice_line_id = l.id
WHERE i.status IN ('posted', 'part_paid', 'paid')
GROUP BY i.company_id, i.branch_id, br.name, br.gstin, TO_CHAR(i.invoice_date, 'YYYY-MM'), l.gst_tax_code, l.gst_rate_percent,
    CASE 
        WHEN i.patient_gstin IS NOT NULL AND i.patient_gstin <> '' THEN 'B2B'
        WHEN i.is_inter_state THEN 'B2CL'
        ELSE 'B2CS'
    END;

COMMENT ON VIEW public.vw_gst_sales_summary IS 'Monthly GSTR-1 compliant tax summary categorized by rate and B2B/B2C transactions';
