#!/usr/bin/env python3
"""
================================================================================
Database Initialization & Ordered SQL Executor for HMS
Database Name: hospital_management_system
================================================================================
This script automates the complete provisioning of the PostgreSQL database:
1. Connects to PostgreSQL maintenance instance (default: 'postgres').
2. Creates the dedicated PostgreSQL admin user for this database.
3. Creates the target database 'hospital_management_system' with UTF-8 encoding.
4. Grants complete ownership and privileges on the database to the admin user.
5. Connects to 'hospital_management_system' and executes all 82 SQL files in
   strict numerical sequence matching sql/MANIFEST.md.
6. Grants full schema, table, sequence, and function privileges across all
   schemas (global, master, public, staging) to the dedicated admin user.
7. Provisions the platform application administrator in 'global.users'.
8. Runs schema integrity verification and displays a complete summary report.
================================================================================
"""

import argparse
import getpass
import hashlib
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

# Default Configurations
DEFAULT_DB_NAME = "hospital_management_system"
DEFAULT_ADMIN_USER = "hms_admin"
DEFAULT_ADMIN_PASSWORD = "Admin@123"
DEFAULT_APP_ADMIN_USER = "admin"
DEFAULT_APP_ADMIN_MOBILE = "+919999999999"
DEFAULT_APP_ADMIN_NAME = "System Administrator"
DEFAULT_APP_ADMIN_PASSWORD = "Admin@123456"

# All 82 SQL files in exact dependency sequence matching sql/MANIFEST.md
MANIFEST_ORDERED_SQL_FILES = [
    # Phase 1: Environment & Schemas
    "00_database_setup.sql",
    "00_schema_setup.sql",
    "01_extensions.sql",
    # Phase 2: Global Schema (Platform & Security)
    "global/organizations.sql",
    "global/organization_plans.sql",
    "global/platform_payments.sql",
    "global/org_counters.sql",
    "global/users.sql",
    "global/sessions.sql",
    "global/permissions.sql",
    "global/roles.sql",
    "global/role_permissions.sql",
    "global/organization_memberships.sql",
    "global/user_roles.sql",
    "global/user_permission_overrides.sql",
    # Phase 3: Master Schema (Statutory Reference & Standards)
    "master/countries.sql",
    "master/states.sql",
    "master/uom_codes.sql",
    "master/payment_methods.sql",
    "master/hsn_sac_codes.sql",
    "master/gst_tax_codes.sql",
    "master/gst_rates.sql",
    "master/lab_catalog.sql",
    "master/lab_parameters.sql",
    # Phase 4: Public Schema (Hierarchy, Operations & Clinical)
    "public/regions.sql",
    "public/inventory_locations.sql",
    "public/region_inventory.sql",
    "public/branches.sql",
    "public/branch_doctors.sql",
    "public/branch_counters.sql",
    "public/clinic_settings.sql",
    "public/patients.sql",
    "public/op_visits.sql",
    "public/medicines.sql",
    "public/inventory_batches.sql",
    "public/inventory_movements.sql",
    "public/prescription_items.sql",
    "public/prescription_notes.sql",
    "public/treatment_doses.sql",
    "public/treatment_bookmarks.sql",
    "public/treatment_bookmark_lines.sql",
    "public/visit_instructions.sql",
    "public/treatment_courses.sql",
    "public/course_sittings.sql",
    "public/course_items.sql",
    "public/course_templates.sql",
    "public/lab_tests.sql",
    "public/lab_test_parameters.sql",
    "public/lab_packages.sql",
    "public/lab_orders.sql",
    "public/lab_results.sql",
    "public/lab_releases.sql",
    "public/pharmacy_sales.sql",
    "public/pharmacy_sale_lines.sql",
    "public/vendors.sql",
    "public/purchase_invoices.sql",
    "public/purchase_invoice_lines.sql",
    "public/purchase_invoice_tax_lines.sql",
    "public/vendor_payments.sql",
    "public/expenses.sql",
    "public/invoices.sql",
    "public/invoice_lines.sql",
    "public/invoice_tax_lines.sql",
    "public/invoice_payments.sql",
    "public/credit_debit_notes.sql",
    "public/visit_charges.sql",
    "public/audit_logs.sql",
    # Phase 5: Staging Schema
    "staging/inventory_import_batches.sql",
    "staging/inventory_import_rows.sql",
    "staging/vendor_invoice_imports.sql",
    "staging/vendor_invoice_import_rows.sql",
    # Phase 6: Functions, Triggers, Views, Indexes, Seeds & Tests
    "functions/fn_authorize_user.sql",
    "functions/fn_calculate_gst.sql",
    "functions/fn_next_sequence_val.sql",
    "triggers/trg_update_timestamp.sql",
    "triggers/trg_enforce_invoice_immutability.sql",
    "views/vw_available_stock.sql",
    "views/vw_gst_sales_summary.sql",
    "views/vw_user_permissions.sql",
    "indexes/01_company_region_inventory_indexes.sql",
    "seeds/01_reference_seeds.sql",
    "validation/test_schema_integrity.sql",
]


# ==============================================================================
# Helper: Password Hashing (Matching packages/core and src/core/security.py)
# ==============================================================================
def hash_app_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA512 matching HMS application format."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha512", password.encode("utf-8"), salt, 100000, dklen=64)
    return f"{salt.hex()}:{key.hex()}"


# ==============================================================================
# Helper: Environment & Connection Parser
# ==============================================================================
def load_env_file(filepath: Path) -> Dict[str, str]:
    """Simple parser for .env files without requiring third-party libraries."""
    env_vars: Dict[str, str] = {}
    if not filepath.exists():
        return env_vars
    try:
        with open(filepath, "r", encoding="utf-8-sig") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                env_vars[key] = val
    except Exception:
        pass
    return env_vars


def parse_database_url(url: str) -> Dict[str, Any]:
    """Extracts host, port, user, password, and dbname from a database URL."""
    # Clean scheme (e.g. postgresql+asyncpg:// -> postgresql://)
    if "://" in url:
        scheme, rest = url.split("://", 1)
        url = f"postgresql://{rest}"
    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "user": parsed.username or "postgres",
        "password": parsed.password or "postgres",
        "dbname": parsed.path.lstrip("/") or "postgres",
    }


def find_sql_directory() -> Path:
    """Locates the 'db' or 'sql' directory relative to script or current directory."""
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "db",
        Path(__file__).resolve().parent.parent / "db",
        Path(__file__).resolve().parent / "db",
        Path.cwd() / "db",
        Path.cwd().parent / "db",
        Path(__file__).resolve().parent.parent.parent / "sql",
        Path(__file__).resolve().parent.parent / "sql",
        Path(__file__).resolve().parent / "sql",
        Path.cwd() / "sql",
        Path.cwd().parent / "sql",
    ]
    for candidate in candidates:
        if candidate.is_dir() and (candidate / "00_schema_setup.sql").exists():
            return candidate
    raise FileNotFoundError("Could not find the 'db' or 'sql' directory with schema files.")


def get_ordered_sql_files(sql_dir: Path) -> List[str]:
    """Loads file list from sql/MANIFEST.md or falls back to embedded list."""
    manifest_path = sql_dir / "MANIFEST.md"
    if manifest_path.exists():
        extracted = []
        with open(manifest_path, "r", encoding="utf-8-sig") as f:
            for line in f:
                match = re.match(r"^\s*\d+\.\s+[`'\"]?([^`'\"]+\.sql)[`'\"]?", line)
                if match:
                    extracted.append(match.group(1).strip().replace("\\", "/"))
        if extracted:
            return extracted
    return MANIFEST_ORDERED_SQL_FILES


# ==============================================================================
# Database Driver Adapter (Supports psycopg2, psycopg 3, or psql CLI)
# ==============================================================================
class PostgresConnection:
    """Wrapper that abstracts psycopg2 and psycopg v3 connections."""

    def __init__(self, conn: Any, is_v3: bool = False):
        self.conn = conn
        self.is_v3 = is_v3

    def cursor(self) -> Any:
        return self.conn.cursor()

    def commit(self) -> None:
        self.conn.commit()

    def rollback(self) -> None:
        self.conn.rollback()

    def close(self) -> None:
        self.conn.close()

    def set_autocommit(self, value: bool) -> None:
        if self.is_v3:
            self.conn.autocommit = value
        else:
            self.conn.autocommit = value


def get_pg_driver():
    """Detects and returns available PostgreSQL driver module."""
    try:
        import psycopg2
        import psycopg2.extensions
        return "psycopg2", psycopg2
    except ImportError:
        pass

    try:
        import psycopg
        return "psycopg", psycopg
    except ImportError:
        pass

    return None, None


def connect_postgres(
    host: str,
    port: int,
    user: str,
    password: Optional[str],
    dbname: str,
    autocommit: bool = False,
) -> PostgresConnection:
    """Establishes connection to PostgreSQL using psycopg2 or psycopg v3."""
    driver_name, driver = get_pg_driver()
    if driver is None:
        raise RuntimeError(
            "No PostgreSQL driver found. Please install psycopg2-binary or psycopg:\n"
            "    pip install psycopg2-binary\n"
            "or: pip install psycopg[binary]"
        )

    if driver_name == "psycopg2":
        conn = driver.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname,
        )
        wrapped = PostgresConnection(conn, is_v3=False)
        wrapped.set_autocommit(autocommit)
        return wrapped
    else:
        conn = driver.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname,
            autocommit=autocommit,
        )
        return PostgresConnection(conn, is_v3=True)


# ==============================================================================
# Core Operations
# ==============================================================================
def create_database_and_admin_user(
    host: str,
    port: int,
    conn_user: str,
    conn_pass: Optional[str],
    maint_db: str,
    target_db: str,
    admin_user: str,
    admin_pass: str,
    recreate: bool = False,
) -> None:
    """
    Connects to the maintenance database, creates the dedicated admin user,
    and creates the target database 'hospital_management_system'.
    """
    print(f"\n[1/5] Connecting to maintenance database '{maint_db}' on {host}:{port} as '{conn_user}'...")
    conn = connect_postgres(host, port, conn_user, conn_pass, maint_db, autocommit=True)

    try:
        with conn.cursor() as cur:
            # 1. Create or update dedicated admin user for this database
            print(f" -> Ensuring dedicated database admin user '{admin_user}' exists...")
            cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s;", (admin_user,))
            if cur.fetchone() is None:
                # Role does not exist, create it
                cur.execute(f'CREATE ROLE "{admin_user}" WITH LOGIN PASSWORD %s CREATEDB;', (admin_pass,))
                print(f"    ✓ Role '{admin_user}' created with LOGIN and CREATEDB permissions.")
            else:
                # Update password
                cur.execute(f'ALTER ROLE "{admin_user}" WITH LOGIN PASSWORD %s CREATEDB;', (admin_pass,))
                print(f"    ✓ Role '{admin_user}' password and attributes updated.")

            # 2. Check if target database exists
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (target_db,))
            exists = cur.fetchone() is not None

            if exists and recreate:
                print(f" -> Recreate flag specified: dropping existing database '{target_db}'...")
                # Terminate active sessions
                cur.execute(
                    """
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = %s
                      AND pid <> pg_backend_pid();
                    """,
                    (target_db,),
                )
                cur.execute(f'DROP DATABASE IF EXISTS "{target_db}";')
                print(f"    ✓ Dropped database '{target_db}'.")
                exists = False

            # 3. Create database if it does not exist
            if not exists:
                print(f" -> Creating database '{target_db}' (UTF-8, Owner: '{admin_user}')...")
                cur.execute(f'CREATE DATABASE "{target_db}" WITH OWNER = "{admin_user}" ENCODING = \'UTF8\';')
                print(f"    ✓ Database '{target_db}' created successfully.")
            else:
                print(f"    ✓ Database '{target_db}' already exists. Proceeding with schema setup.")

            # 4. Grant privileges and set ownership
            cur.execute(f'GRANT ALL PRIVILEGES ON DATABASE "{target_db}" TO "{admin_user}";')
            cur.execute(f'ALTER DATABASE "{target_db}" OWNER TO "{admin_user}";')
            print(f"    ✓ Full ownership and privileges on '{target_db}' granted to '{admin_user}'.")

    finally:
        conn.close()


def prepare_sql_content(filename: str, content: str, db_name: str) -> str:
    """
    Applies compatibility adjustments:
    - Strips UTF-8 BOM if present
    - Replaces CURRENT_DATABASE() with target db name
    - Converts ALTER SYSTEM commands to ALTER DATABASE so they apply locally to the DB
      and run without requiring server-level superuser or modifying global postgresql.auto.conf
    """
    content = content.lstrip("\ufeff").strip()
    if filename.endswith("00_database_setup.sql"):
        # Fix: ALTER DATABASE CURRENT_DATABASE() SET ... -> ALTER DATABASE "hospital_management_system" SET ...
        content = re.sub(
            r"ALTER\s+DATABASE\s+CURRENT_DATABASE\(\)\s+SET",
            f'ALTER DATABASE "{db_name}" SET',
            content,
            flags=re.IGNORECASE,
        )
        # Convert ALTER SYSTEM SET -> ALTER DATABASE "<db_name>" SET
        content = re.sub(
            r"ALTER\s+SYSTEM\s+SET",
            f'ALTER DATABASE "{db_name}" SET',
            content,
            flags=re.IGNORECASE,
        )
    return content


def execute_sql_files(
    host: str,
    port: int,
    user: str,
    password: Optional[str],
    db_name: str,
    sql_dir: Path,
    file_list: List[str],
    skip_seeds: bool = False,
    skip_validation: bool = False,
) -> None:
    """
    Connects to the newly created database and executes all SQL files in order.
    """
    print(f"\n[2/5] Connecting to target database '{db_name}' on {host}:{port}...")
    conn = connect_postgres(host, port, user, password, db_name, autocommit=False)

    try:
        # Pre-set search path and session settings
        with conn.cursor() as cur:
            cur.execute("SET search_path TO public, master, global;")
            cur.execute("SET timezone = 'Asia/Kolkata';")
            cur.execute("SET standard_conforming_strings = 'on';")
            cur.execute("SET client_encoding = 'UTF8';")
        conn.commit()

        total = len(file_list)
        print(f"\n[3/5] Executing {total} SQL files in dependency sequence from '{sql_dir}'...\n")

        success_count = 0
        start_time = time.time()

        for idx, rel_file in enumerate(file_list, 1):
            file_path = sql_dir / rel_file

            if skip_seeds and "seeds/" in rel_file:
                print(f" [{idx:02d}/{total:02d}] ⏭️  Skipping seed: {rel_file}")
                continue

            if skip_validation and "validation/" in rel_file:
                print(f" [{idx:02d}/{total:02d}] ⏭️  Skipping validation: {rel_file}")
                continue

            if not file_path.exists():
                raise FileNotFoundError(f"Missing required SQL file: {file_path}")

            with open(file_path, "r", encoding="utf-8-sig") as f:
                raw_sql = f.read()

            sql_to_run = prepare_sql_content(rel_file, raw_sql, db_name)
            if not sql_to_run:
                print(f" [{idx:02d}/{total:02d}] ⏭️  Skipping empty file: {rel_file}")
                continue

            # In 00_database_setup.sql, run in autocommit mode for immediate DDL catalog updates
            is_setup_script = rel_file.endswith("00_database_setup.sql")
            if is_setup_script:
                conn.set_autocommit(True)

            t0 = time.time()
            try:
                with conn.cursor() as cur:
                    cur.execute(sql_to_run)

                if not is_setup_script:
                    conn.commit()

                elapsed = time.time() - t0
                print(f" [{idx:02d}/{total:02d}] ✓ {rel_file:<45} ({elapsed:.3f}s)")
                success_count += 1

            except Exception as e:
                if not is_setup_script:
                    conn.rollback()
                print(f"\n❌ ERROR in file [{idx:02d}/{total:02d}] {rel_file}:")
                print(f"   {e}")
                raise RuntimeError(f"Execution failed on file: {rel_file}") from e
            finally:
                if is_setup_script:
                    conn.set_autocommit(False)

        total_elapsed = time.time() - start_time
        print(f"\n ✓ Successfully executed {success_count} SQL files in {total_elapsed:.2f} seconds.")

    finally:
        conn.close()


def configure_admin_permissions(
    host: str,
    port: int,
    user: str,
    password: Optional[str],
    db_name: str,
    admin_user: str,
) -> None:
    """
    Grants complete permissions across all 4 schemas (global, master, public, staging)
    to the dedicated database admin user.
    """
    print(f"\n[4/5] Configuring schema grants and default privileges for '{admin_user}'...")
    conn = connect_postgres(host, port, user, password, db_name, autocommit=True)

    try:
        with conn.cursor() as cur:
            schemas = ["global", "master", "public", "staging"]
            for schema in schemas:
                # 1. Schema usage and creation
                cur.execute(f'GRANT USAGE, CREATE ON SCHEMA "{schema}" TO "{admin_user}";')
                # 2. Existing objects
                cur.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema}" TO "{admin_user}";')
                cur.execute(f'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "{schema}" TO "{admin_user}";')
                cur.execute(f'GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA "{schema}" TO "{admin_user}";')
                # 3. Default privileges for future objects created in this schema
                cur.execute(
                    f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema}" GRANT ALL ON TABLES TO "{admin_user}";'
                )
                cur.execute(
                    f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema}" GRANT ALL ON SEQUENCES TO "{admin_user}";'
                )
                cur.execute(
                    f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema}" GRANT ALL ON ROUTINES TO "{admin_user}";'
                )

            print(f"    ✓ All privileges on schemas ({', '.join(schemas)}) assigned to '{admin_user}'.")
            print(f"    ✓ Default table, sequence, and function privileges configured.")

    finally:
        conn.close()


def provision_platform_admin_user(
    host: str,
    port: int,
    user: str,
    password: Optional[str],
    db_name: str,
    username: str = DEFAULT_APP_ADMIN_USER,
    mobile: str = DEFAULT_APP_ADMIN_MOBILE,
    name: str = DEFAULT_APP_ADMIN_NAME,
    plain_password: str = DEFAULT_APP_ADMIN_PASSWORD,
) -> None:
    """
    Provisions or verifies the application platform administrator in global.users.
    """
    conn = connect_postgres(host, port, user, password, db_name, autocommit=True)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, username, mobile FROM global.users WHERE username = %s OR mobile = %s;", (username, mobile))
            existing = cur.fetchone()
            if existing:
                print(f"    ✓ Application admin user '{username}' already present (ID: {existing[0]}).")
            else:
                pw_hash = hash_app_password(plain_password)
                cur.execute(
                    """
                    INSERT INTO global.users (
                        mobile, username, name, password_hash, is_platform_admin, is_active
                    ) VALUES (%s, %s, %s, %s, true, true)
                    RETURNING id;
                    """,
                    (mobile, username, name, pw_hash),
                )
                user_id = cur.fetchone()[0]
                print(f"    ✓ Application platform administrator created (ID: {user_id}, Username: '{username}', Mobile: '{mobile}').")
    finally:
        conn.close()


def print_database_summary(
    host: str,
    port: int,
    user: str,
    password: Optional[str],
    db_name: str,
    admin_user: str,
    admin_pass: str,
) -> None:
    """
    Prints a formatted summary table of all schemas and tables created.
    """
    print(f"\n[5/5] Verifying database structure and statistics...")
    conn = connect_postgres(host, port, user, password, db_name, autocommit=True)

    try:
        with conn.cursor() as cur:
            # Query table counts per schema
            cur.execute(
                """
                SELECT table_schema, count(*) as count
                FROM information_schema.tables
                WHERE table_schema IN ('global', 'master', 'public', 'staging')
                  AND table_type = 'BASE TABLE'
                GROUP BY table_schema
                ORDER BY table_schema;
                """
            )
            table_stats = cur.fetchall()

            # Query views count
            cur.execute(
                """
                SELECT count(*) 
                FROM information_schema.views 
                WHERE table_schema IN ('global', 'master', 'public', 'staging');
                """
            )
            views_count = cur.fetchone()[0]

            # Query routines count
            cur.execute(
                """
                SELECT count(*) 
                FROM information_schema.routines 
                WHERE routine_schema IN ('global', 'master', 'public', 'staging');
                """
            )
            routines_count = cur.fetchone()[0]

            print("\n" + "=" * 70)
            print("                 HOSPITAL MANAGEMENT SYSTEM")
            print("            DATABASE PROVISIONING SUMMARY REPORT")
            print("=" * 70)
            print(f" Database Name     : {db_name}")
            print(f" PostgreSQL Host   : {host}:{port}")
            print(f" Dedicated Admin   : {admin_user}")
            print(f" Admin Password    : {admin_pass}")
            print("-" * 70)
            print(" Schema Breakdown  :")
            total_tables = 0
            for schema, count in table_stats:
                total_tables += count
                print(f"   • {schema:<15} : {count} tables")
            print(f"   • Total Tables    : {total_tables}")
            print(f"   • Total Views     : {views_count}")
            print(f"   • Total Functions : {routines_count}")
            print("-" * 70)
            print(" Application Administrator (global.users):")
            print(f"   • Username        : {DEFAULT_APP_ADMIN_USER}")
            print(f"   • Mobile          : {DEFAULT_APP_ADMIN_MOBILE}")
            print(f"   • Default Password: {DEFAULT_APP_ADMIN_PASSWORD}")
            print("-" * 70)
            print(" Connection Strings:")
            print(f"   • AsyncPG (FastAPI):")
            print(f"     postgresql+asyncpg://{admin_user}:{admin_pass}@{host}:{port}/{db_name}")
            print(f"   • Psycopg2 / Direct:")
            print(f"     postgresql://{admin_user}:{admin_pass}@{host}:{port}/{db_name}")
            print(f"   • CLI psql:")
            print(f"     psql -h {host} -p {port} -U {admin_user} -d {db_name}")
            print("=" * 70 + "\n")

    finally:
        conn.close()


# ==============================================================================
# CLI Entry Point
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Provision the 'hospital_management_system' PostgreSQL database and execute all 82 SQL files in order."
    )
    # Database connection parameters
    parser.add_argument("--host", default=None, help="PostgreSQL host (default: from .env or localhost)")
    parser.add_argument("--port", type=int, default=None, help="PostgreSQL port (default: from .env or 5432)")
    parser.add_argument("-U", "--user", default=None, help="Superuser / Connecting role (default: from .env or postgres)")
    parser.add_argument("-W", "--password", default=None, help="Superuser / Connecting password")
    parser.add_argument("--maintenance-db", default="postgres", help="Maintenance DB to connect for creation (default: postgres)")
    parser.add_argument("--db-name", default=DEFAULT_DB_NAME, help=f"Target database name (default: {DEFAULT_DB_NAME})")

    # Dedicated Database Admin User
    parser.add_argument("--admin-user", default=DEFAULT_ADMIN_USER, help=f"Dedicated DB admin username (default: {DEFAULT_ADMIN_USER})")
    parser.add_argument("--admin-password", default=DEFAULT_ADMIN_PASSWORD, help=f"Dedicated DB admin password (default: {DEFAULT_ADMIN_PASSWORD})")

    # Options
    parser.add_argument("--sql-dir", default=None, help="Directory containing the SQL files (default: auto-detected ./sql)")
    parser.add_argument("--recreate", action="store_true", help="Drop and recreate the database if it already exists")
    parser.add_argument("--skip-seeds", action="store_true", help="Skip seed data execution (seeds/01_reference_seeds.sql)")
    parser.add_argument("--skip-validation", action="store_true", help="Skip schema validation execution")

    args = parser.parse_args()

    # Load from .env if available
    root_dir = Path(__file__).resolve().parent.parent
    env_file = root_dir / ".env"
    env_vars = load_env_file(env_file)

    parsed_url_info: Dict[str, Any] = {}
    if "DATABASE_URL" in env_vars:
        parsed_url_info = parse_database_url(env_vars["DATABASE_URL"])

    host = args.host or os.getenv("PGHOST") or parsed_url_info.get("host") or "localhost"
    port = args.port or (int(os.getenv("PGPORT")) if os.getenv("PGPORT") else None) or parsed_url_info.get("port") or 5432
    conn_user = args.user or os.getenv("PGUSER") or parsed_url_info.get("user") or "postgres"
    conn_pass = args.password or os.getenv("PGPASSWORD") or parsed_url_info.get("password") or "postgres"

    # Find SQL directory
    if args.sql_dir:
        sql_dir = Path(args.sql_dir).resolve()
    else:
        sql_dir = find_sql_directory()

    ordered_files = get_ordered_sql_files(sql_dir)

    print("=" * 70)
    print(" HMS POSTGRESQL DATABASE INITIALIZER & ORDERED SQL RUNNER")
    print("=" * 70)
    print(f" Target Database : {args.db_name}")
    print(f" Dedicated Admin : {args.admin_user}")
    print(f" SQL Directory   : {sql_dir}")
    print(f" Total SQL Files : {len(ordered_files)}")
    print("=" * 70)

    # Step 1: Create DB & Dedicated Admin User
    create_database_and_admin_user(
        host=host,
        port=port,
        conn_user=conn_user,
        conn_pass=conn_pass,
        maint_db=args.maintenance_db,
        target_db=args.db_name,
        admin_user=args.admin_user,
        admin_pass=args.admin_password,
        recreate=args.recreate,
    )

    # Step 2 & 3: Connect to new DB and execute all SQL files in order
    execute_sql_files(
        host=host,
        port=port,
        user=conn_user,
        password=conn_pass,
        db_name=args.db_name,
        sql_dir=sql_dir,
        file_list=ordered_files,
        skip_seeds=args.skip_seeds,
        skip_validation=args.skip_validation,
    )

    # Step 4: Configure grants for dedicated admin user
    configure_admin_permissions(
        host=host,
        port=port,
        user=conn_user,
        password=conn_pass,
        db_name=args.db_name,
        admin_user=args.admin_user,
    )

    # Step 4b: Ensure application admin user in global.users
    provision_platform_admin_user(
        host=host,
        port=port,
        user=conn_user,
        password=conn_pass,
        db_name=args.db_name,
    )

    # Step 5: Verification & Summary
    print_database_summary(
        host=host,
        port=port,
        user=conn_user,
        password=conn_pass,
        db_name=args.db_name,
        admin_user=args.admin_user,
        admin_pass=args.admin_password,
    )


if __name__ == "__main__":
    main()
