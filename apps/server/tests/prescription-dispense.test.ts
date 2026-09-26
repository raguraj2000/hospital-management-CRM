import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createFollowUpRoutes } from '../src/routes/follow-ups.js';
import { createTempDbPath, setupTestDb, seedBasicFixtures, addBatch, cleanupDb } from './helpers.js';

describe('saving a prescription (the doctor) does not take stock', () => {
  let db: Database.Database;
  let dbPath: string;
  let fixtures: ReturnType<typeof seedBasicFixtures>;
  let app: ReturnType<typeof createFollowUpRoutes>;

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    fixtures = seedBasicFixtures(db);
    app = createFollowUpRoutes(db);
  });

  afterEach(() => {
    cleanupDb(db, dbPath);
  });

  // Route auth middleware checks a real session row, not just any string --
  // insert one directly rather than going through the HTTP login endpoint.
  function fakeToken(userId: number): string {
    const token = `test-token-${userId}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, userId, expiresAt);
    return token;
  }

  it('records the prescription line but leaves stock for the pharmacist to give after payment', async () => {
    addBatch(db, fixtures.medicineId, { lotNumber: 'B1', expiryDate: '2027-01-01', quantity: 10 });
    const token = fakeToken(fixtures.doctorId);

    const res = await app.request(`/visits/${fixtures.visitEventId}/prescription-lines`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicineId: fixtures.medicineId, quantityPrescribed: 4, dosageInstructions: '1 tablet daily' }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    const line = db.prepare('SELECT * FROM prescription_line WHERE id = ?').get(body.id) as any;
    expect(line.quantity_prescribed).toBe(4);
    expect((db.prepare('SELECT COUNT(*) as c FROM dispense_log').get() as any).c).toBe(0);
    const batchRow = db.prepare('SELECT quantity_remaining FROM medicine_batch WHERE medicine_id = ?').get(fixtures.medicineId) as any;
    expect(batchRow.quantity_remaining).toBe(10);
  });

  it('can prescribe more than is in stock (the pharmacy sees the shortage when giving)', async () => {
    addBatch(db, fixtures.medicineId, { lotNumber: 'B1', expiryDate: '2027-01-01', quantity: 2 });
    const token = fakeToken(fixtures.doctorId);
    const res = await app.request(`/visits/${fixtures.visitEventId}/prescription-lines`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicineId: fixtures.medicineId, quantityPrescribed: 5 }),
    });
    expect(res.status).toBe(201);
  });

  it('lets dosage instructions and duration be edited after creation, without touching quantity or stock', async () => {
    addBatch(db, fixtures.medicineId, { lotNumber: 'B1', expiryDate: '2027-01-01', quantity: 10 });
    const token = fakeToken(fixtures.doctorId);

    const createRes = await app.request(`/visits/${fixtures.visitEventId}/prescription-lines`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicineId: fixtures.medicineId, quantityPrescribed: 3 }),
    });
    const { id: lineId } = (await createRes.json()) as any;

    const editRes = await app.request(`/visits/${fixtures.visitEventId}/prescription-lines/${lineId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dosageInstructions: 'Updated dosage', durationDays: 5 }),
    });
    expect(editRes.status).toBe(200);

    const line = db.prepare('SELECT * FROM prescription_line WHERE id = ?').get(lineId) as any;
    expect(line.dosage_instructions).toBe('Updated dosage');
    expect(line.duration_days).toBe(5);
    expect(line.quantity_prescribed).toBe(3); // unchanged

    const batchRow = db.prepare('SELECT quantity_remaining FROM medicine_batch WHERE medicine_id = ?').get(fixtures.medicineId) as any;
    expect(batchRow.quantity_remaining).toBe(10); // nothing given yet
  });
});
