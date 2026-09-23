-- Pharmacy counter sales (POS): medicine sold over the counter, with or
-- without a registered patient. Kept separate from dispense_log, which
-- requires a patient + visit; a walk-in buying paracetamol has neither.
CREATE TABLE pharmacy_sale (
  id INTEGER PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  sold_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  patient_id INTEGER REFERENCES patient(id),
  customer_name TEXT,
  customer_phone TEXT,
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  amount_received_cents INTEGER,
  notes TEXT,
  sold_by_user_id INTEGER NOT NULL REFERENCES user(id),
  voided_at TEXT,
  void_reason TEXT,
  voided_by_user_id INTEGER REFERENCES user(id)
);
CREATE INDEX ix_pharmacy_sale_sold_at ON pharmacy_sale(sold_at);

-- One row per batch the stock came from (like dispense_log), so cancelling
-- a sale puts each unit back into the exact batch it was taken from.
-- Name/price/expiry are snapshots: a reprinted receipt never changes.
CREATE TABLE pharmacy_sale_line (
  id INTEGER PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES pharmacy_sale(id),
  medicine_id INTEGER NOT NULL REFERENCES medicine(id),
  medicine_batch_id INTEGER NOT NULL REFERENCES medicine_batch(id),
  medicine_name TEXT NOT NULL,
  expiry_date TEXT,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);
CREATE INDEX ix_pharmacy_sale_line_sale ON pharmacy_sale_line(sale_id);
