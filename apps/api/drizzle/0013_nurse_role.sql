-- Treatments given in the hospital: a Nurse role that ticks each dose, in every organization that does not
-- have one yet. Doctors and branch admins can tick doses too.
-- (INSERT OR IGNORE: safe to meet an organization that already has the role or the permission.)
INSERT OR IGNORE INTO role (organization_id, key, name)
  SELECT id, 'nurse', 'Nurse' FROM organization;
--> statement-breakpoint
INSERT OR IGNORE INTO role_permission (role_id, permission)
  SELECT role.id, p.permission FROM role, (SELECT 'dashboard.view' AS permission UNION ALL SELECT 'patient.view' UNION ALL SELECT 'treatment.give') p WHERE role.key = 'nurse';
--> statement-breakpoint
INSERT OR IGNORE INTO role_permission (role_id, permission)
  SELECT id, 'treatment.give' FROM role WHERE key IN ('doctor', 'branch_admin');
