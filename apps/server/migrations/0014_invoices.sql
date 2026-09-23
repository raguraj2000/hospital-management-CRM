-- Invoices / bills.
--
-- invoice_line is a SNAPSHOT, not a live view of dispense_log: once a bill is
-- printed and handed to a patient it must never change because someone later
-- edited a medicine's price, deleted a medicine, or voided a dispense. The
-- draft is built from the visit's dispenses, then frozen here and editable
-- on its own.
CREATE TABLE invoice (
  id INTEGER PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  -- Set for a single-prescription bill; NULL for a combined ("general")
  -- invoice covering several visits. invoice_visit records the full set
  -- either way.
  visit_event_id INTEGER REFERENCES visit_event(id),
  invoice_date TEXT NOT NULL,
  doctor_fee_cents INTEGER NOT NULL DEFAULT 0,
  consultant_fee_cents INTEGER NOT NULL DEFAULT 0,
  other_fee_cents INTEGER NOT NULL DEFAULT 0,
  other_fee_label TEXT,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  deleted_at TEXT
);
CREATE INDEX ix_invoice_patient ON invoice(patient_id, invoice_date);
CREATE INDEX ix_invoice_visit ON invoice(visit_event_id);

CREATE TABLE invoice_line (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoice(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  line_total_cents INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_invoice_line_invoice ON invoice_line(invoice_id, sort_order);

-- Which visits a bill covers, so a visit already billed isn't offered again
-- by default on the next combined invoice.
CREATE TABLE invoice_visit (
  invoice_id INTEGER NOT NULL REFERENCES invoice(id),
  visit_event_id INTEGER NOT NULL REFERENCES visit_event(id),
  PRIMARY KEY (invoice_id, visit_event_id)
);

-- Clinic header + default fees live in app_setting (created in 0010) so they
-- can be corrected from Settings without a new build.
INSERT OR IGNORE INTO app_setting (key, value) VALUES
  ('clinic.name', 'Aathi Hospital'),
  ('clinic.addressLine', 'Puduvettakudi'),
  ('clinic.doctorName', 'Dr. Suthakar'),
  ('clinic.doctorTitle', 'Doctor & MD'),
  ('clinic.phone', '9655125145'),
  ('invoice.defaultDoctorFeeCents', '0'),
  ('invoice.defaultConsultantFeeCents', '0'),
  ('invoice.defaultOtherFeeLabel', 'Other charges');
