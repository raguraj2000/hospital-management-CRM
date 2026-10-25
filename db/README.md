# HMS PostgreSQL Enterprise Database Architecture

## 1. Overview & Architecture
This directory contains the standalone, normalized, enterprise-grade PostgreSQL DDL for the Hospital Management Software (HMS), converted from the embedded SQLite prototype.

### Schema Segregation
- **`global`**: Multi-tenant platform identity, organization tenants, global users, session security, and the generic user-wise scoped RBAC engine.
- **`master`**: Standardized reusable reference directories (countries, states with 2-digit GST state codes, HSN/SAC classifications, UOM units, statutory effective-dated GST rates, and laboratory test templates).
- **`public`**: Operational healthcare business transactions, physical branches, regions, inventory locations, patient records, outpatient visits, clinical prescriptions, laboratory orders, pharmacy sales, and GST-compliant patient invoices.
- **`staging`**: High-throughput temporary staging tables for bulk Excel/spreadsheet uploads (inventory lots, distributor purchase bills) supporting idempotent ingestion and pre-commit validation.

---

## 2. Organization Hierarchy: Regions & Inventory Locations
The onboarding hierarchy follows:
$$\text{Organization} \longrightarrow \text{Regions} \longleftrightarrow \text{Inventory Locations}$$
- An **Organization** owns multiple physical/administrative **Regions** (`public.regions`).
- An **Organization** owns multiple **Inventory Locations** (`public.inventory_locations`, e.g., Central Warehouse, Emergency Floor Kit, Retail Pharmacy).
- The junction table `public.region_inventory` establishes a **Many-to-Many** relationship, allowing a single inventory location to serve multiple clinical regions without duplicating physical stock.
- **Relational Invariant Enforcement:** `region_inventory` uses composite foreign keys `(region_id, company_id)` and `(inventory_id, company_id)` referencing composite unique keys on `regions` and `inventory_locations`. This guarantees that a region and inventory location linked together *must* belong to the exact same organization.

---

## 3. Generic User-Wise Authorization Engine
Authorization is decoupled from hardcoded strings using four tiers:
1. **Permissions (`global.permissions`):** Atomic action strings (e.g., `patient.create`, `lab.correct`, `billing.receive`).
2. **Roles (`global.roles` & `global.role_permissions`):** Bundled privilege sets.
3. **Scoped User Roles (`global.user_roles`):** Assigns a user to a role with hierarchical resource scoping (`company_id`, `branch_id`, `region_id`, `inventory_id`).
4. **User Permission Overrides (`global.user_permission_overrides`):** User-specific explicit `is_granted` (Allow/Deny) overrides.
   - **Deterministic Precedence:** Explicit Deny (`is_granted = false`) > Explicit Grant (`is_granted = true`) > Resource-Scoped Role Grant > Organization-Wide Role Grant.

---

## 4. Statutory GST & Financial Immutability
- **Monetary Unit:** All financial figures are stored as integer `paise` (1 INR = 100 paise) across all transactions to prevent floating-point rounding errors.
- **Place of Supply Resolution:** Handled via `public.fn_calculate_gst(...)`. If the seller state code matches the place of supply state code, Intra-state GST (CGST + SGST/UTGST) is charged; otherwise, Inter-state GST (IGST) applies.
- **Historical Immutability:** Stored on `public.invoice_tax_lines` and `public.purchase_invoice_tax_lines`. Once an invoice is finalized or payment is recorded, trigger `trg_invoice_immutability` blocks all updates and deletes. Adjustments require formal Credit/Debit Notes (`public.credit_debit_notes`).

---

## 5. Execution & Deployment Procedure
All files are organized individually and must be executed in dependency order. Refer to [`MANIFEST.md`](MANIFEST.md) for the exact script execution sequence.
