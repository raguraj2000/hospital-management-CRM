import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createDispenseService, createVoidDispenseService } from '../src/services/dispense-service.js';
import { InsufficientStockError } from '../src/errors.js';
import { createTempDbPath, setupTestDb, seedBasicFixtures, addBatch, cleanupDb } from './helpers.js';

describe('dispense-service FEFO', () => {
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

  it('pulls from the nearest-expiry batch first, spilling into the next when exhausted', () => {
    const nearBatch = addBatch(db, fixtures.medicineId, { lotNumber: 'NEAR', expiryDate: '2027-06-01', quantity: 5 });
    const farBatch = addBatch(db, fixtures.medicineId, { lotNumber: 'FAR', expiryDate: '2028-01-01', quantity: 20 });

    const { dispense } = createDispenseService(db);
    const allocations = dispense({
      patientId: fixtures.patientId,
      medicineId: fixtures.medicineId,
      quantity: 8,
      visitEventId: fixtures.visitEventId,
      staffUserId: fixtures.pharmacistId,
      staffRole: 'pharmacist',
    });

    expect(allocations).toEqual([
      { batchId: nearBatch, quantityTaken: 5, dispenseLogId: expect.any(Number) },
      { batchId: farBatch, quantityTaken: 3, dispenseLogId: expect.any(Number) },
    ]);

    const near = db.prepare('SELECT quantity_remaining FROM medicine_batch WHERE id = ?').get(nearBatch) as any;
    const far = db.prepare('SELECT quantity_remaining FROM medicine_batch WHERE id = ?').get(farBatch) as any;
    expect(near.quantity_remaining).toBe(0);
    expect(far.quantity_remaining).toBe(17);
  });

  it('skips expired batches entirely, never auto-dispensing them', () => {
    addBatch(db, fixtures.medicineId, { lotNumber: 'EXPIRED', expiryDate: '2020-01-01', quantity: 100 });
    const goodBatch = addBatch(db, fixtures.medicineId, { lotNumber: 'GOOD', expiryDate: '2027-01-01', quantity: 10 });

    const { dispense } = createDispenseService(db);
    const allocations = dispense({
      patientId: fixtures.patientId,
      medicineId: fixtures.medicineId,
      quantity: 5,
      visitEventId: fixtures.visitEventId,
      staffUserId: fixtures.pharmacistId,
      staffRole: 'pharmacist',
    });

    expect(allocations).toEqual([{ batchId: goodBatch, quantityTaken: 5, dispenseLogId: expect.any(Number) }]);
  });

  it('rolls back cleanly with no partial decrement when stock is insufficient', () => {
    const batch = addBatch(db, fixtures.medicineId, { lotNumber: 'ONLY', expiryDate: '2027-01-01', quantity: 3 });

    const { dispense } = createDispenseService(db);
    expect(() =>
      dispense({
        patientId: fixtures.patientId,
        medicineId: fixtures.medicineId,
        quantity: 10,
        visitEventId: fixtures.visitEventId,
        staffUserId: fixtures.pharmacistId,
        staffRole: 'pharmacist',
      }),
    ).toThrow(InsufficientStockError);

    const row = db.prepare('SELECT quantity_remaining FROM medicine_batch WHERE id = ?').get(batch) as any;
    expect(row.quantity_remaining).toBe(3); // untouched
    const logCount = (db.prepare('SELECT COUNT(*) as c FROM dispense_log').get() as any).c;
    expect(logCount).toBe(0);
  });

  it('records unit_price_cents/line_total_cents as a snapshot at dispense time', () => {
    addBatch(db, fixtures.medicineId, { lotNumber: 'B1', expiryDate: '2027-01-01', quantity: 10 });
    const { dispense } = createDispenseService(db);
    dispense({
      patientId: fixtures.patientId,
      medicineId: fixtures.medicineId,
      quantity: 4,
      visitEventId: fixtures.visitEventId,
      staffUserId: fixtures.pharmacistId,
      staffRole: 'pharmacist',
    });
    const log = db.prepare('SELECT unit_price_cents, line_total_cents FROM dispense_log').get() as any;
    expect(log.unit_price_cents).toBe(100);
    expect(log.line_total_cents).toBe(400);
  });

  it('voiding reverses stock via a new adjustment without mutating the original row', () => {
    const batch = addBatch(db, fixtures.medicineId, { lotNumber: 'B1', expiryDate: '2027-01-01', quantity: 10 });
    const { dispense } = createDispenseService(db);
    const [{ dispenseLogId }] = dispense({
      patientId: fixtures.patientId,
      medicineId: fixtures.medicineId,
      quantity: 4,
      visitEventId: fixtures.visitEventId,
      staffUserId: fixtures.pharmacistId,
      staffRole: 'pharmacist',
    });

    const { voidDispense } = createVoidDispenseService(db);
    voidDispense({ dispenseLogId, reason: 'mistaken entry', staffUserId: fixtures.pharmacistId, staffRole: 'pharmacist' });

    const log = db.prepare('SELECT quantity_dispensed, voided_at, void_reason FROM dispense_log WHERE id = ?').get(dispenseLogId) as any;
    expect(log.quantity_dispensed).toBe(4); // original row untouched except void fields
    expect(log.voided_at).not.toBeNull();
    expect(log.void_reason).toBe('mistaken entry');

    const batchRow = db.prepare('SELECT quantity_remaining FROM medicine_batch WHERE id = ?').get(batch) as any;
    expect(batchRow.quantity_remaining).toBe(10); // restored

    const adjustment = db.prepare('SELECT quantity_delta FROM stock_adjustment WHERE medicine_batch_id = ?').get(batch) as any;
    expect(adjustment.quantity_delta).toBe(4);
  });

  it('refuses to dispense to a merged or deceased patient', () => {
    db.prepare(`UPDATE patient SET status = 'deceased' WHERE id = ?`).run(fixtures.patientId);
    addBatch(db, fixtures.medicineId, { lotNumber: 'B1', expiryDate: '2027-01-01', quantity: 10 });
    const { dispense } = createDispenseService(db);
    expect(() =>
      dispense({
        patientId: fixtures.patientId,
        medicineId: fixtures.medicineId,
        quantity: 1,
        visitEventId: fixtures.visitEventId,
        staffUserId: fixtures.pharmacistId,
        staffRole: 'pharmacist',
      }),
    ).toThrow(/deceased/);
  });
});
