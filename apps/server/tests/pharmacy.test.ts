import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createSale, voidSale, getSale, listSales, todaySummary, expiringBatches } from '../src/services/pharmacy-service.js';
import { createTempDbPath, setupTestDb, seedBasicFixtures, addBatch, cleanupDb } from './helpers.js';

function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('pharmacy counter sales', () => {
  let db: Database.Database;
  let dbPath: string;
  let f: ReturnType<typeof seedBasicFixtures>;

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    f = seedBasicFixtures(db);
    db.prepare('UPDATE medicine SET price_cents = 250 WHERE id = ?').run(f.medicineId);
  });
  afterEach(() => cleanupDb(db, dbPath));

  const stock = (batchId: number) =>
    (db.prepare('SELECT quantity_remaining FROM medicine_batch WHERE id = ?').get(batchId) as any).quantity_remaining;

  const sell = (quantity: number, extra: Partial<Parameters<typeof createSale>[1]> = {}) =>
    createSale(db, {
      items: [{ medicineId: f.medicineId, quantity }],
      discountCents: 0,
      paymentMode: 'cash',
      soldByUserId: f.pharmacistId,
      soldByRole: 'pharmacist',
      ...extra,
    });

  it('sells nearest-expiry stock first, skips expired stock, and snapshots the price', () => {
    const expired = addBatch(db, f.medicineId, { lotNumber: 'OLD', expiryDate: isoInDays(-3), quantity: 50 });
    const near = addBatch(db, f.medicineId, { lotNumber: 'NEAR', expiryDate: isoInDays(20), quantity: 4 });
    const far = addBatch(db, f.medicineId, { lotNumber: 'FAR', expiryDate: isoInDays(400), quantity: 10 });

    const { id, receiptNumber } = sell(6, { customerName: 'Walk-in', discountCents: 100 });
    expect(receiptNumber).toBe('RCPT-000001');
    expect(stock(expired)).toBe(50); // never sold
    expect(stock(near)).toBe(0);
    expect(stock(far)).toBe(8);

    const { sale, lines } = getSale(db, id)! as any;
    expect(sale.subtotal_cents).toBe(1500);
    expect(sale.total_cents).toBe(1400);
    expect(lines).toHaveLength(1); // two batches merged into one receipt line
    expect(lines[0].quantity).toBe(6);

    db.prepare('UPDATE medicine SET price_cents = 9999 WHERE id = ?').run(f.medicineId);
    expect((getSale(db, id) as any).sale.total_cents).toBe(1400);
  });

  it('sells nothing at all if any item is short on stock', () => {
    const batch = addBatch(db, f.medicineId, { lotNumber: 'L', expiryDate: isoInDays(100), quantity: 3 });
    expect(() => sell(5)).toThrow(/Not enough Test Med in stock: 3 available/);
    expect(stock(batch)).toBe(3);
    expect(listSales(db, {}, 1, 20).total).toBe(0);
  });

  it('cancelling puts every unit back into the batch it came from, and only once', () => {
    const a = addBatch(db, f.medicineId, { lotNumber: 'A', expiryDate: isoInDays(10), quantity: 2 });
    const b = addBatch(db, f.medicineId, { lotNumber: 'B', expiryDate: isoInDays(90), quantity: 5 });
    const { id } = sell(4);
    expect([stock(a), stock(b)]).toEqual([0, 3]);

    voidSale(db, id, 'Customer returned', f.pharmacistId, 'pharmacist');
    expect([stock(a), stock(b)]).toEqual([2, 5]);
    expect(() => voidSale(db, id, 'again', f.pharmacistId, 'pharmacist')).toThrow(/already cancelled/);
    expect([stock(a), stock(b)]).toEqual([2, 5]);
  });

  it('a discount can never make the total negative', () => {
    addBatch(db, f.medicineId, { lotNumber: 'L', expiryDate: isoInDays(100), quantity: 10 });
    const { id } = sell(1, { discountCents: 99999 });
    expect((getSale(db, id) as any).sale.total_cents).toBe(0);
  });

  it("today's totals and history filters exclude cancelled sales", () => {
    addBatch(db, f.medicineId, { lotNumber: 'L', expiryDate: isoInDays(100), quantity: 20 });
    sell(2, { paymentMode: 'cash', customerName: 'Ravi' });
    sell(1, { paymentMode: 'upi', customerName: 'Meena' });
    const cancelled = sell(3, { paymentMode: 'cash' });
    voidSale(db, cancelled.id, 'x', f.pharmacistId, 'pharmacist');

    const t = todaySummary(db);
    expect(t.count).toBe(2);
    expect(t.totalCents).toBe(750);

    expect(listSales(db, { paymentMode: 'upi' }, 1, 20).total).toBe(1);
    expect(listSales(db, { q: 'Ravi' }, 1, 20).total).toBe(1);
    expect(listSales(db, {}, 1, 20).total).toBe(2);
    expect(listSales(db, { includeVoided: true }, 1, 20).total).toBe(3);
  });

  it('flags batches expiring within 30 days, and already-expired ones, but not later ones', () => {
    addBatch(db, f.medicineId, { lotNumber: 'EXPIRED', expiryDate: isoInDays(-1), quantity: 5 });
    addBatch(db, f.medicineId, { lotNumber: 'SOON', expiryDate: isoInDays(29), quantity: 5 });
    addBatch(db, f.medicineId, { lotNumber: 'LATER', expiryDate: isoInDays(31), quantity: 5 });
    addBatch(db, f.medicineId, { lotNumber: 'EMPTY', expiryDate: isoInDays(5), quantity: 0 });

    const rows = expiringBatches(db, 30);
    expect(rows.map((r) => r.lot_number)).toEqual(['EXPIRED', 'SOON']);
    expect(rows[0].expired).toBe(true);
    expect(rows[1].expired).toBe(false);
    expect(rows[1].days_left).toBe(29);
  });
});
