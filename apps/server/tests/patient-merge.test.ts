import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createDispenseService } from '../src/services/dispense-service.js';
import { mergePatients, resolvePatientIds } from '../src/services/patient-merge-service.js';
import { createTempDbPath, setupTestDb, seedBasicFixtures, addBatch, cleanupDb } from './helpers.js';

describe('patient merge correctness', () => {
  let db: Database.Database;
  let dbPath: string;
  let fixtures: ReturnType<typeof seedBasicFixtures>;

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    fixtures = seedBasicFixtures(db);
  });

  afterEach(() => {
    cleanupDb(db, dbPath);
  });

  it("a merged patient's dispense history and charge total include rows written under the losing id", () => {
    // Dispense to the "losing" patient (fixtures.patientId) before merging.
    addBatch(db, fixtures.medicineId, { lotNumber: 'B1', expiryDate: '2027-01-01', quantity: 10 });
    const { dispense } = createDispenseService(db);
    dispense({
      patientId: fixtures.patientId,
      medicineId: fixtures.medicineId,
      quantity: 3,
      visitEventId: fixtures.visitEventId,
      staffUserId: fixtures.pharmacistId,
      staffRole: 'pharmacist',
    });

    // Create a second, surviving patient and dispense to them too.
    const survivor = db
      .prepare(`INSERT INTO patient (customer_code, current_name, status) VALUES ('PT-0002', 'Survivor', 'active')`)
      .run();
    const survivorId = Number(survivor.lastInsertRowid);
    const survivorVisit = db
      .prepare(`INSERT INTO visit_event (patient_id, visit_date) VALUES (?, date('now'))`)
      .run(survivorId);
    dispense({
      patientId: survivorId,
      medicineId: fixtures.medicineId,
      quantity: 2,
      visitEventId: Number(survivorVisit.lastInsertRowid),
      staffUserId: fixtures.pharmacistId,
      staffRole: 'pharmacist',
    });

    mergePatients(db, {
      survivingPatientId: survivorId,
      mergedPatientId: fixtures.patientId,
      performedByUserId: fixtures.pharmacistId,
      performedByRole: 'pharmacist',
    });

    const allIds = resolvePatientIds(db, survivorId);
    expect(allIds.sort()).toEqual([fixtures.patientId, survivorId].sort());

    // Also resolves correctly when queried via the now-merged (losing) id.
    const idsFromLosingId = resolvePatientIds(db, fixtures.patientId);
    expect(idsFromLosingId.sort()).toEqual([fixtures.patientId, survivorId].sort());

    const placeholders = allIds.map(() => '?').join(',');
    const totalCharge = (
      db
        .prepare(`SELECT COALESCE(SUM(line_total_cents),0) as total FROM dispense_log WHERE patient_id IN (${placeholders})`)
        .get(...allIds) as any
    ).total;

    // 3 units + 2 units at 100 cents/unit = 500 cents total, spanning both ids.
    expect(totalCharge).toBe(500);

    // Sanity: a bare patient_id filter on the losing id alone would miss the survivor's dispense.
    const partialCharge = (
      db
        .prepare(`SELECT COALESCE(SUM(line_total_cents),0) as total FROM dispense_log WHERE patient_id = ?`)
        .get(fixtures.patientId) as any
    ).total;
    expect(partialCharge).toBe(300);
    expect(partialCharge).toBeLessThan(totalCharge);
  });
});
