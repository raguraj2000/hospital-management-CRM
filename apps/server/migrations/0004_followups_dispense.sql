CREATE TABLE follow_up (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  prescribing_doctor_id INTEGER NOT NULL REFERENCES user(id),
  start_date TEXT NOT NULL,
  planned_end_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  deleted_at TEXT
);

-- follow_up_id is nullable: an ad-hoc/walk-in visit has no follow-up window.
CREATE TABLE visit_event (
  id INTEGER PRIMARY KEY,
  follow_up_id INTEGER REFERENCES follow_up(id),
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  visit_date TEXT NOT NULL,
  attending_doctor_id INTEGER REFERENCES user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  deleted_at TEXT
);
CREATE INDEX ix_visit_followup ON visit_event(follow_up_id);
CREATE INDEX ix_visit_patient_date ON visit_event(patient_id, visit_date);

CREATE TABLE prescription_line (
  id INTEGER PRIMARY KEY,
  visit_event_id INTEGER NOT NULL REFERENCES visit_event(id),
  medicine_id INTEGER NOT NULL REFERENCES medicine(id),
  quantity_prescribed INTEGER NOT NULL,
  dosage_instructions TEXT,
  duration_days INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  deleted_at TEXT
);

-- visit_event_id is NOT NULL: every dispense belongs to a visit, so charge
-- totals (grouped via visit_event) never silently exclude ad-hoc dispenses.
-- prescription_line_id is nullable: ad-hoc dispenses within a visit have none.
CREATE TABLE dispense_log (
  id INTEGER PRIMARY KEY,
  visit_event_id INTEGER NOT NULL REFERENCES visit_event(id),
  prescription_line_id INTEGER REFERENCES prescription_line(id),
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  medicine_id INTEGER NOT NULL REFERENCES medicine(id),
  medicine_batch_id INTEGER NOT NULL REFERENCES medicine_batch(id),
  quantity_dispensed INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  dispensed_by_user_id INTEGER NOT NULL REFERENCES user(id),
  dispensed_by_role TEXT NOT NULL,
  prescribing_doctor_id INTEGER REFERENCES user(id),
  dispensed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  voided_at TEXT,
  void_reason TEXT
);
CREATE INDEX ix_dispense_patient ON dispense_log(patient_id, dispensed_at);
CREATE INDEX ix_dispense_visit ON dispense_log(visit_event_id);
