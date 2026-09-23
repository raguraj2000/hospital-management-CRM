CREATE TABLE patient (
  id INTEGER PRIMARY KEY,
  customer_code TEXT UNIQUE NOT NULL,
  current_name TEXT NOT NULL,
  dob TEXT,
  age_years_at_registration INTEGER,
  weight_kg REAL,
  gender TEXT,
  blood_group TEXT,
  aadhar_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_provisional INTEGER NOT NULL DEFAULT 0,
  merged_into_id INTEGER REFERENCES patient(id),
  deceased_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  deleted_at TEXT
);
CREATE UNIQUE INDEX ux_patient_aadhar ON patient(aadhar_number) WHERE aadhar_number IS NOT NULL;
CREATE INDEX ix_patient_name_dob ON patient(current_name, dob);
CREATE INDEX ix_patient_customer_code ON patient(customer_code);

CREATE TABLE patient_name_history (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  previous_name TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  changed_by_user_id INTEGER NOT NULL REFERENCES user(id),
  reason TEXT
);

CREATE TABLE patient_allergy (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  allergen TEXT NOT NULL,
  severity TEXT,
  noted_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  deleted_at TEXT
);

CREATE TABLE patient_chronic_condition (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  condition_name TEXT NOT NULL,
  noted_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  deleted_at TEXT
);

CREATE TABLE patient_merge_log (
  id INTEGER PRIMARY KEY,
  surviving_patient_id INTEGER NOT NULL REFERENCES patient(id),
  merged_patient_id INTEGER NOT NULL REFERENCES patient(id),
  merged_by_user_id INTEGER NOT NULL REFERENCES user(id),
  merged_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  notes TEXT
);
