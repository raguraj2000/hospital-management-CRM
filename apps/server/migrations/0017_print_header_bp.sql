-- 1. Hospital name: the app and the hospital say "Aadhi Hospital"; bills
--    printed "Aathi Hospital" from an old default. Only fixes the untouched
--    default, never a name someone typed in themselves.
UPDATE app_setting SET value = 'Aadhi Hospital', updated_at = datetime('now', 'localtime')
WHERE key = 'clinic.name' AND value = 'Aathi Hospital';

-- 2. Letterhead on every print (lab report, bill, pharmacy receipt), from
--    the hospital's own lab report design. Editable in Settings.
INSERT OR IGNORE INTO app_setting (key, value) VALUES
  ('print.name', 'அதி மருத்துவமனை'),
  ('print.address', 'மெயின் ரோடு, புதுவேட்டக்குடி'),
  ('print.doc1.name', 'Dr. சுதாகர்'),
  ('print.doc1.degree', 'MBBS MD.,'),
  ('print.doc1.role', 'பொது மற்றும் மயக்க மருத்துவர்'),
  ('print.doc2.name', 'Dr. லெட்சுமி தேவி'),
  ('print.doc2.degree', 'MBBS DNB OG'),
  ('print.doc2.role', 'மகப்பேறு மருத்துவர்'),
  -- Right-hand signature on lab reports (the left one is the technician).
  ('lab.signer.name', 'Dr. Lakshmi Devi'),
  ('lab.signer.degree', 'MBBS, DNB (OG)');
INSERT OR IGNORE INTO app_setting (key, value)
  SELECT 'print.phone', COALESCE((SELECT value FROM app_setting WHERE key = 'clinic.phone'), '');

-- 3. Blood pressure history: every reading kept with when and who, instead
--    of one value that gets overwritten. patient.blood_pressure stays as
--    "latest reading" so older screens keep working.
CREATE TABLE patient_bp_reading (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patient(id),
  blood_pressure TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  recorded_by_user_id INTEGER REFERENCES user(id)
);
CREATE INDEX ix_patient_bp_reading_patient ON patient_bp_reading(patient_id, recorded_at);

-- Existing values become each patient's first reading, dated when the
-- patient record was last saved (the best time we have for it).
INSERT INTO patient_bp_reading (patient_id, blood_pressure, recorded_at)
  SELECT id, trim(blood_pressure), updated_at FROM patient
  WHERE blood_pressure IS NOT NULL AND trim(blood_pressure) != '';
