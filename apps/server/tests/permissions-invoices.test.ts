import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { ALL_PERMISSIONS } from '@clinic/shared';
import {
  getPermissionsFor,
  hasPermission,
  setPermissionsFor,
  invalidatePermissionCache,
  getPermissionMatrix,
} from '../src/services/permission-service.js';
import { createInvoice, getInvoice, updateInvoice, getVisitsForBilling, computeTotals } from '../src/services/invoice-service.js';
import { createTempDbPath, setupTestDb, seedBasicFixtures, addBatch, cleanupDb } from './helpers.js';
import { createDispenseService } from '../src/services/dispense-service.js';

describe('role permissions (admin locked, others editable)', () => {
  let db: Database.Database;
  let dbPath: string;

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    invalidatePermissionCache();
  });
  afterEach(() => {
    invalidatePermissionCache();
    cleanupDb(db, dbPath);
  });

  it('starts with exactly the permissions each role had before (seeded by migration)', () => {
    expect(getPermissionsFor(db, 'front_desk').sort()).toEqual(
      ['patient.view', 'patient.create', 'patient.edit', 'inventory.view', 'invoice.view', 'invoice.manage', 'payment.receive'].sort(),
    );
    expect(hasPermission(db, 'doctor', 'patient.editMedicalInstructions')).toBe(true);
    expect(hasPermission(db, 'doctor', 'medicine.manage')).toBe(false);
    expect(hasPermission(db, 'pharmacist', 'inventory.adjust')).toBe(true);
  });

  it('admin always has every permission, even if rows are (somehow) removed', () => {
    expect(getPermissionsFor(db, 'admin').sort()).toEqual([...ALL_PERMISSIONS].sort());
    db.prepare("DELETE FROM role_permission WHERE role_name = 'admin'").run();
    setPermissionsFor(db, 'admin' as any, []); // what a malicious/buggy caller might try
    expect(hasPermission(db, 'admin', 'user.manage')).toBe(true);
    expect(hasPermission(db, 'admin', 'backup.configure')).toBe(true);
    expect(getPermissionMatrix(db).admin.sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it('granting and removing a permission for a non-admin role takes effect immediately', () => {
    expect(hasPermission(db, 'doctor', 'invoice.manage')).toBe(false);
    setPermissionsFor(db, 'doctor', ['patient.view', 'invoice.view', 'invoice.manage']);
    expect(hasPermission(db, 'doctor', 'invoice.manage')).toBe(true);
    expect(hasPermission(db, 'doctor', 'patient.editMedicalInstructions')).toBe(false); // removed

    setPermissionsFor(db, 'pharmacist', []);
    expect(getPermissionsFor(db, 'pharmacist')).toEqual([]);
  });

  it('ignores unknown permission strings instead of storing them', () => {
    setPermissionsFor(db, 'front_desk', ['patient.view', 'not.a.real.permission' as any]);
    expect(getPermissionsFor(db, 'front_desk')).toEqual(['patient.view']);
  });
});

describe('invoices', () => {
  let db: Database.Database;
  let dbPath: string;
  let fixtures: ReturnType<typeof seedBasicFixtures>;

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    fixtures = seedBasicFixtures(db);
  });
  afterEach(() => cleanupDb(db, dbPath));

  function dispenseSomething(quantity: number, unitPriceCents = 100) {
    db.prepare('UPDATE medicine SET price_cents = ? WHERE id = ?').run(unitPriceCents, fixtures.medicineId);
    addBatch(db, fixtures.medicineId, { lotNumber: 'L1', expiryDate: '2030-01-01', quantity: 1000 });
    const { dispense } = createDispenseService(db);
    dispense({
      patientId: fixtures.patientId,
      medicineId: fixtures.medicineId,
      quantity,
      visitEventId: fixtures.visitEventId,
      staffUserId: fixtures.pharmacistId,
      staffRole: 'pharmacist',
    });
  }

  it('builds a billing draft from what was actually dispensed on a visit', () => {
    dispenseSomething(3, 250);
    const visits = getVisitsForBilling(db, fixtures.patientId);
    const visit = visits.find((v) => v.id === fixtures.visitEventId)!;
    expect(visit.lines).toEqual([
      // An older dispense with no prescription line: still billed, just not linked to one.
      { description: 'Test Med', quantity: 3, unitPriceCents: 250, lineTotalCents: 750, sourceType: null, sourceId: null },
    ]);
    expect(visit.invoiced_on).toBeNull();
  });

  it('numbers invoices sequentially and totals items + fees - discount', () => {
    const input = {
      patientId: fixtures.patientId,
      visitEventIds: [fixtures.visitEventId],
      invoiceDate: '2026-09-23',
      doctorFeeCents: 20000,
      consultantFeeCents: 10000,
      otherFeeCents: 5000,
      otherFeeLabel: 'Dressing',
      discountCents: 2500,
      notes: 'Paid cash',
      lines: [{ description: 'Test Med', quantity: 3, unitPriceCents: 250 }],
    };
    const first = createInvoice(db, input, fixtures.doctorId);
    expect(first.invoiceNumber).toBe('INV-000001');
    const second = createInvoice(db, { ...input, visitEventIds: [] }, fixtures.doctorId);
    expect(second.invoiceNumber).toBe('INV-000002');

    const loaded = getInvoice(db, first.id)!;
    // 750 items + 35000 fees - 2500 discount
    expect(loaded.totals).toEqual({ itemsCents: 750, feesCents: 35000, totalCents: 33250 });
    expect(loaded.invoice.patient_name).toBe('Test Patient');
    expect(loaded.clinic.name).toBe('Aadhi Hospital');
    expect(loaded.clinic.doctorName).toBe('Dr. Suthakar');
    expect(loaded.clinic.phone).toBe('9655125145');
    expect(loaded.visitIds).toEqual([fixtures.visitEventId]);
  });

  it('is editable: lines and fees can be changed after it was created', () => {
    const { id } = createInvoice(
      db,
      {
        patientId: fixtures.patientId,
        visitEventIds: [],
        invoiceDate: '2026-09-23',
        doctorFeeCents: 0,
        consultantFeeCents: 0,
        otherFeeCents: 0,
        otherFeeLabel: null,
        discountCents: 0,
        notes: null,
        lines: [{ description: 'Old item', quantity: 1, unitPriceCents: 100 }],
      },
      fixtures.doctorId,
    );

    updateInvoice(db, id, {
      patientId: fixtures.patientId,
      visitEventIds: [],
      invoiceDate: '2026-09-24',
      doctorFeeCents: 15000,
      consultantFeeCents: 0,
      otherFeeCents: 0,
      otherFeeLabel: null,
      discountCents: 0,
      notes: 'Edited',
      lines: [
        { description: 'New item', quantity: 2, unitPriceCents: 300 },
        { description: 'Second item', quantity: 1, unitPriceCents: 50 },
      ],
    });

    const loaded = getInvoice(db, id)!;
    expect(loaded.lines.map((l: any) => l.description)).toEqual(['New item', 'Second item']);
    expect(loaded.invoice.notes).toBe('Edited');
    expect(loaded.totals.totalCents).toBe(600 + 50 + 15000);
  });

  it('keeps a printed bill unchanged when the medicine price changes later', () => {
    dispenseSomething(2, 500);
    const draft = getVisitsForBilling(db, fixtures.patientId).find((v) => v.id === fixtures.visitEventId)!;
    const { id } = createInvoice(
      db,
      {
        patientId: fixtures.patientId,
        visitEventIds: [fixtures.visitEventId],
        invoiceDate: '2026-09-23',
        doctorFeeCents: 0,
        consultantFeeCents: 0,
        otherFeeCents: 0,
        otherFeeLabel: null,
        discountCents: 0,
        notes: null,
        lines: draft.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
      },
      fixtures.doctorId,
    );

    db.prepare('UPDATE medicine SET price_cents = 9999 WHERE id = ?').run(fixtures.medicineId);
    db.prepare('UPDATE medicine SET deleted_at = datetime(\'now\') WHERE id = ?').run(fixtures.medicineId);

    const loaded = getInvoice(db, id)!;
    expect(loaded.lines[0].unit_price_cents).toBe(500);
    expect(loaded.totals.totalCents).toBe(1000);
  });

  it('marks a visit as already billed so it is not offered twice', () => {
    dispenseSomething(1);
    createInvoice(
      db,
      {
        patientId: fixtures.patientId,
        visitEventIds: [fixtures.visitEventId],
        invoiceDate: '2026-09-23',
        doctorFeeCents: 0, consultantFeeCents: 0, otherFeeCents: 0, otherFeeLabel: null, discountCents: 0,
        notes: null, lines: [],
      },
      fixtures.doctorId,
    );
    const visit = getVisitsForBilling(db, fixtures.patientId).find((v) => v.id === fixtures.visitEventId)!;
    expect(visit.invoiced_on).toBe('2026-09-23');
  });

  it('never goes negative when the discount is larger than the bill', () => {
    expect(
      computeTotals([{ quantity: 1, unitPriceCents: 100 }], {
        doctorFeeCents: 0, consultantFeeCents: 0, otherFeeCents: 0, otherFeeLabel: null, discountCents: 99999,
      }).totalCents,
    ).toBe(0);
  });
});
