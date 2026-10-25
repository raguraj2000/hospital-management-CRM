-- ==============================================================================
-- 01_extensions.sql
-- Required PostgreSQL extensions for UUIDs, encryption, and indexing
-- ==============================================================================

-- pgcrypto: Provides cryptographic hash functions (sha256, scrypt, gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- uuid-ossp: Standard UUID generator utilities
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- citext: Case-insensitive character string type for emails and unique usernames
CREATE EXTENSION IF NOT EXISTS "citext";

-- btree_gist: Enables advanced multi-column exclusion constraints (useful for overlapping fee slots or appointment schedules)
CREATE EXTENSION IF NOT EXISTS "btree_gist";
