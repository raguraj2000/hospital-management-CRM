CREATE TABLE supplier (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE TABLE medicine (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  pack_size INTEGER NOT NULL DEFAULT 1,
  conversion_factor REAL NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 0,
  preferred_supplier_id INTEGER REFERENCES supplier(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  deleted_at TEXT
);

CREATE TABLE medicine_batch (
  id INTEGER PRIMARY KEY,
  medicine_id INTEGER NOT NULL REFERENCES medicine(id),
  lot_number TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  quantity_received INTEGER NOT NULL,
  quantity_remaining INTEGER NOT NULL,
  supplier_id INTEGER REFERENCES supplier(id),
  received_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX ix_batch_medicine_expiry ON medicine_batch(medicine_id, expiry_date)
  WHERE quantity_remaining > 0 AND is_active = 1;

CREATE TABLE stock_adjustment (
  id INTEGER PRIMARY KEY,
  medicine_batch_id INTEGER NOT NULL REFERENCES medicine_batch(id),
  quantity_delta INTEGER NOT NULL,
  reason_code TEXT NOT NULL,
  notes TEXT,
  performed_by_user_id INTEGER NOT NULL REFERENCES user(id),
  performed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
