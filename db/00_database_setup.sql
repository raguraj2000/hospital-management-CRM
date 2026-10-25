-- ==============================================================================
-- 00_database_setup.sql
-- Database creation guidelines, encoding, and connection settings for HMS
-- ==============================================================================

-- Create the database with UTF-8 encoding and standard ICU/C collation
-- Note: In managed environments (AWS RDS, Supabase, Azure), create database is executed out-of-band.
-- CREATE DATABASE hms_enterprise
--     WITH 
--     OWNER = postgres
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'en_US.UTF-8'
--     LC_CTYPE = 'en_US.UTF-8'
--     TEMPLATE = template0;

-- Configuration recommendations for multi-tenant high-throughput transaction processing
ALTER SYSTEM SET standard_conforming_strings = 'on';
ALTER SYSTEM SET timezone = 'Asia/Kolkata'; -- Indian Standard Time (IST) convention
ALTER SYSTEM SET client_encoding = 'UTF8';
ALTER SYSTEM SET default_transaction_isolation = 'read committed';

-- Ensure connection search path resolves global, master, and public predictably
ALTER DATABASE CURRENT_DATABASE() SET search_path TO public, master, global;
