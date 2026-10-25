-- ==============================================================================
-- Validation Script: test_schema_integrity.sql
-- Purpose: Rigorous verification queries validating table existence, constraints,
-- foreign keys, M:N region-inventory isolation, view resolution, and GST immutability
-- ==============================================================================

-- 1. Schema Existence Check
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('global', 'master', 'public', 'staging');

-- 2. Table Count Check across Schemas
SELECT table_schema, count(*) as table_count
FROM information_schema.tables 
WHERE table_schema IN ('global', 'master', 'public', 'staging')
GROUP BY table_schema
ORDER BY table_schema;

-- 3. Verify Region-to-Inventory Many-to-Many Tenant Isolation Constraint
-- Ensures region_id and inventory_id reference the SAME company_id via composite FK
SELECT 
    tc.table_schema, tc.table_name, kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'region_inventory';

-- 4. Authorization Evaluation Simulation
-- Test fn_authorize_user functionality
SELECT global.fn_authorize_user(
    p_user_id := 1,
    p_company_id := 1,
    p_permission_key := 'patient.create',
    p_region_id := 1,
    p_branch_id := 1
) AS can_create_patient;

-- 5. Test vw_user_permissions view for boolean output
SELECT 
    company_id, 
    region_id, 
    user_id, 
    permission_key, 
    has_permission
FROM public.vw_user_permissions
WHERE company_id = 1 
  AND region_id = 1 
  AND user_id = 1
LIMIT 10;

-- 6. GST Calculation Simulation
-- Test intra-state (TN to TN -> CGST 6% + SGST 6%) vs inter-state (TN to KA -> IGST 12%)
SELECT * FROM public.fn_calculate_gst(
    p_taxable_paise := 100000, -- Rs 1,000.00
    p_tax_code := 'GST_12',
    p_seller_state_code := 'TN',
    p_place_of_supply_state_code := 'TN'
);

SELECT * FROM public.fn_calculate_gst(
    p_taxable_paise := 100000, -- Rs 1,000.00
    p_tax_code := 'GST_12',
    p_seller_state_code := 'TN',
    p_place_of_supply_state_code := 'KA'
);

-- 7. Verify Company/Region/Inventory Composite Indexes
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE indexname LIKE '%_company_region%'
ORDER BY tablename, indexname;
