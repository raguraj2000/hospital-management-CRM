-- Vendors (the existing supplier table), purchase bills, and paying vendors.
-- Receiving medicines from a vendor is one purchase bill with many lines;
-- saving it adds every batch to stock and records what is owed. Vendors are
-- paid against each bill (part payments allowed), with a due date from the
-- vendor's credit days.

ALTER TABLE supplier ADD COLUMN phone TEXT;
ALTER TABLE supplier ADD COLUMN address TEXT;
ALTER TABLE supplier ADD COLUMN credit_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE supplier ADD COLUMN notes TEXT;
ALTER TABLE supplier ADD COLUMN created_at TEXT;
UPDATE supplier SET created_at = datetime('now', 'localtime') WHERE created_at IS NULL;

CREATE TABLE purchase_bill (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES supplier(id),
  -- The vendor's own bill/invoice number, as printed on their paper.
  vendor_bill_number TEXT,
  bill_date TEXT NOT NULL,
  due_date TEXT,
  total_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  -- A bill entered by mistake is cancelled (never deleted), only while none
  -- of its stock has been used and nothing has been paid on it.
  cancelled_at TEXT,
  cancelled_by_user_id INTEGER REFERENCES user(id),
  cancel_reason TEXT
);
CREATE INDEX ix_purchase_bill_supplier ON purchase_bill(supplier_id, bill_date);

CREATE TABLE purchase_line (
  id INTEGER PRIMARY KEY,
  purchase_bill_id INTEGER NOT NULL REFERENCES purchase_bill(id),
  medicine_id INTEGER NOT NULL REFERENCES medicine(id),
  medicine_batch_id INTEGER NOT NULL REFERENCES medicine_batch(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_cents INTEGER NOT NULL CHECK (unit_cost_cents >= 0),
  line_total_cents INTEGER NOT NULL
);
CREATE INDEX ix_purchase_line_bill ON purchase_line(purchase_bill_id);

CREATE TABLE supplier_payment (
  id INTEGER PRIMARY KEY,
  purchase_bill_id INTEGER NOT NULL REFERENCES purchase_bill(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  mode TEXT NOT NULL CHECK (mode IN ('cash', 'upi', 'cheque', 'bank', 'other')),
  reference TEXT,
  paid_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  paid_by_user_id INTEGER NOT NULL REFERENCES user(id),
  cancelled_at TEXT,
  cancelled_by_user_id INTEGER REFERENCES user(id),
  cancel_reason TEXT
);
CREATE INDEX ix_supplier_payment_bill ON supplier_payment(purchase_bill_id);

-- Lab report: a test marked here always starts on a new printed page.
ALTER TABLE lab_test ADD COLUMN print_new_page INTEGER NOT NULL DEFAULT 0;

-- Pharmacists already receive stock (inventory.adjust); vendors and vendor
-- payments stay with supplier.manage (Manager + Admin by default).
