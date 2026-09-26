import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';
import { createInvoice, getInvoice, getInvoiceDefaults, getUnbilledLabItems, type InvoiceLineInput, type SaveInvoiceInput } from './invoice-service.js';
import { getBillStatus } from './payment-service.js';
import { insertAuditLog } from './audit-service.js';
import { resolvePatientIds } from './patient-merge-service.js';
import { ConflictError, NotFoundError } from '../errors.js';

interface Actor {
  userId: number;
  role: Role;
}

/** Prescribed medicines (since pharmacy tracking) that are not on any bill yet. */
function unbilledMedicines(db: Database.Database, patientIds: number[]) {
  const placeholders = patientIds.map(() => '?').join(',');
  return (
    db
      .prepare(
        `SELECT pl.id, pl.visit_event_id, pl.quantity_prescribed, m.name, m.price_cents, v.visit_date
           FROM prescription_line pl
           JOIN visit_event v ON v.id = pl.visit_event_id AND v.deleted_at IS NULL
           JOIN medicine m ON m.id = pl.medicine_id
          WHERE v.patient_id IN (${placeholders}) AND pl.deleted_at IS NULL AND pl.before_pharmacy_tracking = 0
            AND NOT EXISTS (SELECT 1 FROM invoice_line l JOIN invoice i ON i.id = l.invoice_id AND i.deleted_at IS NULL
                             WHERE l.source_type = 'prescription_line' AND l.source_id = pl.id)
          ORDER BY v.visit_date, pl.id`,
      )
      .all(...patientIds) as {
      id: number;
      visit_event_id: number;
      quantity_prescribed: number;
      name: string;
      price_cents: number;
      visit_date: string;
    }[]
  ).map((r) => ({
    visitId: r.visit_event_id,
    orderedAt: r.visit_date,
    description: r.name,
    quantity: r.quantity_prescribed,
    unitPriceCents: r.price_cents,
    lineTotalCents: r.quantity_prescribed * r.price_cents,
    sourceType: 'prescription_line' as const,
    sourceId: r.id,
  }));
}

/** What one patient still has to pay: items not billed yet, and bills not fully paid. */
export function patientDues(db: Database.Database, patientId: number) {
  const ids = resolvePatientIds(db, patientId);
  const unbilled = [...unbilledMedicines(db, ids), ...getUnbilledLabItems(db, patientId)];
  const placeholders = ids.map(() => '?').join(',');
  const invoices = db
    .prepare(`SELECT id, invoice_number, invoice_date FROM invoice WHERE patient_id IN (${placeholders}) AND deleted_at IS NULL ORDER BY id`)
    .all(...ids) as { id: number; invoice_number: string; invoice_date: string }[];
  const unpaidBills = invoices
    .map((i) => ({ ...i, ...getBillStatus(db, i.id) }))
    .filter((b) => b.balanceCents > 0);
  return {
    unbilled,
    unbilledCents: unbilled.reduce((s, l) => s + l.lineTotalCents, 0),
    unpaidBills,
    unpaidCents: unpaidBills.reduce((s, b) => s + b.balanceCents, 0),
  };
}

/** Front desk list: every patient with something not billed or a bill not fully paid. */
export function pendingPatients(db: Database.Database) {
  const candidateIds = new Set<number>();
  const collect = (sql: string) => (db.prepare(sql).all() as { patient_id: number }[]).forEach((r) => candidateIds.add(r.patient_id));
  collect(
    `SELECT DISTINCT v.patient_id FROM prescription_line pl JOIN visit_event v ON v.id = pl.visit_event_id AND v.deleted_at IS NULL
      WHERE pl.deleted_at IS NULL AND pl.before_pharmacy_tracking = 0
        AND NOT EXISTS (SELECT 1 FROM invoice_line l JOIN invoice i ON i.id = l.invoice_id AND i.deleted_at IS NULL
                         WHERE l.source_type = 'prescription_line' AND l.source_id = pl.id)`,
  );
  collect(
    `SELECT DISTINCT o.patient_id FROM lab_order_item it JOIN lab_order o ON o.id = it.lab_order_id
      WHERE it.status != 'cancelled'
        AND NOT EXISTS (SELECT 1 FROM invoice_line l JOIN invoice i ON i.id = l.invoice_id AND i.deleted_at IS NULL
                         WHERE l.source_type = 'lab_order_item' AND l.source_id = it.id)`,
  );
  collect(`SELECT DISTINCT patient_id FROM invoice WHERE deleted_at IS NULL AND paid_before_tracking = 0`);

  const patientStmt = db.prepare(
    `SELECT id, customer_code, current_name, phone_number FROM patient WHERE id = ? AND deleted_at IS NULL AND status != 'merged'`,
  );
  const rows = [];
  for (const id of candidateIds) {
    const p = patientStmt.get(id) as { id: number } | undefined;
    if (!p) continue;
    const dues = patientDues(db, id);
    if (dues.unbilled.length === 0 && dues.unpaidBills.length === 0) continue;
    const oldest = [...dues.unbilled.map((u) => u.orderedAt), ...dues.unpaidBills.map((b) => b.invoice_date)].sort()[0] ?? null;
    rows.push({
      ...p,
      unbilledCount: dues.unbilled.length,
      unbilledCents: dues.unbilledCents,
      unpaidBills: dues.unpaidBills.length,
      unpaidCents: dues.unpaidCents,
      totalDueCents: dues.unbilledCents + dues.unpaidCents,
      since: oldest,
    });
  }
  return rows.sort((a, b) => String(a.since).localeCompare(String(b.since)));
}

/**
 * "Take payment": puts everything not billed yet for this patient on one new
 * bill (medicines, lab tests, and the default doctor fee when a doctor visit
 * is on it for the first time). Returns the new bill's id.
 */
export function createQuickBill(db: Database.Database, patientId: number, actor: Actor): { id: number; invoiceNumber: string } {
  return db.transaction(() => {
    if (!db.prepare('SELECT id FROM patient WHERE id = ? AND deleted_at IS NULL').get(patientId)) {
      throw new NotFoundError('Patient not found');
    }
    const dues = patientDues(db, patientId);
    if (dues.unbilled.length === 0) throw new ConflictError('Nothing new to bill for this patient.');

    const visitIds = [...new Set(dues.unbilled.filter((u) => 'visitId' in u).map((u) => (u as { visitId: number }).visitId))];
    const newVisit = visitIds.some((vid) => !db.prepare('SELECT 1 FROM invoice_visit iv JOIN invoice i ON i.id = iv.invoice_id AND i.deleted_at IS NULL WHERE iv.visit_event_id = ?').get(vid));
    const defaults = getInvoiceDefaults(db);
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const lines: InvoiceLineInput[] = dues.unbilled.map((u) => ({
      description: u.description,
      quantity: u.quantity,
      unitPriceCents: u.unitPriceCents,
      sourceType: u.sourceType,
      sourceId: u.sourceId,
    }));
    const created = createInvoice(
      db,
      {
        patientId,
        visitEventIds: visitIds,
        invoiceDate: today,
        doctorFeeCents: newVisit ? defaults.doctorFeeCents : 0,
        consultantFeeCents: 0,
        otherFeeCents: 0,
        otherFeeLabel: defaults.otherFeeLabel,
        discountCents: 0,
        notes: null,
        lines,
      },
      actor.userId,
    );
    insertAuditLog(db, {
      entityType: 'invoice',
      entityId: created.id,
      action: 'create_quick',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { invoiceNumber: created.invoiceNumber, patientId, items: lines.length },
    });
    return created;
  })();
}

/**
 * For "Create invoice": this patient's bills that are not fully paid.
 * Ones with no payment yet can be merged into the new bill (their lines,
 * fees and visits move over); part-paid ones stay as they are, to be paid
 * on their own bill.
 */
export function unpaidBillsForNewInvoice(db: Database.Database, patientId: number) {
  const { unpaidBills } = patientDues(db, patientId);
  const mergeable = unpaidBills
    .filter((b) => b.paidCents === 0)
    .map((b) => {
      const full = getInvoice(db, b.id)!;
      return {
        id: b.id,
        invoiceNumber: b.invoice_number,
        invoiceDate: b.invoice_date,
        totalCents: b.totalCents,
        doctorFeeCents: full.invoice.doctor_fee_cents as number,
        consultantFeeCents: full.invoice.consultant_fee_cents as number,
        otherFeeCents: full.invoice.other_fee_cents as number,
        discountCents: full.invoice.discount_cents as number,
        visitIds: full.visitIds as number[],
        lines: full.lines.map((l) => ({
          description: l.description as string,
          quantity: l.quantity as number,
          unitPriceCents: l.unit_price_cents as number,
          lineTotalCents: l.line_total_cents as number,
          sourceType: l.source_type as 'prescription_line' | 'lab_order_item' | null,
          sourceId: l.source_id as number | null,
        })),
      };
    });
  const partPaid = unpaidBills
    .filter((b) => b.paidCents > 0)
    .map((b) => ({ id: b.id, invoiceNumber: b.invoice_number, invoiceDate: b.invoice_date, balanceCents: b.balanceCents }));
  return { mergeable, partPaid };
}

/**
 * Saves a new bill, first folding in the given unpaid bills (no payment
 * taken on them): those are soft-deleted and their visits linked to the new
 * bill. The caller sends the merged bills' lines and fees in `input`.
 */
export function createInvoiceMerging(
  db: Database.Database,
  input: SaveInvoiceInput,
  mergeInvoiceIds: number[],
  actor: Actor,
): { id: number; invoiceNumber: string } {
  return db.transaction(() => {
    const patientIds = new Set(resolvePatientIds(db, input.patientId));
    const visitIds = new Set(input.visitEventIds);
    const merged: { id: number; invoiceNumber: string }[] = [];
    for (const id of new Set(mergeInvoiceIds)) {
      const inv = db
        .prepare('SELECT id, invoice_number, patient_id, paid_before_tracking FROM invoice WHERE id = ? AND deleted_at IS NULL')
        .get(id) as { id: number; invoice_number: string; patient_id: number; paid_before_tracking: number } | undefined;
      if (!inv || !patientIds.has(inv.patient_id)) throw new NotFoundError('A bill to combine was not found for this patient.');
      if (inv.paid_before_tracking) throw new ConflictError(`Bill ${inv.invoice_number} is already paid.`);
      if (db.prepare('SELECT 1 FROM invoice_payment WHERE invoice_id = ? AND cancelled_at IS NULL LIMIT 1').get(id)) {
        throw new ConflictError(`Bill ${inv.invoice_number} already has a payment. Take the rest of the payment on that bill.`);
      }
      (db.prepare('SELECT visit_event_id FROM invoice_visit WHERE invoice_id = ?').all(id) as { visit_event_id: number }[]).forEach((r) =>
        visitIds.add(r.visit_event_id),
      );
      db.prepare(`UPDATE invoice SET deleted_at = datetime('now', 'localtime') WHERE id = ?`).run(id);
      merged.push({ id, invoiceNumber: inv.invoice_number });
    }
    const created = createInvoice(db, { ...input, visitEventIds: [...visitIds] }, actor.userId);
    for (const m of merged) {
      insertAuditLog(db, {
        entityType: 'invoice',
        entityId: m.id,
        action: 'merge',
        performedByUserId: actor.userId,
        performedByRole: actor.role,
        detail: { invoiceNumber: m.invoiceNumber, mergedInto: created.invoiceNumber, mergedIntoId: created.id },
      });
    }
    return created;
  })();
}
