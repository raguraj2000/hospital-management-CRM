-- ==============================================================================
-- Table: global.role_permissions
-- Purpose: Maps granular permissions to roles
-- Source: packages/core/src/db/schema.ts (role_permission), db-design.md Section 8
-- ==============================================================================

CREATE TABLE IF NOT EXISTS global.role_permissions (
    role_id BIGINT NOT NULL REFERENCES global.roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES global.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE global.role_permissions IS 'Junction table establishing default privileges possessed by each role';
