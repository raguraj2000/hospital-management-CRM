-- Medicine categories (Tablet, Syrup, Injection, ...), staff can add more.
CREATE TABLE medicine_category (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE UNIQUE INDEX ux_medicine_category_name ON medicine_category(name COLLATE NOCASE);

INSERT INTO medicine_category (name) VALUES
  ('Tablet'), ('Capsule'), ('Syrup'), ('Injection'), ('Ointment/Cream'), ('Drops'), ('Other');

ALTER TABLE medicine ADD COLUMN category_id INTEGER REFERENCES medicine_category(id);
