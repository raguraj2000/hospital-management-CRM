# PostgreSQL Schema Validation Checklist

Execute the following verification checklist against a disposable development PostgreSQL database:

- [ ] **Extension Verification:** `pgcrypto`, `uuid-ossp`, `citext`, `btree_gist` created successfully.
- [ ] **Schema Creation:** Schemas `global`, `master`, `public`, `staging` exist with appropriate comments.
- [ ] **Tenant Isolation Invariant:** Run `validation/test_schema_integrity.sql` to verify that `public.region_inventory` enforces identical `company_id` via composite foreign keys.
- [ ] **Generic RBAC Function:** Verify `global.fn_authorize_user(...)` evaluates explicit denies before role grants.
- [ ] **GST Calculation Function:** Verify `public.fn_calculate_gst(...)` accurately splits CGST/SGST for intra-state and charges IGST for inter-state.
- [ ] **Invoice Immutability Trigger:** Verify attempting to UPDATE or DELETE an invoice with `is_immutable = true` raises an audit violation exception.
- [ ] **FEFO Stock Aggregation:** Verify view `public.vw_available_stock` correctly filters out expired batches.
