-- ==============================================================================
-- View: public.vw_available_stock
-- Purpose: Live FEFO inventory stock aggregation per medicine and location
-- Source: FR-PHM-01, apps/api/src/routes/pharmacy.ts (medicinesWithStock)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_available_stock AS
SELECT 
    m.company_id,
    b.inventory_id,
    loc.name AS inventory_name,
    m.id AS medicine_id,
    m.name AS medicine_name,
    m.form,
    m.strength,
    m.price_paise,
    m.reorder_level,
    COALESCE(SUM(b.quantity), 0)::BIGINT AS total_available_stock,
    MIN(b.expiry_date) AS earliest_expiry_date,
    (
        SELECT b2.batch_no 
        FROM public.inventory_batches b2 
        WHERE b2.inventory_id = b.inventory_id 
          AND b2.medicine_id = m.id 
          AND b2.quantity > 0 
          AND b2.expiry_date >= CURRENT_DATE
        ORDER BY b2.expiry_date ASC, b2.id ASC 
        LIMIT 1
    ) AS next_fefo_batch_no,
    CASE 
        WHEN COALESCE(SUM(b.quantity), 0) = 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(SUM(b.quantity), 0) <= m.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status
FROM public.medicines m
JOIN public.inventory_locations loc ON loc.company_id = m.company_id
LEFT JOIN public.inventory_batches b ON b.medicine_id = m.id 
    AND b.inventory_id = loc.id
    AND b.quantity > 0 
    AND b.expiry_date >= CURRENT_DATE -- Exclude already expired batches
WHERE m.deleted_at IS NULL
GROUP BY m.company_id, b.inventory_id, loc.name, m.id, m.name, m.form, m.strength, m.price_paise, m.reorder_level;

COMMENT ON VIEW public.vw_available_stock IS 'Aggregated sellable inventory stock per location following FEFO rules';
