-- Every medicine needs a short, unique code staff can search/scan by,
-- distinct from its (sometimes ambiguous) name. Existing rows are backfilled
-- with a generated code so the column can be relied on as always-populated
-- (SQLite can't add a NOT NULL column with no default to a populated table
-- in one step, so "required" for new rows is enforced in the API layer
-- instead, per apps/server/src/routes/medicines.ts).
ALTER TABLE medicine ADD COLUMN medical_code TEXT;

UPDATE medicine SET medical_code = 'MED-' || substr('000000' || id, -6, 6) WHERE medical_code IS NULL;

CREATE UNIQUE INDEX ux_medicine_medical_code ON medicine(medical_code);
