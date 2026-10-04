-- New permissions for prescriptions, lab orders and inventory management.
-- Give them to the matching default roles in every organization (INSERT OR IGNORE:
-- safe to run on databases where an owner already ticked them in Settings -> Roles).
INSERT OR IGNORE INTO role_permission (role_id, permission)
  SELECT id, 'prescription.write' FROM role WHERE key IN ('branch_admin', 'doctor');
--> statement-breakpoint
INSERT OR IGNORE INTO role_permission (role_id, permission)
  SELECT id, 'lab.order' FROM role WHERE key IN ('branch_admin', 'doctor');
--> statement-breakpoint
INSERT OR IGNORE INTO role_permission (role_id, permission)
  SELECT id, 'inventory.manage' FROM role WHERE key IN ('branch_admin', 'pharmacist');
--> statement-breakpoint
INSERT OR IGNORE INTO role_permission (role_id, permission)
  SELECT id, 'inventory.view' FROM role WHERE key = 'doctor';
