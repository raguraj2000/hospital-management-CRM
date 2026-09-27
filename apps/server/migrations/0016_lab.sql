-- In-house laboratory: test catalog, orders, and results.
--
-- Results are PERMANENT. Once a technician saves the results for a test they
-- can never be changed or deleted -- not by the app (there is no route for
-- it) and not by anyone editing the database directly (the triggers below).
-- A wrong result is fixed by cancelling that test with a reason, which keeps
-- the original visible, and entering it again on a new replacement item.

-- The catalog. Editing a test here never changes old results: every order
-- item and result copies the name, price, unit and normal range it used.
CREATE TABLE lab_test (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  -- Report section it prints under, e.g. 'DEPARTMENT OF HEMATOLOGY'.
  department TEXT,
  sample_type TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- One row per value a test measures (e.g. CBC -> Haemoglobin, WBC, ...).
-- Numeric range: ref_low / ref_high (either may be NULL = no limit on that
-- side), with optional female-specific limits. Text results (Nil, Negative,
-- Clear) use ref_text as the normal answer. ref_display, when set, is
-- printed instead of the generated range (e.g. 'Non-pregnant: < 5').
-- options: JSON list of quick-pick answers (e.g. ["Nil","Trace","+"]).
-- no_flag: never mark this value high/low/abnormal (e.g. blood group).
CREATE TABLE lab_test_parameter (
  id INTEGER PRIMARY KEY,
  lab_test_id INTEGER NOT NULL REFERENCES lab_test(id),
  name TEXT NOT NULL,
  method TEXT,
  unit TEXT,
  ref_low REAL,
  ref_high REAL,
  ref_low_female REAL,
  ref_high_female REAL,
  ref_text TEXT,
  ref_display TEXT,
  options TEXT,
  no_flag INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_lab_test_parameter_test ON lab_test_parameter(lab_test_id, sort_order);

CREATE TABLE lab_order (
  id INTEGER PRIMARY KEY,
  order_number TEXT UNIQUE,
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  referring_doctor_id INTEGER REFERENCES user(id),
  notes TEXT,
  sample_collected_at TEXT,
  ordered_by_user_id INTEGER NOT NULL REFERENCES user(id),
  ordered_by_role TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX ix_lab_order_patient ON lab_order(patient_id, created_at);
CREATE INDEX ix_lab_order_created ON lab_order(created_at);

-- One row per test on an order. status: pending -> completed, or cancelled
-- (from pending: ordered by mistake; from completed: wrong result, which
-- also creates a new pending item pointing back via replaces_item_id).
CREATE TABLE lab_order_item (
  id INTEGER PRIMARY KEY,
  lab_order_id INTEGER NOT NULL REFERENCES lab_order(id),
  lab_test_id INTEGER NOT NULL REFERENCES lab_test(id),
  test_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TEXT,
  completed_by_user_id INTEGER REFERENCES user(id),
  cancelled_at TEXT,
  cancelled_by_user_id INTEGER REFERENCES user(id),
  cancel_reason TEXT,
  replaces_item_id INTEGER REFERENCES lab_order_item(id)
);
CREATE INDEX ix_lab_order_item_order ON lab_order_item(lab_order_id);
CREATE INDEX ix_lab_order_item_status ON lab_order_item(status);

-- A saved result, with a copy of the name/method/unit/range it was judged
-- against. flag: 'H' above range, 'L' below range, '!' a text answer that
-- isn't the normal one (e.g. Sugar '++' where normal is 'Nil'), NULL normal.
CREATE TABLE lab_result (
  id INTEGER PRIMARY KEY,
  lab_order_item_id INTEGER NOT NULL REFERENCES lab_order_item(id),
  parameter_id INTEGER REFERENCES lab_test_parameter(id),
  parameter_name TEXT NOT NULL,
  method TEXT,
  unit TEXT,
  reference_range TEXT,
  value TEXT NOT NULL,
  flag TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  entered_by_user_id INTEGER NOT NULL REFERENCES user(id),
  entered_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX ix_lab_result_item ON lab_result(lab_order_item_id, sort_order);

CREATE TRIGGER lab_result_no_update BEFORE UPDATE ON lab_result
BEGIN
  SELECT RAISE(ABORT, 'Lab results cannot be changed. Cancel the test with a reason and enter it again.');
END;

CREATE TRIGGER lab_result_no_delete BEFORE DELETE ON lab_result
BEGIN
  SELECT RAISE(ABORT, 'Lab results cannot be deleted. Cancel the test with a reason instead.');
END;

-- Results may only be added to a pending test.
CREATE TRIGGER lab_result_only_on_pending BEFORE INSERT ON lab_result
WHEN (SELECT status FROM lab_order_item WHERE id = NEW.lab_order_item_id) IS NOT 'pending'
BEGIN
  SELECT RAISE(ABORT, 'Results can only be entered for a pending test.');
END;

-- A finished test can only go completed -> cancelled; a cancelled one never changes.
CREATE TRIGGER lab_order_item_lock BEFORE UPDATE ON lab_order_item
WHEN OLD.status = 'cancelled'
  OR (OLD.status = 'completed' AND (
        NEW.status IS NOT 'cancelled'
        OR NEW.test_name IS NOT OLD.test_name
        OR NEW.price_cents IS NOT OLD.price_cents
        OR NEW.lab_test_id IS NOT OLD.lab_test_id
        OR NEW.lab_order_id IS NOT OLD.lab_order_id
        OR NEW.completed_at IS NOT OLD.completed_at
        OR NEW.completed_by_user_id IS NOT OLD.completed_by_user_id))
BEGIN
  SELECT RAISE(ABORT, 'A finished lab test can only be cancelled (with a reason), not changed.');
END;

-- The new role, plus its default permissions (editable later in Settings).
INSERT OR IGNORE INTO role (name) VALUES ('lab_technician');

INSERT OR IGNORE INTO role_permission (role_name, permission) VALUES
  ('lab_technician', 'patient.view'),
  ('lab_technician', 'lab.view'),
  ('lab_technician', 'lab.order'),
  ('lab_technician', 'lab.enterResults'),
  ('lab_technician', 'invoice.view'),
  ('lab_technician', 'invoice.manage'),
  ('doctor', 'lab.view'),
  ('doctor', 'lab.order'),
  ('manager', 'lab.view'),
  ('manager', 'lab.order'),
  ('manager', 'lab.manageTests');


-- Starter catalog, taken from the hospital's own lab report template
-- (aadhi-lab-report.html): departments, methods, ranges and quick-pick
-- answers. Prices start at 0 -- set them in Settings > Lab tests.

INSERT INTO lab_test (id, name, department, sample_type, sort_order) VALUES
  (1, 'Complete Blood Count', 'DEPARTMENT OF HEMATOLOGY', 'Blood (EDTA)', 1),
  (2, 'Differential Counts', 'DEPARTMENT OF HEMATOLOGY', 'Blood (EDTA)', 2),
  (3, 'Coagulation', 'DEPARTMENT OF HEMATOLOGY', 'Blood', 3),
  (4, 'Blood Grouping & Rh Typing', 'DEPARTMENT OF HEMATOLOGY', 'Blood (EDTA)', 4),
  (5, 'Blood Sugar', 'DEPARTMENT OF BIOCHEMISTRY', 'Blood (Fluoride)', 5),
  (6, 'Renal Function Test', 'DEPARTMENT OF BIOCHEMISTRY', 'Blood (Serum)', 6),
  (7, 'Liver Function Tests (LFT)', 'DEPARTMENT OF BIOCHEMISTRY', 'Blood (Serum)', 7),
  (8, 'Widal Card Test (IgM & IgG)', 'DEPARTMENT OF SEROLOGY', 'Blood (Serum)', 8),
  (9, 'Dengue NS1 Ag & Ab Test (IgM & IgG)', 'DEPARTMENT OF SEROLOGY', 'Blood (Serum)', 9),
  (10, 'Malaria Card Test', 'DEPARTMENT OF SEROLOGY', 'Blood', 10),
  (11, 'HBsAg (Hepatitis B)', 'DEPARTMENT OF SEROLOGY', 'Blood (Serum)', 11),
  (12, 'HCV (Hepatitis C)', 'DEPARTMENT OF SEROLOGY', 'Blood (Serum)', 12),
  (13, 'HIV I & II', 'DEPARTMENT OF SEROLOGY', 'Blood (Serum)', 13),
  (14, 'VDRL', 'DEPARTMENT OF SEROLOGY', 'Blood (Serum)', 14),
  (15, 'Urine Pregnancy Test', 'DEPARTMENT OF SEROLOGY', 'Urine', 15),
  (16, 'Serum Beta hCG (Quantitative)', 'DEPARTMENT OF SEROLOGY', 'Blood (Serum)', 16),
  (17, 'Urine Routine Analysis', 'DEPARTMENT OF CLINICAL PATHOLOGY', 'Urine', 17),
  (18, 'Urine Deposits (Microscopy)', 'DEPARTMENT OF CLINICAL PATHOLOGY', 'Urine', 18);

INSERT INTO lab_test_parameter (lab_test_id, name, method, unit, ref_low, ref_high, ref_text, ref_display, options, no_flag, sort_order) VALUES
  (1, 'Haemoglobin', '(WB-EDTA) Automated', 'gm/dl', 12.0, 15.0, NULL, NULL, NULL, 0, 1),
  (1, 'Total WBC Count', '(WB-EDTA) Automated', 'cells/cumm', 4000.0, 11000.0, NULL, NULL, NULL, 0, 2),
  (1, 'Red Blood Count (RBC)', '(WB-EDTA) Automated', 'Million/cumm', 3.5, 5.5, NULL, NULL, NULL, 0, 3),
  (1, 'Hematocrit (PCV)', '(WB-EDTA) Automated', '%', 36.0, 47.0, NULL, NULL, NULL, 0, 4),
  (1, 'Mean Corpuscular Volume (MCV)', '(WB-EDTA) Automated', 'fl', 79.0, 96.0, NULL, NULL, NULL, 0, 5),
  (1, 'Mean Corpuscular Hb (MCH)', '(WB-EDTA) Automated', 'pg', 27.0, 31.0, NULL, NULL, NULL, 0, 6),
  (1, 'Mean Corpuscular Hb Conc. (MCHC)', '(WB-EDTA) Automated', 'gm/dl', 32.0, 36.0, NULL, NULL, NULL, 0, 7),
  (1, 'Platelet Count', '(WB-EDTA) Automated', 'lakhs/cumm', 1.5, 4.5, NULL, NULL, NULL, 0, 8),
  (1, 'RDW-SD', '(WB-EDTA) Automated', 'fl', 37.0, 54.0, NULL, NULL, NULL, 0, 9),
  (1, 'RDW-CV', '(WB-EDTA) Automated', '%', 12.0, 15.0, NULL, NULL, NULL, 0, 10),
  (2, 'Neutrophils', '(WB-EDTA) Automated', '%', 42.0, 75.0, NULL, NULL, NULL, 0, 1),
  (2, 'Lymphocytes', '(WB-EDTA) Automated', '%', 20.0, 45.0, NULL, NULL, NULL, 0, 2),
  (2, 'Monocytes', '(WB-EDTA) Automated', '%', 0.0, 10.0, NULL, NULL, NULL, 0, 3),
  (2, 'Eosinophils', '(WB-EDTA) Automated', '%', 0.0, 6.0, NULL, NULL, NULL, 0, 4),
  (2, 'Basophils', '(WB-EDTA) Automated', '%', 0.0, 2.0, NULL, NULL, NULL, 0, 5),
  (3, 'Bleeding Time (BT)', 'Capillary Tube Method', 'mins', 2.0, 6.0, NULL, NULL, NULL, 0, 1),
  (3, 'Clotting Time (CT)', 'Capillary Tube Method', 'mins', 2.0, 8.0, NULL, NULL, NULL, 0, 2),
  (4, 'ABO Group', 'Slide Agglutination', NULL, NULL, NULL, NULL, NULL, '["A", "B", "AB", "O"]', 1, 1),
  (4, 'Rh (D) Typing', 'Slide Agglutination', NULL, NULL, NULL, NULL, NULL, '["POSITIVE", "NEGATIVE"]', 1, 2),
  (5, 'Fasting Blood Sugar (FBS)', 'Plasma, GOD-POD', 'mg/dl', 70.0, 100.0, NULL, NULL, NULL, 0, 1),
  (5, 'Post Prandial Blood Sugar (PPBS)', 'Plasma, GOD-POD', 'mg/dl', 70.0, 140.0, NULL, NULL, NULL, 0, 2),
  (5, 'HbA1c (Glycated Haemoglobin)', '(WB-EDTA) HPLC', '%', 4.0, 5.6, NULL, NULL, NULL, 0, 3),
  (6, 'Blood Urea', 'Serum Urease & GLDH', 'mg/dl', 10.0, 45.0, NULL, NULL, NULL, 0, 1),
  (6, 'Serum Creatinine', 'Serum Jaffes', 'mg/dl', 0.5, 1.2, NULL, NULL, NULL, 0, 2),
  (6, 'Uric Acid - Serum', 'Serum Enzymatic', 'mg/dl', 3.5, 7.2, NULL, NULL, NULL, 0, 3),
  (7, 'Bilirubin Total', 'Serum Diazo', 'mg/dl', 0.2, 1.2, NULL, NULL, NULL, 0, 1),
  (7, 'Bilirubin Direct', 'Serum Diazo', 'mg/dl', 0.0, 0.5, NULL, NULL, NULL, 0, 2),
  (7, 'Bilirubin Indirect', 'Calculated', 'mg/dl', 0.3, 1.0, NULL, NULL, NULL, 0, 3),
  (7, 'AST / SGOT', 'Serum, Kinetic - IFCC', 'U/L', 5.0, 36.0, NULL, NULL, NULL, 0, 4),
  (7, 'ALT / SGPT', 'Serum, Kinetic - IFCC', 'U/L', 0.0, 55.0, NULL, NULL, NULL, 0, 5),
  (7, 'Alkaline Phosphatase (ALP)', 'Serum, Kinetic - IFCC', 'U/L', 35.0, 150.0, NULL, NULL, NULL, 0, 6),
  (7, 'Total Protein', 'Serum Biuret', 'g/dl', 6.3, 8.2, NULL, NULL, NULL, 0, 7),
  (7, 'Serum Albumin', 'Serum, Bromocresol green', 'g/dl', 3.5, 5.0, NULL, NULL, NULL, 0, 8),
  (7, 'Serum Globulin', 'Calculated', 'g/dl', 2.5, 5.0, NULL, NULL, NULL, 0, 9),
  (8, 'Widal IgM Antibody', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 1),
  (8, 'Widal IgG Antibody', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 2),
  (9, 'Dengue NS1 Antigen', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 1),
  (9, 'Dengue IgM Antibody', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 2),
  (9, 'Dengue IgG Antibody', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 3),
  (10, 'P. falciparum Antigen', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 1),
  (10, 'P. vivax Antigen', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 2),
  (11, 'HBsAg', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 1),
  (12, 'HCV Antibody', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 1),
  (13, 'HIV I & II Antibody', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 1),
  (14, 'VDRL', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 1),
  (15, 'Urine hCG', 'Card Test', NULL, NULL, NULL, 'Negative', NULL, '["NEGATIVE", "POSITIVE"]', 0, 1),
  (16, 'Serum Beta hCG', 'CLIA', 'mIU/ml', NULL, NULL, NULL, 'Non-pregnant: < 5', NULL, 1, 1),
  (17, 'Colour', 'Visual', NULL, NULL, NULL, 'Pale yellow', NULL, '["Pale yellow", "Yellow", "Dark yellow", "Red"]', 1, 1),
  (17, 'Appearance', 'Visual', NULL, NULL, NULL, 'Clear', NULL, '["Clear", "Slightly turbid", "Turbid"]', 0, 2),
  (17, 'Specific Gravity', 'Reagent Strip', NULL, 1.005, 1.03, NULL, NULL, '["1.010", "1.015", "1.020", "1.025"]', 0, 3),
  (17, 'pH', 'Reagent Strip', NULL, 4.5, 8.0, NULL, NULL, '["5.0", "6.0", "7.0", "8.0"]', 0, 4),
  (17, 'Albumin', 'Reagent Strip', NULL, NULL, NULL, 'Nil', NULL, '["Nil", "Trace", "+", "++", "+++"]', 0, 5),
  (17, 'Sugar', 'Reagent Strip', NULL, NULL, NULL, 'Nil', NULL, '["Nil", "Trace", "+", "++", "+++"]', 0, 6),
  (17, 'Ketone Bodies', 'Reagent Strip', NULL, NULL, NULL, 'Nil', NULL, '["Nil", "+", "++"]', 0, 7),
  (17, 'Bile Salts', 'Fouchet / Hay''s Test', NULL, NULL, NULL, 'Absent', NULL, '["Absent", "Present"]', 0, 8),
  (17, 'Bile Pigments', 'Fouchet / Hay''s Test', NULL, NULL, NULL, 'Absent', NULL, '["Absent", "Present"]', 0, 9),
  (17, 'Urobilinogen', 'Reagent Strip', NULL, NULL, NULL, 'Normal', NULL, '["Normal", "Increased"]', 0, 10),
  (17, 'Blood', 'Reagent Strip', NULL, NULL, NULL, 'Nil', NULL, '["Nil", "+", "++"]', 0, 11),
  (18, 'Pus Cells', 'Microscopy', '/hpf', 0.0, 5.0, NULL, NULL, '["Nil", "1-2", "2-4", "4-6", "8-10"]', 0, 1),
  (18, 'Epithelial Cells', 'Microscopy', '/hpf', 0.0, 5.0, NULL, NULL, '["Nil", "1-2", "2-4", "Few"]', 0, 2),
  (18, 'RBCs', 'Microscopy', '/hpf', 0.0, 2.0, NULL, NULL, '["Nil", "1-2", "2-4"]', 0, 3),
  (18, 'Casts', 'Microscopy', NULL, NULL, NULL, 'Nil', NULL, '["Nil", "Present"]', 0, 4),
  (18, 'Crystals', 'Microscopy', NULL, NULL, NULL, 'Nil', NULL, '["Nil", "Calcium oxalate", "Uric acid", "Amorphous"]', 0, 5),
  (18, 'Bacteria', 'Microscopy', NULL, NULL, NULL, 'Nil', NULL, '["Nil", "Few", "Present"]', 0, 6),
  (18, 'Yeast Cells', 'Microscopy', NULL, NULL, NULL, 'Nil', NULL, '["Nil", "Present"]', 0, 7);
