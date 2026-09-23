import type Database from 'better-sqlite3';
import { NotFoundError } from '../errors.js';
import { resolvePatientIds } from './patient-merge-service.js';

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface InvoiceFees {
  doctorFeeCents: number;
  consultantFeeCents: number;
  otherFeeCents: number;
  otherFeeLabel: string | null;
  discountCents: number;
}

export interface SaveInvoiceInput extends InvoiceFees {
  patientId: number;
  visitEventIds: number[];
  invoiceDate: string;
  notes: string | null;
  lines: InvoiceLineInput[];
}

function setting(db: Database.Database, key: string, fallback = ''): string {
  try {
    const row = db.prepare('SELECT value FROM app_setting WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export interface ClinicHeader {
  name: string;
  addressLine: string;
  doctorName: string;
  doctorTitle: string;
  phone: string;
}

/** Letterhead for printed bills, editable in app_setting. */
export function getClinicHeader(db: Database.Database): ClinicHeader {
  return {
    name: setting(db, 'clinic.name', 'Aathi Hospital'),
    addressLine: setting(db, 'clinic.addressLine', 'Puduvettakudi'),
    doctorName: setting(db, 'clinic.doctorName', 'Dr. Suthakar'),
    doctorTitle: setting(db, 'clinic.doctorTitle', 'Doctor & MD'),
    phone: setting(db, 'clinic.phone', '9655125145'),
  };
}

export function getInvoiceDefaults(db: Database.Database) {
  return {
    doctorFeeCents: Number(setting(db, 'invoice.defaultDoctorFeeCents', '0')) || 0,
    consultantFeeCents: Number(setting(db, 'invoice.defaultConsultantFeeCents', '0')) || 0,
    otherFeeLabel: setting(db, 'invoice.defaultOtherFeeLabel', 'Other charges'),
  };
}

/** INV-000001, INV-000002, ... unique per clinic. */
function nextInvoiceNumber(db: Database.Database): string {
  const row = db
    .prepare(`SELECT invoice_number FROM invoice ORDER BY id DESC LIMIT 1`)
    .get() as { invoice_number: string } | undefined;
  const lastNumber = row ? Number(row.invoice_number.replace(/\D/g, '')) : 0;
  return `INV-${String(lastNumber + 1).padStart(6, '0')}`;
}

export interface VisitForBilling {
  id: number;
  visit_date: string;
  notes: string | null;
  attending_doctor_name: string | null;
  invoiced_on: string | null;
  lines: { description: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
}

/**
 * The single source both bill types use: everything dispensed on the given
 * visits, priced as it was dispensed (from dispense_log, so a later price
 * change never rewrites an old visit). "Bill this prescription" passes one
 * visit; "Create invoice" passes several.
 */
export function getVisitsForBilling(db: Database.Database, patientId: number, visitIds?: number[]): VisitForBilling[] {
  const allIds = resolvePatientIds(db, patientId);
  const patientPlaceholders = allIds.map(() => '?').join(',');
  const visitFilter = visitIds && visitIds.length > 0 ? `AND v.id IN (${visitIds.map(() => '?').join(',')})` : '';

  const visits = db
    .prepare(
      `SELECT v.id, v.visit_date, v.notes, u.full_name AS attending_doctor_name,
              (SELECT i.invoice_date FROM invoice_visit iv
                 JOIN invoice i ON i.id = iv.invoice_id AND i.deleted_at IS NULL
                WHERE iv.visit_event_id = v.id ORDER BY i.id DESC LIMIT 1) AS invoiced_on
         FROM visit_event v
         LEFT JOIN user u ON u.id = v.attending_doctor_id
        WHERE v.patient_id IN (${patientPlaceholders}) AND v.deleted_at IS NULL ${visitFilter}
        ORDER BY v.visit_date DESC, v.id DESC`,
    )
    .all(...allIds, ...(visitIds ?? [])) as Omit<VisitForBilling, 'lines'>[];

  const lineStmt = db.prepare(
    `SELECT m.name AS medicine_name, d.quantity_dispensed, d.unit_price_cents, d.line_total_cents
       FROM dispense_log d JOIN medicine m ON m.id = d.medicine_id
      WHERE d.visit_event_id = ? AND d.voided_at IS NULL
      ORDER BY d.id`,
  );

  return visits.map((v) => ({
    ...v,
    lines: (lineStmt.all(v.id) as any[]).map((l) => ({
      description: l.medicine_name,
      quantity: l.quantity_dispensed,
      unitPriceCents: l.unit_price_cents,
      lineTotalCents: l.line_total_cents,
    })),
  }));
}

export function computeTotals(lines: { quantity: number; unitPriceCents: number }[], fees: InvoiceFees) {
  const itemsCents = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
  const feesCents = fees.doctorFeeCents + fees.consultantFeeCents + fees.otherFeeCents;
  const totalCents = Math.max(0, itemsCents + feesCents - fees.discountCents);
  return { itemsCents, feesCents, totalCents };
}

export function createInvoice(
  db: Database.Database,
  input: SaveInvoiceInput,
  createdByUserId: number,
): { id: number; invoiceNumber: string } {
  const create = db.transaction(() => {
    const invoiceNumber = nextInvoiceNumber(db);
    const info = db
      .prepare(
        `INSERT INTO invoice (invoice_number, patient_id, visit_event_id, invoice_date, doctor_fee_cents,
                              consultant_fee_cents, other_fee_cents, other_fee_label, discount_cents, notes,
                              created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        invoiceNumber,
        input.patientId,
        input.visitEventIds.length === 1 ? input.visitEventIds[0] : null,
        input.invoiceDate,
        input.doctorFeeCents,
        input.consultantFeeCents,
        input.otherFeeCents,
        input.otherFeeLabel,
        input.discountCents,
        input.notes,
        createdByUserId,
      );
    const id = Number(info.lastInsertRowid);
    replaceLines(db, id, input.lines);
    const linkVisit = db.prepare('INSERT OR IGNORE INTO invoice_visit (invoice_id, visit_event_id) VALUES (?, ?)');
    for (const visitId of input.visitEventIds) linkVisit.run(id, visitId);
    return { id, invoiceNumber };
  });
  return create();
}

function replaceLines(db: Database.Database, invoiceId: number, lines: InvoiceLineInput[]): void {
  db.prepare('DELETE FROM invoice_line WHERE invoice_id = ?').run(invoiceId);
  const insert = db.prepare(
    `INSERT INTO invoice_line (invoice_id, description, quantity, unit_price_cents, line_total_cents, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  lines.forEach((l, i) => {
    insert.run(invoiceId, l.description, l.quantity, l.unitPriceCents, l.quantity * l.unitPriceCents, i);
  });
}

export function updateInvoice(db: Database.Database, invoiceId: number, input: SaveInvoiceInput): void {
  const existing = db.prepare('SELECT id FROM invoice WHERE id = ? AND deleted_at IS NULL').get(invoiceId);
  if (!existing) throw new NotFoundError(`Invoice ${invoiceId} not found`);

  const update = db.transaction(() => {
    db.prepare(
      `UPDATE invoice SET invoice_date = ?, doctor_fee_cents = ?, consultant_fee_cents = ?, other_fee_cents = ?,
                          other_fee_label = ?, discount_cents = ?, notes = ?,
                          updated_at = datetime('now', 'localtime')
        WHERE id = ?`,
    ).run(
      input.invoiceDate,
      input.doctorFeeCents,
      input.consultantFeeCents,
      input.otherFeeCents,
      input.otherFeeLabel,
      input.discountCents,
      input.notes,
      invoiceId,
    );
    replaceLines(db, invoiceId, input.lines);
  });
  update();
}

export function getInvoice(db: Database.Database, invoiceId: number) {
  const invoice = db
    .prepare(
      `SELECT i.*, p.current_name AS patient_name, p.customer_code, p.phone_number, u.full_name AS created_by_name
         FROM invoice i
         JOIN patient p ON p.id = i.patient_id
         LEFT JOIN user u ON u.id = i.created_by_user_id
        WHERE i.id = ? AND i.deleted_at IS NULL`,
    )
    .get(invoiceId) as any;
  if (!invoice) return null;

  const lines = db
    .prepare('SELECT id, description, quantity, unit_price_cents, line_total_cents FROM invoice_line WHERE invoice_id = ? ORDER BY sort_order, id')
    .all(invoiceId) as any[];
  const visitIds = (db.prepare('SELECT visit_event_id FROM invoice_visit WHERE invoice_id = ?').all(invoiceId) as any[])
    .map((r) => r.visit_event_id);

  const totals = computeTotals(
    lines.map((l) => ({ quantity: l.quantity, unitPriceCents: l.unit_price_cents })),
    {
      doctorFeeCents: invoice.doctor_fee_cents,
      consultantFeeCents: invoice.consultant_fee_cents,
      otherFeeCents: invoice.other_fee_cents,
      otherFeeLabel: invoice.other_fee_label,
      discountCents: invoice.discount_cents,
    },
  );

  return { invoice, lines, visitIds, totals, clinic: getClinicHeader(db) };
}
