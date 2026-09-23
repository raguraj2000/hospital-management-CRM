CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  performed_by_user_id INTEGER NOT NULL REFERENCES user(id),
  performed_by_role TEXT NOT NULL,
  detail_json TEXT,
  performed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX ix_audit_entity ON audit_log(entity_type, entity_id);
