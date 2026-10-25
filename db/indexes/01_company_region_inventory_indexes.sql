-- ==============================================================================
-- Migration / Script: sql/indexes/01_company_region_inventory_indexes.sql
-- Purpose: Enforces optimized hierarchical indexing across company, region, and inventory
-- Index Patterns:
--   1. (company_id, region_id)
--   2. (company_id, region_id, inventory_id)
-- ==============================================================================

-- 1. Index Pattern: (company_id, region_id)
CREATE INDEX IF NOT EXISTS ix_branches_company_region 
    ON public.branches (company_id, region_id);

CREATE INDEX IF NOT EXISTS ix_region_inventory_company_region 
    ON public.region_inventory (company_id, region_id);

CREATE INDEX IF NOT EXISTS ix_user_roles_company_region 
    ON global.user_roles (company_id, region_id);

CREATE INDEX IF NOT EXISTS ix_user_perm_overrides_company_region 
    ON global.user_permission_overrides (company_id, region_id);


-- 2. Index Pattern: (company_id, region_id, inventory_id)
CREATE INDEX IF NOT EXISTS ix_region_inventory_company_region_inventory 
    ON public.region_inventory (company_id, region_id, inventory_id);

CREATE INDEX IF NOT EXISTS ix_user_roles_company_region_inventory 
    ON global.user_roles (company_id, region_id, inventory_id);

CREATE INDEX IF NOT EXISTS ix_user_perm_overrides_company_region_inventory 
    ON global.user_permission_overrides (company_id, region_id, inventory_id);

