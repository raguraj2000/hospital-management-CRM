-- Per-role permissions, editable from Settings > Roles & permissions.
-- Seeded with exactly what each role could already do, so behaviour on the
-- day this lands is identical to before.
--
-- 'admin' is deliberately NOT stored here: admin always has every permission,
-- hardcoded in the server (see roleHasPermission). That keeps it impossible
-- to lock the clinic out of its own system by unticking a box.
CREATE TABLE role_permission (
  role_name TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role_name, permission)
);

INSERT INTO role_permission (role_name, permission) VALUES
  ('front_desk', 'patient.view'),
  ('front_desk', 'patient.create'),
  ('front_desk', 'patient.edit'),
  ('front_desk', 'inventory.view'),
  ('front_desk', 'invoice.view'),
  ('front_desk', 'invoice.manage'),

  ('pharmacist', 'patient.view'),
  ('pharmacist', 'dispense.create'),
  ('pharmacist', 'dispense.void'),
  ('pharmacist', 'inventory.view'),
  ('pharmacist', 'inventory.adjust'),
  ('pharmacist', 'invoice.view'),
  ('pharmacist', 'invoice.manage'),

  ('doctor', 'patient.view'),
  ('doctor', 'patient.editMedicalInstructions'),
  ('doctor', 'patient.changeStatus'),
  ('doctor', 'inventory.view'),
  ('doctor', 'invoice.view'),

  ('manager', 'patient.view'),
  ('manager', 'patient.create'),
  ('manager', 'patient.edit'),
  ('manager', 'patient.changeStatus'),
  ('manager', 'patient.merge'),
  ('manager', 'dispense.create'),
  ('manager', 'dispense.void'),
  ('manager', 'inventory.view'),
  ('manager', 'inventory.adjust'),
  ('manager', 'medicine.manage'),
  ('manager', 'supplier.manage'),
  ('manager', 'auditLog.view'),
  ('manager', 'invoice.view'),
  ('manager', 'invoice.manage');
