-- ==============================================================================
-- Function: global.fn_authorize_user
-- Purpose: Evaluates whether a user has a specific permission for a given resource scope
-- Precedence: Explicit Deny (0) > Explicit Grant (1) > Scoped Role Grant > Company Role Grant
-- Source: db-design.md Section 8 (Permission evaluation rules)
-- ==============================================================================

CREATE OR REPLACE FUNCTION global.fn_authorize_user(
    p_user_id BIGINT,
    p_company_id BIGINT,
    p_permission_key VARCHAR,
    p_region_id BIGINT DEFAULT NULL,
    p_branch_id BIGINT DEFAULT NULL,
    p_inventory_id BIGINT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_active_member BOOLEAN;
    v_is_owner BOOLEAN;
    v_perm_id BIGINT;
    v_override_granted BOOLEAN;
    v_has_role_grant BOOLEAN;
BEGIN
    -- 1. Verify active membership in the target company
    SELECT m.is_active, m.is_owner INTO v_is_active_member, v_is_owner
    FROM global.organization_memberships m
    WHERE m.user_id = p_user_id AND m.company_id = p_company_id;

    IF v_is_active_member IS NOT TRUE THEN
        RETURN FALSE; -- Not an active member of this company
    END IF;

    -- 2. Company owners hold all permissions automatically
    IF v_is_owner IS TRUE THEN
        RETURN TRUE;
    END IF;

    -- 3. Resolve target permission ID
    SELECT id INTO v_perm_id FROM global.permissions WHERE key = p_permission_key;
    IF v_perm_id IS NULL THEN
        RETURN FALSE; -- Unknown permission key
    END IF;

    -- 4. Check for user-specific explicit overrides (HIGHEST PRECEDENCE)
    -- Precedence: Region/Branch/Inventory scope > Company-wide scope
    SELECT is_granted INTO v_override_granted
    FROM global.user_permission_overrides o
    WHERE o.user_id = p_user_id 
      AND o.company_id = p_company_id 
      AND o.permission_id = v_perm_id
      AND (o.branch_id IS NULL OR o.branch_id = p_branch_id)
      AND (o.region_id IS NULL OR o.region_id = p_region_id)
      AND (o.inventory_id IS NULL OR o.inventory_id = p_inventory_id)
    ORDER BY 
        (CASE WHEN o.branch_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN o.region_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN o.inventory_id IS NOT NULL THEN 1 ELSE 0 END) DESC
    LIMIT 1;

    -- If an explicit override exists, return it (explicit FALSE blocks access immediately)
    IF v_override_granted IS NOT NULL THEN
        RETURN v_override_granted;
    END IF;

    -- 5. Check role-derived permissions
    SELECT EXISTS (
        SELECT 1
        FROM global.user_roles ur
        JOIN global.role_permissions rp ON rp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND ur.company_id = p_company_id
          AND ur.is_active = true
          AND rp.permission_id = v_perm_id
          -- Scope match: null matches any, or specific resource must match
          AND (ur.branch_id IS NULL OR ur.branch_id = p_branch_id)
          AND (ur.region_id IS NULL OR ur.region_id = p_region_id)
          AND (ur.inventory_id IS NULL OR ur.inventory_id = p_inventory_id)
    ) INTO v_has_role_grant;

    RETURN v_has_role_grant;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION global.fn_authorize_user IS 'Deterministic authorization evaluator enforcing Scoped Roles and User Overrides';
