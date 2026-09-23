-- Clinic-wide settings (e.g. backup schedule), edited from Settings > Backups.
-- Additive only: creates a new table, touches no existing data.
CREATE TABLE IF NOT EXISTS app_setting (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
