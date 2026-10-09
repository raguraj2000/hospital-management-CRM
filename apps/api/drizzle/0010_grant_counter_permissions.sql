-- One checkout at the counter: whoever sits there collects consultation + lab + medicines.
-- Pharmacists may collect bills and the front desk may hand over medicines, in every organization
-- (INSERT OR IGNORE: safe where an owner already ticked them in Settings -> Roles; the owner can untick them).
INSERT OR IGNORE INTO role_permission (role_id, permission)
  SELECT id, 'billing.receive' FROM role WHERE key = 'pharmacist';
--> statement-breakpoint
INSERT OR IGNORE INTO role_permission (role_id, permission)
  SELECT id, 'pharmacy.sell' FROM role WHERE key = 'front_desk';
