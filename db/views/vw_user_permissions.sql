-- ==============================================================================
-- View: public.vw_user_permissions
-- Purpose: Resolves effective permissions for a user within a company and region
-- Input Columns for filtering: company_id, region_id, user_id (and optionally permission_key)
-- Returns: Boolean `has_permission` evaluated across Owner rights, User Overrides (Deny > Grant), and Roles
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_user_permissions AS
WITH user_company_regions AS (
    -- Valid active user memberships linked to active company regions
    SELECT 
        m.company_id,
        r.id AS region_id,
        r.name AS region_name,
        m.user_id,
        u.username,
        u.mobile AS user_mobile,
        u.name AS user_name,
        m.is_owner
    FROM global.organization_memberships m
    JOIN global.users u ON u.id = m.user_id AND u.is_active = true
    JOIN public.regions r ON r.company_id = m.company_id AND r.is_active = true
    WHERE m.is_active = true
),
user_region_matrix AS (
    -- Cartesian product across all system permissions
    SELECT 
        ucr.company_id,
        ucr.region_id,
        ucr.region_name,
        ucr.user_id,
        ucr.username,
        ucr.user_mobile,
        ucr.user_name,
        ucr.is_owner,
        p.id AS permission_id,
        p.key AS permission_key,
        p.name AS permission_name,
        p.module,
        p.action
    FROM user_company_regions ucr
    CROSS JOIN global.permissions p
),
region_overrides AS (
    -- Region-specific explicit user overrides (Rank 1: Highest precedence)
    SELECT DISTINCT ON (o.company_id, o.region_id, o.user_id, o.permission_id)
        o.company_id,
        o.region_id,
        o.user_id,
        o.permission_id,
        o.is_granted
    FROM global.user_permission_overrides o
    WHERE o.region_id IS NOT NULL
    ORDER BY o.company_id, o.region_id, o.user_id, o.permission_id, o.id DESC
),
company_overrides AS (
    -- Company-wide explicit user overrides (Rank 2: Applies when no region override exists)
    SELECT DISTINCT ON (o.company_id, o.user_id, o.permission_id)
        o.company_id,
        o.user_id,
        o.permission_id,
        o.is_granted
    FROM global.user_permission_overrides o
    WHERE o.region_id IS NULL AND o.branch_id IS NULL AND o.inventory_id IS NULL
    ORDER BY o.company_id, o.user_id, o.permission_id, o.id DESC
),
active_role_permissions AS (
    -- Role grants scoped to region or company-wide
    SELECT DISTINCT
        ur.company_id,
        ur.user_id,
        rp.permission_id,
        ur.region_id
    FROM global.user_roles ur
    JOIN global.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.is_active = true
)
SELECT 
    m.company_id,
    m.region_id,
    m.user_id,
    m.username,
    m.user_mobile,
    m.user_name,
    m.region_name,
    m.permission_id,
    m.permission_key,
    m.permission_name,
    m.module,
    m.action,
    -- Determine deterministic Boolean permission
    CASE 
        -- 1. Company Owner has absolute privilege
        WHEN m.is_owner = true THEN true

        -- 2. Region-specific explicit override (Explicit Deny or Grant)
        WHEN ro.is_granted IS NOT NULL THEN ro.is_granted

        -- 3. Company-wide explicit override (Explicit Deny or Grant)
        WHEN co.is_granted IS NOT NULL THEN co.is_granted

        -- 4. Role grant scoped to specific region
        WHEN r_role.permission_id IS NOT NULL THEN true

        -- 5. Role grant scoped company-wide (null region/branch/inventory)
        WHEN c_role.permission_id IS NOT NULL THEN true

        -- 6. Default closed: Deny
        ELSE false
    END::BOOLEAN AS has_permission
FROM user_region_matrix m
LEFT JOIN region_overrides ro 
    ON ro.company_id = m.company_id 
   AND ro.region_id = m.region_id 
   AND ro.user_id = m.user_id 
   AND ro.permission_id = m.permission_id
LEFT JOIN company_overrides co 
    ON co.company_id = m.company_id 
   AND co.user_id = m.user_id 
   AND co.permission_id = m.permission_id
LEFT JOIN active_role_permissions r_role 
    ON r_role.company_id = m.company_id 
   AND r_role.region_id = m.region_id 
   AND r_role.user_id = m.user_id 
   AND r_role.permission_id = m.permission_id
LEFT JOIN active_role_permissions c_role 
    ON c_role.company_id = m.company_id 
   AND c_role.region_id IS NULL 
   AND c_role.user_id = m.user_id 
   AND c_role.permission_id = m.permission_id;

COMMENT ON VIEW public.vw_user_permissions IS 'Consolidated permission evaluation view returning boolean has_permission for (company_id, region_id, user_id)';

