-- ==============================================================================
-- Seeds: 01_reference_seeds.sql
-- Purpose: Statutory reference data, permission catalog, default roles, and tax codes
-- Source: packages/shared/src/index.ts (ALL_PERMISSIONS, DEFAULT_ROLES)
-- ==============================================================================

-- 1. Reference Countries
INSERT INTO master.countries (code, alpha2, name, dial_code) VALUES
('IND', 'IN', 'India', '+91')
ON CONFLICT (code) DO NOTHING;

-- 2. Reference States with official GST State Codes
INSERT INTO master.states (code, country_code, name, gst_state_code, is_union_territory) VALUES
('AN', 'IND', 'Andaman and Nicobar Islands', '35', true),
('AP', 'IND', 'Andhra Pradesh', '37', false),
('AR', 'IND', 'Arunachal Pradesh', '12', false),
('AS', 'IND', 'Assam', '18', false),
('BR', 'IND', 'Bihar', '10', false),
('CH', 'IND', 'Chandigarh', '04', true),
('CT', 'IND', 'Chhattisgarh', '22', false),
('DL', 'IND', 'Delhi', '07', true),
('GA', 'IND', 'Goa', '30', false),
('GJ', 'IND', 'Gujarat', '24', false),
('HR', 'IND', 'Haryana', '06', false),
('HP', 'IND', 'Himachal Pradesh', '02', false),
('JK', 'IND', 'Jammu and Kashmir', '01', true),
('JH', 'IND', 'Jharkhand', '20', false),
('KA', 'IND', 'Karnataka', '29', false),
('KL', 'IND', 'Kerala', '32', false),
('LA', 'IND', 'Ladakh', '38', true),
('MP', 'IND', 'Madhya Pradesh', '23', false),
('MH', 'IND', 'Maharashtra', '27', false),
('MN', 'IND', 'Manipur', '14', false),
('ML', 'IND', 'Meghalaya', '17', false),
('MZ', 'IND', 'Mizoram', '15', false),
('NL', 'IND', 'Nagaland', '13', false),
('OD', 'IND', 'Odisha', '21', false),
('PY', 'IND', 'Puducherry', '34', true),
('PB', 'IND', 'Punjab', '03', false),
('RJ', 'IND', 'Rajasthan', '08', false),
('SK', 'IND', 'Sikkim', '11', false),
('TN', 'IND', 'Tamil Nadu', '33', false),
('TS', 'IND', 'Telangana', '36', false),
('TR', 'IND', 'Tripura', '16', false),
('UP', 'IND', 'Uttar Pradesh', '09', false),
('UK', 'IND', 'Uttarakhand', '05', false),
('WB', 'IND', 'West Bengal', '19', false)
ON CONFLICT (code) DO NOTHING;

-- 3. Measurement Units
INSERT INTO master.uom_codes (code, name, is_discrete) VALUES
('tab', 'Tablet', true),
('cap', 'Capsule', true),
('bottle', 'Syrup Bottle', true),
('vial', 'Injection Vial', true),
('ampoule', 'Ampoule', true),
('tube', 'Ointment Tube', true),
('drops', 'Drops Bottle', true),
('unit', 'Consumable Unit', true),
('strip', 'Strip (Packs)', true),
('box', 'Box', true)
ON CONFLICT (code) DO NOTHING;

-- 4. Payment Methods
INSERT INTO master.payment_methods (code, name, requires_reference, is_digital) VALUES
('cash', 'Cash', false, false),
('upi', 'UPI / QR Code', false, true),
('card', 'Debit / Credit Card', false, true),
('cheque', 'Bank Cheque', true, false),
('bank_transfer', 'NEFT / RTGS Bank Transfer', true, true)
ON CONFLICT (code) DO NOTHING;

-- 5. HSN / SAC Codes
INSERT INTO master.hsn_sac_codes (code, type, description, default_gst_rate, is_exempt_by_default) VALUES
('9993', 'SAC', 'Healthcare clinical consultation and inpatient medical services', 0.00, true),
('3004', 'HSN', 'Medicaments consisting of mixed or unmixed products for therapeutic use', 12.00, false),
('3002', 'HSN', 'Human blood, vaccines, toxins, cultures of micro-organisms', 5.00, false),
('9018', 'HSN', 'Medical, surgical, dental or veterinary instruments and appliances', 12.00, false)
ON CONFLICT (code) DO NOTHING;

-- 6. GST Tax Codes
INSERT INTO master.gst_tax_codes (code, name, is_taxable) VALUES
('EXEMPT', 'Exempted Healthcare Services (SAC 9993)', false),
('NIL', 'Nil Rated Products', false),
('GST_0', 'GST 0% Rate', true),
('GST_5', 'GST 5% Standard Healthcare Concession', true),
('GST_12', 'GST 12% Standard Pharmaceuticals', true),
('GST_18', 'GST 18% Diagnostics and Devices', true),
('GST_28', 'GST 28% Luxury and Consumable Goods', true)
ON CONFLICT (code) DO NOTHING;

-- 7. Effective-Dated GST Rates
INSERT INTO master.gst_rates (tax_code, valid_from, valid_to, cgst_rate, sgst_rate, igst_rate, cess_rate, total_rate) VALUES
('EXEMPT', '2017-07-01', NULL, 0.00, 0.00, 0.00, 0.00, 0.00),
('GST_0',  '2017-07-01', NULL, 0.00, 0.00, 0.00, 0.00, 0.00),
('GST_5',  '2017-07-01', NULL, 2.50, 2.50, 5.00, 0.00, 5.00),
('GST_12', '2017-07-01', NULL, 6.00, 6.00, 12.00, 0.00, 12.00),
('GST_18', '2017-07-01', NULL, 9.00, 9.00, 18.00, 0.00, 18.00),
('GST_28', '2017-07-01', NULL, 14.00, 14.00, 28.00, 0.00, 28.00)
ON CONFLICT DO NOTHING;

-- 8. Platform Permissions Catalog
INSERT INTO global.permissions (key, module, resource, action, name, description) VALUES
-- Platform
('users.manage', 'admin', 'user', 'manage', 'Manage Staff', 'Add, edit, deactivate staff accounts and role assignments'),
('settings.manage', 'admin', 'branch', 'manage', 'Branch Settings', 'Configure fee slots, charge presets, print headers, and network lock'),
('audit.view', 'admin', 'audit_log', 'read', 'View Audit Log', 'Inspect immutable regulatory and clinical activity logs'),
('access.anywhere', 'admin', 'network', 'bypass', 'Remote Network Access', 'Bypass the facility hardware CIDR network lock'),
-- Clinical
('dashboard.view', 'dashboard', 'analytics', 'read', 'Dashboard Access', 'View clinical wait times, visit counts, and daily stats'),
('patient.view', 'patient', 'record', 'read', 'View Patients', 'Search and read patient demographic and medical records'),
('patient.create', 'patient', 'record', 'create', 'Register Patients', 'Register new patients and issue UHIDs'),
('patient.edit', 'patient', 'record', 'update', 'Edit Patients', 'Update patient demographic and chronic illness data'),
('patient.delete', 'patient', 'record', 'delete', 'Deactivate Patients', 'Soft-delete or deactivate patient records with audit reason'),
('prescription.write', 'op_visit', 'prescription', 'create', 'Write Prescriptions', 'Prescribe medications and formulate order sets'),
('treatment.give', 'treatment', 'dose', 'update', 'Administer Treatments', 'Tick off administered injections, IV drips, and nebulizer doses'),
-- Diagnostics
('lab.order', 'lab', 'order', 'create', 'Order Lab Tests', 'Order laboratory investigations on outpatient visits'),
('lab.view', 'lab', 'order', 'read', 'View Lab Queue', 'Access laboratory technician queue and patient specimen worklist'),
('lab.correct', 'lab', 'result', 'update', 'Correct Lab Results', 'Amend verified lab reports with mandatory audit justification'),
-- Inventory & Pharmacy
('pharmacy.sell', 'pharmacy', 'sale', 'create', 'Dispense & Sell Medicines', 'Dispense prescriptions using FEFO and process OTC retail sales'),
('inventory.view', 'inventory', 'stock', 'read', 'View Stock', 'Inspect medicine stock levels, batches, and expiry schedules'),
('inventory.manage', 'inventory', 'stock', 'update', 'Manage Stock', 'Perform stock adjustments, internal transfers, and manual lot creation'),
('vendor.manage', 'procurement', 'vendor', 'manage', 'Manage Vendors & Invoices', 'Contract suppliers, enter purchase bills, and disburse payments'),
-- Billing & Finance
('billing.receive', 'billing', 'invoice', 'create', 'Billing & Cash Collection', 'Generate patient invoices, apply presets, and record payments'),
('reports.view', 'billing', 'report', 'read', 'Financial Reports', 'Inspect daily collection summaries, doctor revenue, and GST reports'),
('undo.skip', 'system', 'delay', 'bypass', 'Skip Undo Delay', 'Execute financial collections immediately bypassing the 5-second safety timer')
ON CONFLICT (key) DO NOTHING;

-- 9. System Role Templates
INSERT INTO global.roles (company_id, key, name, description, is_system) VALUES
(NULL, 'branch_admin', 'Branch Admin', 'Facility administrator managing personnel, doctors, and operational configuration', true),
(NULL, 'doctor', 'Doctor', 'Consulting physician treating patients, prescribing drugs, and ordering tests', true),
(NULL, 'visiting_doctor', 'Visiting Doctor', 'Outside consultant seeing patients with restricted financial and settings access', true),
(NULL, 'front_desk', 'Front Desk Receptionist', 'Patient registration, OP queue token allocation, and billing cashier', true),
(NULL, 'pharmacist', 'Pharmacist', 'Medication dispenser, FEFO inventory manager, and supplier invoice processor', true),
(NULL, 'lab_technician', 'Lab Technician', 'Diagnostic sample collector, results technician, and test verification staff', true),
(NULL, 'nurse', 'Clinical Nurse', 'In-hospital treatment dose administrator and vital signs monitor', true)
ON CONFLICT (company_id, key) DO NOTHING;
