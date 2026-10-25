# Complete Table Inventory

| Schema | Table Name | Purpose | Ownership Scope | Source Requirement |
| :--- | :--- | :--- | :--- | :--- |
| `global` | `organizations` | Tenant hospital / clinic enterprise | Platform-wide | FRD Section 3.1 |
| `global` | `organization_plans` | Commercial subscription tiers & quotas | Platform-wide | BRD Section 1.2 |
| `global` | `platform_payments` | Licensing fees paid to platform operator | Platform-wide | FRD Section 3.1 |
| `global` | `org_counters` | Enterprise-wide atomic sequence generators | Organization-scoped | FRD Section 3.1 |
| `global` | `users` | Staff, doctor, and admin user credentials | Platform-wide | FRD Section 3.1, FR-SEC-01 |
| `global` | `sessions` | Cookie session digests (SHA-256) | User-scoped | FRD Section 3.1, FR-SEC-02 |
| `global` | `permissions` | Granular functional privilege catalog | Platform-wide | db-design.md Section 8 |
| `global` | `roles` | Role definitions (system & custom) | Organization / Global | db-design.md Section 8 |
| `global` | `role_permissions` | Default privileges assigned to roles | Role-scoped | db-design.md Section 8 |
| `global` | `organization_memberships` | User enrollment in tenant organizations | Org-User scoped | FRD Section 3.1 |
| `global` | `user_roles` | Scoped user-to-role assignments | Resource-scoped | db-design.md Section 8 |
| `global` | `user_permission_overrides`| Explicit user grants/denials with precedence | Resource-scoped | db-design.md Section 8 |
| `master` | `countries` | ISO country code reference | Platform-wide | db-design.md Section 5 |
| `master` | `states` | States with statutory 2-digit GST codes | Country-wide | db-design.md Section 9 |
| `master` | `uom_codes` | Standard units of measurement | Platform-wide | FRD Section 3.1 |
| `master` | `payment_methods` | Tender channels (cash, upi, card, cheque) | Platform-wide | FRD Section 3.1 |
| `master` | `hsn_sac_codes` | HSN goods & SAC healthcare services codes | Statutory / India | db-design.md Section 9 |
| `master` | `gst_tax_codes` | Symbolic GST classifications | Statutory / India | db-design.md Section 9 |
| `master` | `gst_rates` | Effective-dated GST rate schedules | Statutory / India | db-design.md Section 9 |
| `master` | `lab_catalog` | Diagnostic test standard master directory | Platform-wide | FRD Section 3.1 |
| `master` | `lab_parameters` | Reference analyte intervals & units | Catalog-scoped | FRD Section 3.1 |
| `public` | `regions` | Regional territorial divisions | Organization-scoped | db-design.md Section 6 |
| `public` | `inventory_locations` | Stock holding warehouses and dispensaries | Organization-scoped | db-design.md Section 6 |
| `public` | `region_inventory` | Many-to-many region-inventory junction | Organization-scoped | db-design.md Section 6 |
| `public` | `branches` | Physical clinic facilities | Org / Region-scoped | FRD Section 3.1 |
| `public` | `branch_doctors` | Doctor roster per facility | Branch-scoped | FRD Section 3.2 |
| `public` | `branch_counters` | Atomic token and invoice sequence counters | Branch-scoped | FRD Section 3.1 |
| `public` | `clinic_settings` | Facility consultation fees & fee slots | Branch-scoped | FRD Section 3.2 |
| `public` | `patients` | Patient demographic and clinical registry | Org / Branch-scoped | FRD Section 3.2, FR-PAT-01 |
| `public` | `op_visits` | Outpatient encounters, tokens, and vitals | Branch-scoped | FRD Section 3.2, FR-OP-01 |
| `public` | `prescription_items` | Prescribed pharmaceutical items | Visit-scoped | FRD Section 3.2, FR-RX-01 |
| `public` | `prescription_notes` | Non-billable advice and instructions | Visit-scoped | FRD Section 3.2 |
| `public` | `treatment_doses` | In-hospital nurse administration schedule | Branch-scoped | FRD Section 3.2, FR-RX-02 |
| `public` | `treatment_bookmarks` | Order set protocol templates | Branch-scoped | FRD Section 3.2, FR-CRS-02 |
| `public` | `treatment_bookmark_lines`| Lines inside bookmark order set | Bookmark-scoped | FRD Section 3.2 |
| `public` | `visit_instructions` | Checklist of care tasks on an OP visit | Visit-scoped | FRD Section 3.2 |
| `public` | `treatment_courses` | Multi-sitting ambulatory care protocols | Patient-scoped | FRD Section 3.2, FR-CRS-01 |
| `public` | `course_sittings` | Scheduled individual sittings of a course | Course-scoped | FRD Section 3.2 |
| `public` | `course_items` | Scheduled items within a course sitting | Sitting-scoped | FRD Section 3.2 |
| `public` | `course_templates` | Pre-configured course templates | Branch-scoped | FRD Section 3.2 |
| `public` | `lab_tests` | Facility diagnostic test offerings | Branch-scoped | FRD Section 3.2, FR-LAB-01 |
| `public` | `lab_test_parameters` | Analytes measured in a facility test | Test-scoped | FRD Section 3.2, FR-LAB-02 |
| `public` | `lab_packages` | Bundled diagnostic profiles | Branch-scoped | FRD Section 3.2 |
| `public` | `lab_orders` | Diagnostic tests ordered for a visit | Visit-scoped | FRD Section 3.2 |
| `public` | `lab_results` | Analyte values with abnormal H/L/! flags | Order-scoped | FRD Section 3.2 |
| `public` | `lab_releases` | Emergency print release authorizations | Visit-scoped | FRD Section 3.2, FR-LAB-03 |
| `public` | `medicines` | Clinic pharmaceutical formulary catalog | Branch-scoped | FRD Section 3.2, FR-PHM-01 |
| `public` | `inventory_batches` | Physical stock lots with expiry dates | Location-scoped | FRD Section 3.2, FR-PHM-01 |
| `public` | `inventory_movements` | Immutable stock transaction ledger | Location-scoped | db-design.md Section 7 |
| `public` | `pharmacy_sales` | Prescription and OTC retail sale headers | Branch-scoped | FRD Section 3.2, FR-PHM-02 |
| `public` | `pharmacy_sale_lines` | Batch allocations per sale line (FEFO) | Sale-scoped | FRD Section 3.2 |
| `public` | `vendors` | Drug distributors and suppliers | Branch-scoped | FRD Section 3.2 |
| `public` | `purchase_invoices` | Supplier purchase bills with GST breakdown | Location-scoped | FRD Section 3.2, FR-PHM-03 |
| `public` | `purchase_invoice_lines` | Inward lines with pack sizes & free units | Invoice-scoped | FRD Section 3.2 |
| `public` | `purchase_invoice_tax_lines`| Immutable purchase tax snapshots | Line-scoped | db-design.md Section 9 |
| `public` | `vendor_payments` | Disbursements to suppliers | Invoice-scoped | FRD Section 3.2 |
| `public` | `expenses` | Clinic overhead expenditures | Branch-scoped | FRD Section 3.2 |
| `public` | `invoices` | Master patient invoices (OP + Pharmacy) | Branch-scoped | FRD Section 3.2, FR-BIL-03 |
| `public` | `invoice_lines` | Itemized billed services and products | Invoice-scoped | FRD Section 3.2 |
| `public` | `invoice_tax_lines` | Immutable line-level GST component snapshots| Line-scoped | db-design.md Section 9 |
| `public` | `invoice_payments` | Cashier receipts with receipt numbering | Invoice-scoped | FRD Section 3.2 |
| `public` | `credit_debit_notes` | Formal statutory GST adjustment notes | Invoice-scoped | db-design.md Section 9 |
| `public` | `visit_charges` | Pre-bill procedural charges staging | Visit-scoped | FRD Section 3.2 |
| `public` | `audit_logs` | Permanent regulatory & operational audit trail| Branch-scoped | FRD Section 3.1, FRD 3.2 |
| `staging` | `inventory_import_batches`| Excel upload session headers | Location-scoped | db-design.md Section 5 |
| `staging` | `inventory_import_rows` | Parsed rows with pre-commit validation | Batch-scoped | db-design.md Section 5 |
| `staging` | `vendor_invoice_imports` | Inward supplier bill upload headers | Branch-scoped | packages/shared |
| `staging` | `vendor_invoice_import_rows`| Staged bill lines awaiting confirmation | Import-scoped | packages/shared |


## Supporting Database Views & Analytical Projections

| Schema | View Name | Purpose & Return Shape | Source Reference |
| :--- | :--- | :--- | :--- |
| `public` | `vw_available_stock` | Aggregated sellable stock per medicine and location with FEFO next batch | FR-PHM-01 |
| `public` | `vw_gst_sales_summary` | Statutory tax filing projection with taxable values and tax splits | db-design.md Section 9 |
| `public` | `vw_user_permissions` | Consolidated permission evaluation matrix returning boolean `has_permission` for `(company_id, region_id, user_id)` | db-design.md Section 8 |


## Supporting Database Views & Analytical Projections

| Schema | View Name | Purpose & Return Shape | Source Reference |
| :--- | :--- | :--- | :--- |
| `public` | `vw_available_stock` | Aggregated sellable stock per medicine and location with FEFO next batch | FR-PHM-01 |
| `public` | `vw_gst_sales_summary` | Statutory tax filing projection with taxable values and tax splits | db-design.md Section 9 |
| `public` | `vw_user_permissions` | Consolidated permission evaluation matrix returning boolean `has_permission` for `(company_id, region_id, user_id)` | db-design.md Section 8 |

