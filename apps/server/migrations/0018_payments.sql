-- Payments: one bill per visit, part payments, "paid before giving".
--
-- A prescription no longer takes stock when the doctor saves it. The
-- pharmacist gives the medicines once the bill covering them is fully paid
-- (or an Admin/Doctor overrides with a reason). Lab reports print only when
-- the lab tests' bill is fully paid (same override).

-- What each bill line pays for, so "is this prescription/lab test paid?" can
-- be answered. NULL for hand-typed lines and every bill made before this.
ALTER TABLE invoice_line ADD COLUMN source_type TEXT CHECK (source_type IN ('prescription_line', 'lab_order_item'));
ALTER TABLE invoice_line ADD COLUMN source_id INTEGER;
CREATE INDEX ix_invoice_line_source ON invoice_line(source_type, source_id);

-- Prescriptions written before this update were handled the old way (the
-- doctor's save gave the medicine, or -- in the very first version -- no
-- stock was recorded at all). They never enter the pharmacy queue or a new
-- bill; only prescriptions written from now on do.
ALTER TABLE prescription_line ADD COLUMN before_pharmacy_tracking INTEGER NOT NULL DEFAULT 0;
UPDATE prescription_line SET before_pharmacy_tracking = 1;

-- Bills made before payment tracking are treated as paid, so old records
-- don't show up as money owed.
ALTER TABLE invoice ADD COLUMN paid_before_tracking INTEGER NOT NULL DEFAULT 0;
UPDATE invoice SET paid_before_tracking = 1;

-- Each payment received against a bill (a bill can be paid in parts).
-- Never deleted: a payment taken by mistake is cancelled with a reason.
CREATE TABLE invoice_payment (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoice(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  mode TEXT NOT NULL CHECK (mode IN ('cash', 'upi', 'card', 'other')),
  received_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  received_by_user_id INTEGER NOT NULL REFERENCES user(id),
  cancelled_at TEXT,
  cancelled_by_user_id INTEGER REFERENCES user(id),
  cancel_reason TEXT
);
CREATE INDEX ix_invoice_payment_invoice ON invoice_payment(invoice_id);

-- Emergency: medicines given / lab report released before payment, by an
-- Admin or Doctor, with a reason. The bill itself stays unpaid.
CREATE TABLE payment_override (
  id INTEGER PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('visit_medicines', 'lab_order')),
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  overridden_by_user_id INTEGER NOT NULL REFERENCES user(id),
  overridden_by_role TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX ix_payment_override_target ON payment_override(target_type, target_id);

INSERT OR IGNORE INTO role_permission (role_name, permission) VALUES
  ('front_desk', 'payment.receive'),
  ('pharmacist', 'payment.receive'),
  ('manager', 'payment.receive'),
  ('doctor', 'payment.override');
