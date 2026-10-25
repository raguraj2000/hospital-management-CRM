-- ==============================================================================
-- Table: global.sessions
-- Purpose: Active browser session tokens (stored only as SHA-256 digests)
-- Source: packages/core/src/db/schema.ts (session), FR-SEC-02
-- ==============================================================================

CREATE TABLE IF NOT EXISTS global.sessions (
    id VARCHAR(64) PRIMARY KEY, -- SHA-256 digest hex string of the 32-byte session token
    user_id BIGINT NOT NULL REFERENCES global.users(id) ON DELETE CASCADE,
    user_agent VARCHAR(300) NULL,
    ip_address INET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_sessions_user_active ON global.sessions (user_id, expires_at) WHERE revoked_at IS NULL;
COMMENT ON TABLE global.sessions IS 'Active user session digests. Raw cookie tokens are never stored in plaintext';
