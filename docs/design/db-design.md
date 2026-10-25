# GEMINI MASTER PROMPT — HMS POSTGRESQL DATABASE ARCHITECTURE & SQL FILE GENERATION

## 1. ROLE

Act as a Principal PostgreSQL Database Architect, Healthcare Domain Data Modeler, Multi-Tenant SaaS Architect, GST Billing Specialist, Security Architect, and Database Migration Engineer.

You are working on my existing project:

**Project:** HMS — Hospital Management Software  
**Requirements source:** `HMS_MASTER_SPECIFICATION_BRD_FRD.md`  
**Target database:** PostgreSQL  
**Output directory:** `sql/` at the HMS project root

Your responsibility is to analyze the BRD/FRD thoroughly, design a normalized, reusable, secure, extensible PostgreSQL database architecture, and create the actual SQL files in the workspace.

Do not merely explain what should be done. Inspect the available project and requirements, then create the requested files.

## 2. PRIMARY OBJECTIVES

Complete all the following objectives:

1. Extract every table, field, constraint, relationship, index, and database requirement from the BRD/FRD.
2. Inspect the existing HMS source code and database definitions if they are available.
3. Reconcile the requirements against the actual codebase and document any discrepancies.
4. Design the complete PostgreSQL database schema for all implemented and specified modules.
5. Create a separate `.sql` file for EVERY table.
6. Create and use the PostgreSQL schemas `global`, `master`, `public`, and `staging`.
7. Support the organization → region → inventory onboarding structure.
8. Implement a generic, extensible, user-specific authorization and privilege model.
9. Extend purchasing and billing to support GST calculations, invoices, tax breakdowns, payments, credit notes, and financial auditability.
10. Generate dependency-ordered SQL scripts that can be reviewed and executed safely.
11. Create documentation, a complete table inventory, a relationship map, and a deployment manifest.

The final deliverable must be a real collection of SQL files in `sql/`, not a single SQL script containing every table.

## 3. SOURCE-OF-TRUTH RULES

Before designing anything, inspect the full contents of `HMS_MASTER_SPECIFICATION_BRD_FRD.md`.

If the HMS source code is available, inspect:
- Existing database schema definitions
- ORM models and migrations
- API handlers and services
- Shared domain types and validation schemas
- Authentication and authorization implementations
- Billing, pharmacy, inventory, and procurement logic
- Existing database constraints and indexes

Use the following evidence hierarchy:

1. Explicit business and functional requirements in the BRD/FRD
2. Verified existing application behavior
3. Existing database definitions and relationships
4. Clearly documented architectural recommendations where requirements are incomplete

Do not silently discard existing requirements.

The specification describes a SQLite/LibSQL database, while the requested target is PostgreSQL. Translate the design into native PostgreSQL constructs instead of copying SQLite syntax.

Important: the specification's overview claims 33 relational tables, but its detailed dictionary contains more individual table definitions than that headline suggests. Reconcile the entire dictionary and count the actual distinct tables. Do not use the headline count as the target table count.

Preserve all documented business requirements, including:
- Multi-tenant organization and branch isolation
- Globally unique organization-level patient UHIDs
- Branch-scoped daily OP and invoice numbering
- Authentication and session management
- Clinical records and patient lifecycle
- Prescriptions and nursing dose schedules
- Laboratory tests, results, and correction history
- FEFO pharmacy dispensing and inventory batches
- Vendor procurement and supplier payments
- Patient invoices and payment collection
- Multi-day treatment courses
- Subscription and platform administration
- Audit logging
- Offline/on-premises operational requirements

If a requirement is ambiguous, record the ambiguity in the documentation and choose a defensible, clearly identified design proposal without pretending it was explicitly specified.

## 4. CREATE THE DIRECTORY STRUCTURE

Create this directory at the project root:

`sql/`

Organize the output as follows:

sql/
- 00_database_setup.sql
- 00_schema_setup.sql
- 01_extensions.sql
- README.md
- TABLE_INVENTORY.md
- RELATIONSHIP_MAP.md
- MIGRATION_NOTES.md
- VALIDATION_CHECKLIST.md
- MANIFEST.md
- global/
- master/
- public/
- staging/
- views/
- functions/
- triggers/
- indexes/
- constraints/
- seeds/
- validation/

Each schema directory must contain individual table definition files.

Example:

sql/global/organizations.sql
sql/global/users.sql
sql/global/sessions.sql

sql/master/medicine_catalog.sql
sql/master/lab_test_catalog.sql
sql/master/gst_tax_codes.sql

sql/public/regions.sql
sql/public/inventories.sql
sql/public/region_inventory.sql
sql/public/patients.sql
sql/public/op_visits.sql
sql/public/invoices.sql
sql/public/invoice_lines.sql
sql/public/invoice_tax_lines.sql
sql/public/audit_log.sql

sql/staging/inventory_import_batches.sql
sql/staging/inventory_import_rows.sql

These filenames are examples. Determine the final table inventory from the requirements and your architecture analysis.

### File-generation rules

- Every table must have its own `.sql` file.
- One table file must define one principal table only.
- Related constraints, indexes, triggers, and functions may be placed in dedicated supporting files when doing so improves dependency management.
- Do not place multiple `CREATE TABLE` definitions in a table-specific file.
- Do not duplicate table definitions across files.
- Fully qualify all table references using the appropriate schema.
- Create schema setup before table creation.
- Use dependency ordering so referenced tables exist before foreign keys are applied.
- Generate a manifest containing every table, schema, file path, and dependency.
- Include a deterministic master execution script or documented ordered execution procedure.
- Make scripts safe to rerun where reasonably possible, without silently masking structural errors.
- Do not use destructive `DROP TABLE`, `DROP SCHEMA CASCADE`, or database-reset operations in the generated setup scripts.

If the workspace already contains a `sql/` directory, inspect its contents before making changes. Preserve existing files and never overwrite existing SQL files without explicit approval. Use a new subdirectory if necessary.

## 5. POSTGRESQL SCHEMA DESIGN

Use PostgreSQL schemas to separate functional responsibilities.

### Schema A: `global`

Purpose: platform-level and cross-organization identity and administration.

Evaluate the need for:
- Organizations
- Organization subscription plans
- Organization subscriptions and payment history
- Global user identities
- Authentication credentials
- Sessions and token digests
- Platform administration
- Organization-level counters
- Global configuration
- Shared identity and tenant mappings

Global users may have memberships across multiple organizations, but a global identity must not automatically grant access to every organization.

Separate platform administrator permissions from hospital and clinical access. A platform administrator must not gain access to patient records merely by having platform-level privileges.

### Schema B: `master`

Purpose: reusable reference data and catalogs.

Evaluate the need for:
- Medicine and product reference catalogs
- Medicine formulations and units
- Laboratory test catalogs
- Laboratory parameter reference definitions
- Standard procedure catalogs
- Measurement units
- Country, state, and district reference data
- Payment mode references
- GST tax codes and effective-dated tax rates
- HSN/SAC reference codes where required
- Other reusable configuration data

Determine whether each master table is genuinely global, tenant-specific, or branch-specific.

Do not make a hospital-specific price, medicine listing, or tax configuration globally shared merely because it is a catalog.

Where organizations need custom entries, support organization-owned or branch-owned catalog records without compromising shared reference data.

### Schema C: `public`

Purpose: operational business data.

Use this schema for tenant-scoped or operational entities where appropriate, including:
- Regions
- Inventory locations
- Region-to-inventory mappings
- Branches and operational memberships if appropriate
- Patients
- OP visits
- Prescriptions and prescription notes
- Treatment doses and courses
- Laboratory orders and results
- Pharmacy sales
- Inventory batches and movements
- Vendors and procurement
- Purchase invoices and supplier payments
- Patient invoices, invoice lines, and payments
- GST invoice snapshots and tax breakdowns
- Expenses
- Branch settings
- Audit events and operational history

Do not blindly move every existing table into `public`. Use `global` and `master` according to their intended responsibilities.

In PostgreSQL, `public` is the conventional default schema. Explicitly qualify references such as `global.organizations` and `public.patients` to prevent search-path ambiguity.

### Schema D: `staging`

Purpose: import, migration, and validation workflows.

Evaluate the need for:
- Inventory import batches and rows
- Vendor purchase invoice import batches and rows
- Spreadsheet upload metadata
- Column mapping configurations
- Import validation errors
- Duplicate detection
- Rejected rows
- Processing status
- Reconciliation reports
- Migration staging records

Staging data must not be treated as approved operational data until validated and promoted through a controlled transaction.

Support idempotent import processing, duplicate detection, error tracking, and reconciliation.

Do not store permanent clinical records in staging simply because they were imported.

## 6. CLIENT ONBOARDING AND ORGANIZATION HIERARCHY

My business onboarding order is:

Organization → Region 1, Region 2, Region N → Inventory 1, Inventory 2, Inventory N.

The relationship requirements are critical:

- One organization can have multiple regions.
- One organization can have multiple inventory locations.
- A region can be associated with multiple inventory locations.
- The same inventory location can be associated with multiple regions.
- Inventory must not be duplicated merely because it serves multiple regions.
- An inventory location must belong to the appropriate organization.
- Region-to-inventory assignments must support activation and deactivation.
- Every operational transaction must be attributable to the correct organization and inventory location where applicable.

Implement a proper many-to-many relationship.

Recommended logical entities:

1. Organization
2. Region
3. Inventory
4. Region-inventory assignment

Use a junction table such as `public.region_inventory`, with:
- Its own primary key if required by the chosen design
- `region_id`
- `inventory_id`
- Assignment status
- Created and updated audit metadata
- Appropriate uniqueness constraints
- Foreign keys

Ensure that a region and its inventory belong to the same organization.

Enforce this invariant using suitable relational constraints, such as composite unique keys and composite foreign keys, or an equally robust design. Do not rely solely on frontend validation.

Define the inventory ownership model explicitly:
- Organization owns inventory locations.
- Regions associate with inventory locations.
- Inventory transactions belong to one inventory location.
- Inventory location access is authorized through explicit organizational and regional assignments.

Also explain whether the existing BRD's `branch` concept represents a physical facility, an operational unit, or an inventory location. Do not silently treat these as interchangeable.

## 7. UNIVERSAL DATABASE DESIGN STANDARDS

Create a reusable, maintainable PostgreSQL design suitable for a multi-tenant healthcare application.

### Naming

- Use lowercase snake_case.
- Use meaningful, consistent table and column names.
- Use plural or singular table names consistently throughout the design.
- Avoid ambiguous abbreviations.
- Use explicit constraint and index names.
- Fully qualify cross-schema foreign keys.

### Primary keys and identifiers

Use a consistent primary-key strategy.

Evaluate `BIGINT GENERATED BY DEFAULT AS IDENTITY` for internal relational identifiers.

Use UUIDs where they provide a genuine benefit, such as public-facing identifiers, distributed integration, or externally generated records.

Do not introduce UUIDs indiscriminately or use public-facing identifiers as a replacement for proper authorization.

Ensure uniqueness for:
- Organization codes
- Region codes within organizations
- Inventory codes within organizations
- Branch identifiers within their owning organizations
- Patient UHIDs within the intended organization
- Branch-scoped invoice numbers
- External integration identifiers where applicable

### Data types

Use appropriate native PostgreSQL types:
- `BIGINT` or `INTEGER` for integer identifiers and counts
- `NUMERIC(p,s)` for exact financial calculations where appropriate
- `DATE` for calendar dates
- `TIMESTAMPTZ` for timestamps
- `BOOLEAN` for flags
- `TEXT` or bounded `VARCHAR` for text
- `JSONB` only when flexible document structures are justified

Use whole paise consistently for existing financial amounts where appropriate, or choose an explicit exact-decimal monetary model for new GST calculations. Document the decision and never mix units silently.

Use constraints for valid quantities, nonnegative amounts, required values, uniqueness, and permitted state transitions where suitable.

Avoid floating-point types for money and tax amounts.

### Audit metadata

Evaluate common fields such as:
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`
- `deleted_at`
- `deleted_by`
- `is_active`
- `version`

Do not add every field to every table automatically. Explain which metadata applies to master records, staging records, clinical transactions, financial records, and junction tables.

Preserve historical records when deletion would damage clinical, inventory, or financial accountability.

### Relationships

- Define explicit foreign keys.
- Add uniqueness constraints for business keys.
- Add indexes for foreign keys and common access patterns where justified.
- Prevent cross-organization references.
- Avoid polymorphic foreign keys that cannot be validated relationally unless the trade-off is explicitly documented.
- Use `ON DELETE RESTRICT` for important financial and clinical history unless a justified alternative exists.
- Use soft deletion only where appropriate.
- Prevent duplicate active assignments and duplicate transaction identifiers.

## 8. GENERIC USER-WISE AUTHORIZATION AND PRIVILEGE MODEL

Design a complete, extensible authorization system that supports role-based and user-specific permissions.

Do not implement authorization using only a hardcoded role name or a boolean administrator flag.

Evaluate these entities:

- Users
- Organizations
- Organization memberships
- Regions
- Inventory locations
- User scope assignments
- Roles
- Permissions
- Role-permission mappings
- User-role assignments
- User-specific permission overrides
- Role scope restrictions
- Session records
- Authorization audit history

The exact names and schemas must be finalized based on the full requirements.

### Permission model

Support granular permissions such as:
- `patient.read`
- `patient.create`
- `patient.update`
- `patient.deactivate`
- `prescription.create`
- `lab.order`
- `lab.result.enter`
- `lab.result.correct`
- `inventory.read`
- `inventory.receive`
- `inventory.transfer`
- `inventory.adjust`
- `billing.invoice.create`
- `billing.payment.receive`
- `billing.invoice.cancel`
- `billing.gst.view`
- `billing.gst.configure`
- `audit.read`
- `authorization.manage`

Treat these as examples, not a complete hardcoded list. Derive the final permission catalog from the BRD/FRD and organize permissions by module, resource, and action.

### Required authorization capabilities

1. One user can belong to multiple organizations.
2. One user can have multiple roles.
3. Roles can be assigned at the appropriate organization, branch, region, or inventory scope.
4. A user can receive explicit permissions independently of role membership.
5. Explicit user-level denies must be enforceable.
6. Permissions must be restricted to the user's active organization and permitted resource scope.
7. A branch or regional assignment must not grant access to unrelated inventories.
8. Role and permission changes must be auditable.
9. Deactivated memberships must immediately stop granting access.
10. Platform administration must remain isolated from patient clinical access.
11. Permission evaluation must have deterministic precedence.
12. The system must support future modules without redesigning the authorization schema.

### Permission evaluation rules

Document an explicit algorithm.

At minimum:
- Validate authenticated identity.
- Resolve the active organization.
- Validate active organization membership.
- Validate branch, region, and inventory scope.
- Resolve active role assignments.
- Evaluate role-derived permissions.
- Apply explicit user-specific overrides.
- Enforce hard security boundaries that cannot be overridden by ordinary permissions.
- Record sensitive authorization changes.

Choose and document the precedence between user-level allows and denies, role permissions, and administrative overrides. Do not leave this ambiguous.

Avoid uncontrolled administrator bypasses. A role or permission must not grant access across tenant boundaries.

Provide sample SQL queries showing how the application can check whether a user has a particular permission for a particular organization and inventory.

## 9. GST AND FINANCIAL AUDITABILITY

Extend the existing HMS billing and procurement requirements to support GST-aware financial transactions in India.

The BRD already describes supplier GSTINs and purchase-line GST percentages, but the target design must evaluate the additional data needed for customer billing, tax calculations, reporting, reconciliation, and auditability.

Do not assume every hospital service or medicine is taxable. Taxability, rates, exemptions, registration status, and invoice requirements must be configurable and verified against the applicable rules before production use.

### A. GST configuration and reference data

Evaluate tables for:
- GST tax codes
- Effective-dated tax rates
- Tax components and treatment
- HSN/SAC codes
- Tax categories and exemptions
- Organization GST registrations
- Branch billing addresses and state codes
- Tax configuration history

Support:
- Taxable and exempt items
- Applicable GST rates
- Intra-state and inter-state transactions
- CGST and SGST or UTGST, as applicable
- IGST, where applicable
- Effective dates for tax-rate changes
- Multiple registrations when legally required
- Configurable inclusive/exclusive tax pricing

Avoid hardcoding GST percentages throughout billing SQL.

### B. Purchase billing

Preserve and extend supplier procurement fields:
- Vendor GSTIN
- Supplier invoice number
- Invoice date
- Place of supply where relevant
- HSN/SAC or applicable classification
- Taxable value
- Tax rates
- CGST amount
- SGST/UTGST amount
- IGST amount
- Cess or additional tax components when applicable
- Discount allocation
- Freight or other charges when relevant
- Gross and net totals
- Amount paid
- Outstanding balance
- Tax invoice reference and reconciliation status

Maintain purchase-line tax snapshots so later changes to master GST rates do not alter historical purchase invoices.

### C. Patient billing

Evaluate extensions or dedicated tables for:
- Invoice header
- Invoice lines
- Invoice line tax breakdowns
- Tax component definitions
- Payments and payment allocations
- Credit notes and debit notes
- Refunds
- Invoice cancellations
- Tax adjustments
- Receipt numbering
- GST reconciliation

Patient invoices should retain:
- Invoice number
- Invoice date
- Organization and branch
- Patient reference where applicable
- Seller registration and address snapshot
- Place of supply
- Item description
- Quantity and unit
- Unit price
- Discount
- Taxable value
- Tax classification and rate
- Tax component amounts
- Rounding adjustment
- Total invoice amount
- Amount paid
- Outstanding balance
- Invoice status
- Original invoice reference for credit/debit notes
- Creation and approval metadata

Where the existing HMS uses paise, preserve the established financial convention and document any required precision for percentage calculations.

### D. GST calculations

Define a documented, deterministic calculation model.

The design must handle:
- Tax-inclusive versus tax-exclusive pricing
- Discounts applied before tax when appropriate
- Correct taxable base calculation
- Intra-state versus inter-state tax allocation
- Rounding at the correct level
- Invoice-level reconciliation
- Credit notes and refunds
- Historical tax-rate snapshots
- Recalculation prevention after invoice finalization

Do not rely on stored grand totals alone. Retain enough line-level and tax-component detail to reproduce and audit the invoice calculation.

Use a defined rounding strategy and validate that line totals, tax totals, payments, credits, and outstanding balances reconcile.

### E. Financial immutability and auditing

Design financial records so that finalized invoices, posted payments, and tax snapshots cannot be silently overwritten.

Use appropriate controls such as:
- Immutable invoice snapshots after posting
- Append-only payment and adjustment records
- Credit notes and reversal transactions
- Controlled cancellation
- Foreign keys to original transactions
- Actor, timestamp, and reason fields
- Audit events for financial mutations
- Idempotency keys for payment operations where appropriate
- Unique invoice and receipt numbers within the required scope

If corrections are permitted, model them as controlled adjustments or reversals instead of silently changing posted amounts.

Document how GST reports can be generated from the stored data and which legal or accounting requirements need professional validation before production.

## 10. AUDIT LOG DESIGN

Create a comprehensive audit architecture covering:
- User and permission changes
- Organization, region, branch, and inventory configuration
- Patient record changes
- Clinical record amendments
- Laboratory result corrections
- Inventory receipts, transfers, and adjustments
- Medicine dispensing
- Procurement
- Invoice creation and finalization
- GST calculations and adjustments
- Payments, refunds, and reversals
- Financial report access where required
- Administrative actions

Include relevant identifiers such as:
- Organization
- Branch
- Region and inventory where applicable
- User
- Action
- Entity type and entity identifier
- Timestamp
- Reason
- Correlation or request ID
- Previous and new values where appropriate

Ensure audit records do not unnecessarily duplicate sensitive patient data, passwords, session tokens, or payment secrets.

Use database permissions, controlled write paths, and appropriate triggers or functions where justified to protect critical history. Explain the threat model and the limits of database-enforced immutability.

The audit architecture must not automatically purge legally significant financial or clinical records based on an arbitrary short retention period.

## 11. INDEXES, CONSTRAINTS, AND PERFORMANCE

For every table, evaluate:
- Primary keys
- Foreign keys
- Unique constraints
- Check constraints
- Required columns
- Useful indexes
- Tenant-scoped indexes
- Composite indexes
- Partial indexes where appropriate
- Concurrency and locking implications

Consider expected queries for:
- Patient search by UHID, name, and phone
- OP queue by branch, date, status, and token
- FEFO inventory lookup by inventory, medicine, expiry, and available quantity
- Inventory movement history
- Invoice lookup by number, patient, and date
- Payment reconciliation
- GST reporting by registration, tax rate, and reporting period
- User permissions by organization, role, and resource scope
- Audit queries by entity, actor, and timestamp

Do not add indexes indiscriminately. Explain important index decisions and potential write overhead.

## 12. TRANSACTIONS AND DATA INTEGRITY

Define the required transaction boundaries for:
- Organization onboarding
- Region and inventory assignments
- Inventory transfers
- Stock receipts
- FEFO dispensing
- Purchase invoice posting
- Patient invoice finalization
- GST calculation and invoice posting
- Payment allocation
- Refund and credit note processing
- User role and permission updates

Ensure multi-step financial and inventory operations are atomic where required.

Document concurrency risks, duplicate submission protection, stock consistency, invoice numbering, and transaction isolation assumptions.

Use PostgreSQL-compatible syntax and functions. Do not use SQLite-specific statements or types.

## 13. SEED DATA

Create separate seed scripts for safe reference data and development-only fixtures.

Examples:
- Permission catalog
- Standard roles
- Permission-to-role mappings
- Supported payment methods
- Reference measurement units
- Configurable GST tax codes

Do not insert real patient information, production credentials, or fabricated legal registration details.

Distinguish mandatory reference data from optional demonstration data.

Ensure seed scripts are repeatable and do not overwrite custom permissions or tenant configuration without an explicit policy.

## 14. SQL FILE QUALITY REQUIREMENTS

Every table-specific SQL file must include:

1. Table name and schema.
2. Business purpose.
3. Source requirement references where available.
4. `CREATE TABLE` statement.
5. Explicit primary key.
6. Foreign keys.
7. Unique constraints.
8. Check constraints.
9. Defaults.
10. Appropriate nullability.
11. Comments for important columns and business rules.
12. Index references or links to supporting index files.
13. Dependencies on other tables.

Use PostgreSQL-native DDL.

Prefer lookup tables for frequently changing business classifications when appropriate. Use PostgreSQL enums only when the values are genuinely stable and changing them through migrations is acceptable.

Use `TIMESTAMPTZ` for event timestamps and document the application time-zone convention. Preserve the distinction between calendar dates and timestamps.

Use `NUMERIC` or integer-based representations for financial calculations, never `REAL` or `DOUBLE PRECISION` for money.

## 15. DOCUMENTATION DELIVERABLES

Generate the following documents:

### `README.md`
Explain:
- Schema architecture
- Naming standards
- Execution order
- Dependencies
- Tenant isolation
- Authorization design
- Financial and GST conventions
- Migration workflow
- Safe validation instructions

### `TABLE_INVENTORY.md`
List every table, schema, file path, purpose, ownership scope, and source requirement.

### `RELATIONSHIP_MAP.md`
Document all relationships, cardinality, foreign keys, organization boundaries, region-to-inventory assignments, and critical transaction dependencies. Include a Mermaid ER diagram.

### `MIGRATION_NOTES.md`
Document:
- SQLite-to-PostgreSQL type mappings
- Renamed or consolidated tables
- New tables
- Removed or superseded structures
- Data migration considerations
- Financial precision decisions
- Existing data compatibility risks
- Unresolved business questions

Do not discard legacy fields without an explicit migration rationale.

### `VALIDATION_CHECKLIST.md`
List all checks required before approval and deployment.

### `MANIFEST.md`
Provide the complete inventory of SQL files and the dependency-aware execution order.

## 16. VALIDATION REQUIREMENTS

Create safe validation scripts that verify:
- All expected schemas exist.
- All expected tables exist.
- All required primary and foreign keys exist.
- Cross-organization references are prevented.
- Region-to-inventory many-to-many assignments work.
- Duplicate assignments are rejected.
- User-level permission overrides behave as documented.
- Unauthorized cross-tenant access is prevented by the designed controls.
- GST totals reconcile with line-level tax calculations.
- Historical tax snapshots remain unchanged after reference-rate changes.
- Posted financial transactions cannot be silently altered through normal application roles.
- Inventory transfers and FEFO operations preserve stock consistency.
- Invoice and receipt numbering constraints work.
- Required indexes exist.

Use isolated development or test databases only.

Do not connect to or modify production databases.

Do not automatically install PostgreSQL, change system configuration, run migrations against an existing database, or execute destructive scripts.

If validation requires a database, first generate the SQL and validation scripts. Explain the required environment and obtain explicit approval before executing anything that changes database state.

Do not claim successful execution unless validation was actually run and its results were observed.

## 17. EXECUTION WORKFLOW

Follow this sequence:

### Phase 1 — Requirements extraction
Read the complete BRD/FRD and extract the full table inventory, fields, relationships, business rules, workflows, and security requirements.

### Phase 2 — Existing implementation reconciliation
Inspect the codebase if available. Identify existing tables, missing structures, inconsistencies, and migration concerns.

### Phase 3 — Architecture design
Define the schema responsibilities, organization hierarchy, region/inventory relationship, authorization model, GST architecture, and common conventions.

### Phase 4 — Table inventory approval
Prepare the complete proposed table list, schema assignments, dependencies, and rationale. Report significant unresolved questions.

### Phase 5 — SQL generation
Create the `sql/` directory and separate SQL files for every table. Generate supporting setup, indexes, constraints, functions, triggers, seeds, and validation scripts.

### Phase 6 — Consistency review
Check all references, naming, dependencies, financial calculations, authorization relationships, and tenant boundaries.

### Phase 7 — Final report
Report the actual files created, the table count, schema-wise distribution, added tables, preserved existing requirements, unresolved issues, and validation status.

If there are no blocking ambiguities, proceed with clearly documented design assumptions rather than stopping for minor questions.

## 18. COMPLETION CRITERIA

The task is complete only when:

- The full BRD/FRD has been reviewed.
- The actual table inventory has been reconciled.
- Every required table has a dedicated SQL file.
- All required schemas are created.
- Organization, region, inventory, and their many-to-many relationships are modeled correctly.
- The generic user-wise authorization architecture is documented and implemented in SQL.
- GST-aware purchasing, billing, tax snapshots, and financial auditability are modeled.
- All foreign keys and schema references are consistent.
- The execution manifest is dependency-aware.
- Documentation and validation scripts are present.
- No existing project files were silently overwritten.
- Remaining uncertainties are explicitly documented.

## 19. START NOW

Start by inspecting the entire BRD/FRD and the available project workspace.

Build the complete table inventory before generating DDL.

Then design the PostgreSQL schemas and create the SQL files under `sql/`.

Prioritize correctness, referential integrity, tenant isolation, auditability, maintainability, and future extensibility over generating a large amount of SQL quickly.

Do not stop after creating a sample of tables. Complete the entire verified inventory, and report any limitations honestly.

**Final instruction: Create the actual individual PostgreSQL SQL files in the workspace. Do not return only a proposal or a single combined SQL script.**