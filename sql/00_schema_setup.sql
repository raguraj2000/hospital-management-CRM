-- ==============================================================================
-- 00_schema_setup.sql
-- Create segregated PostgreSQL schemas for tenant isolation and clean separation
-- ==============================================================================

-- 1. Schema: global
-- Purpose: Platform-wide identity, organization tenants, licensing, and shared security
CREATE SCHEMA IF NOT EXISTS global;
COMMENT ON SCHEMA global IS 'Platform-level governance, organization tenants, global user identities, session digests, and generic authorization';

-- 2. Schema: master
-- Purpose: Reusable reference data, country/state codes, UOM, lab catalog, and GST tax codes
CREATE SCHEMA IF NOT EXISTS master;
COMMENT ON SCHEMA master IS 'Reusable, read-mostly reference data, standard laboratory test directories, measurement units, and statutory GST tax schedules';

-- 3. Schema: public
-- Purpose: Operational multi-tenant business data (patients, visits, prescriptions, pharmacy, billing, inventory)
CREATE SCHEMA IF NOT EXISTS public;
COMMENT ON SCHEMA public IS 'Operational clinic records, outpatient encounters, treatments, FEFO inventory stock, and patient invoicing';

-- 4. Schema: staging
-- Purpose: Temporary ingestion, bulk imports, spreadsheet parsing, and pre-validation records
CREATE SCHEMA IF NOT EXISTS staging;
COMMENT ON SCHEMA staging IS 'Temporary staging tables for vendor invoice Excel uploads, inventory catalog imports, and pre-commit data validation';
