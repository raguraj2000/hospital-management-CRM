# Execution Manifest & Dependency Order

Execute the generated SQL files in the strict numerical sequence listed below:

### Phase 1: Environment & Schemas
1. `00_database_setup.sql`
2. `00_schema_setup.sql`
3. `01_extensions.sql`

### Phase 2: Global Schema (Platform & Security)
4. `global/organizations.sql`
5. `global/organization_plans.sql`
6. `global/platform_payments.sql`
7. `global/org_counters.sql`
8. `global/users.sql`
9. `global/sessions.sql`
10. `global/permissions.sql`
11. `global/roles.sql`
12. `global/role_permissions.sql`
13. `global/organization_memberships.sql`
14. `global/user_roles.sql`
15. `global/user_permission_overrides.sql`

### Phase 3: Master Schema (Statutory Reference & Standards)
16. `master/countries.sql`
17. `master/states.sql`
18. `master/uom_codes.sql`
19. `master/payment_methods.sql`
20. `master/hsn_sac_codes.sql`
21. `master/gst_tax_codes.sql`
22. `master/gst_rates.sql`
23. `master/lab_catalog.sql`
24. `master/lab_parameters.sql`

### Phase 4: Public Schema (Hierarchy, Operations & Clinical)
25. `public/regions.sql`
26. `public/inventory_locations.sql`
27. `public/region_inventory.sql`
28. `public/branches.sql`
29. `public/branch_doctors.sql`
30. `public/branch_counters.sql`
31. `public/clinic_settings.sql`
32. `public/patients.sql`
33. `public/op_visits.sql`
34. `public/medicines.sql`
35. `public/inventory_batches.sql`
36. `public/inventory_movements.sql`
37. `public/prescription_items.sql`
38. `public/prescription_notes.sql`
39. `public/treatment_doses.sql`
40. `public/treatment_bookmarks.sql`
41. `public/treatment_bookmark_lines.sql`
42. `public/visit_instructions.sql`
43. `public/treatment_courses.sql`
44. `public/course_sittings.sql`
45. `public/course_items.sql`
46. `public/course_templates.sql`
47. `public/lab_tests.sql`
48. `public/lab_test_parameters.sql`
49. `public/lab_packages.sql`
50. `public/lab_orders.sql`
51. `public/lab_results.sql`
52. `public/lab_releases.sql`
53. `public/pharmacy_sales.sql`
54. `public/pharmacy_sale_lines.sql`
55. `public/vendors.sql`
56. `public/purchase_invoices.sql`
57. `public/purchase_invoice_lines.sql`
58. `public/purchase_invoice_tax_lines.sql`
59. `public/vendor_payments.sql`
60. `public/expenses.sql`
61. `public/invoices.sql`
62. `public/invoice_lines.sql`
63. `public/invoice_tax_lines.sql`
64. `public/invoice_payments.sql`
65. `public/credit_debit_notes.sql`
66. `public/visit_charges.sql`
67. `public/audit_logs.sql`

### Phase 5: Staging Schema
68. `staging/inventory_import_batches.sql`
69. `staging/inventory_import_rows.sql`
70. `staging/vendor_invoice_imports.sql`
71. `staging/vendor_invoice_import_rows.sql`

### Phase 6: Functions, Triggers, Views, Indexes, Seeds & Tests
72. `functions/fn_authorize_user.sql`
73. `functions/fn_calculate_gst.sql`
74. `functions/fn_next_sequence_val.sql`
75. `triggers/trg_update_timestamp.sql`
76. `triggers/trg_enforce_invoice_immutability.sql`
77. `views/vw_available_stock.sql`
78. `views/vw_gst_sales_summary.sql`
79. `views/vw_user_permissions.sql`
80. `indexes/01_company_region_inventory_indexes.sql`
81. `seeds/01_reference_seeds.sql`
82. `validation/test_schema_integrity.sql`
