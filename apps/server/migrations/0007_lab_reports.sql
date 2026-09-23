CREATE TABLE lab_report (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  title TEXT NOT NULL,
  report_datetime TEXT NOT NULL,
  notes TEXT,
  file_name TEXT,
  file_mime_type TEXT,
  file_data BLOB,
  uploaded_by_user_id INTEGER NOT NULL REFERENCES user(id),
  uploaded_by_role TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  deleted_at TEXT
);
CREATE INDEX ix_lab_report_patient ON lab_report(patient_id, report_datetime);
