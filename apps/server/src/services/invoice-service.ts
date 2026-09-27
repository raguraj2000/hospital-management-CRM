import type Database from 'better-sqlite3';
import { ConflictError, NotFoundError } from '../errors.js';
import { resolvePatientIds } from './patient-merge-service.js';

export type LineSourceType = 'prescription_line' | 'lab_order_item';

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
  /** What this line pays for (a prescribed medicine or a lab test); absent for typed-in lines. */
  sourceType?: LineSourceType | null;
  sourceId?: number | null;
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

export interface PrintDoctor {
  name: string;
  degree: string;
  role: string;
}

/** The letterhead at the top of every print (lab report, bill, receipt). */
export interface PrintHeader {
  name: string;
  address: string;
  phone: string;
  doctors: PrintDoctor[];
}

export interface ClinicHeader {
  name: string;
  addressLine: string;
  doctorName: string;
  doctorTitle: string;
  phone: string;
  print: PrintHeader;
}

export const PRINT_HEADER_KEYS = [
  'print.name',
  'print.address',
  'print.phone',
  'print.doc1.name',
  'print.doc1.degree',
  'print.doc1.role',
  'print.doc2.name',
  'print.doc2.degree',
  'print.doc2.role',
] as const;

export function getPrintHeader(db: Database.Database): PrintHeader {
  const doctor = (n: 1 | 2): PrintDoctor => ({
    name: setting(db, `print.doc${n}.name`, ''),
    degree: setting(db, `print.doc${n}.degree`, ''),
    role: setting(db, `print.doc${n}.role`, ''),
  });
  return {
    name: setting(db, 'print.name', setting(db, 'clinic.name', 'Aadhi Hospital')),
    address: setting(db, 'print.address', setting(db, 'clinic.addressLine', '')),
    phone: setting(db, 'print.phone', ''),
    doctors: [doctor(1), doctor(2)].filter((d) => d.name.trim()),
  };
}

/** Clinic details for bills (editable in app_setting), plus the shared print letterhead. */
export function getClinicHeader(db: Database.Database): ClinicHeader {
  return {
    name: setting(db, 'clinic.name', 'Aadhi Hospital'),
    addressLine: setting(db, 'clinic.addressLine', 'Puduvettakudi'),
    doctorName: setting(db, 'clinic.doctorName', 'Dr. Suthakar'),
    doctorTitle: setting(db, 'clinic.doctorTitle', 'Doctor & MD'),
    phone: setting(db, 'clinic.phone', '9655125145'),
    print: getPrintHeader(db),
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
  /** The latest bill this visit is on (null if not billed). */
  invoice_id: number | null;
  lines: {
    description: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    sourceType: LineSourceType | null;
    sourceId: number | null;
  }[];
}

/**
 * The single source both bill types use: everything prescribed on the given
 * visits, one line per medicine. A medicine already given is priced as it
 * was dispensed (from dispense_log, so a later price change never rewrites
 * an old visit); one still waiting at the pharmacy is priced at today's
 * price, because it's paid before it is given. "Bill this prescription"
 * passes one visit; "Create invoice" passes several.
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
                WHERE iv.visit_event_id = v.id ORDER BY i.id DESC LIMIT 1) AS invoiced_on,
              (SELECT i.id FROM invoice_visit iv
                 JOIN invoice i ON i.id = iv.invoice_id AND i.deleted_at IS NULL
                WHERE iv.visit_event_id = v.id ORDER BY i.id DESC LIMIT 1) AS invoice_id
         FROM visit_event v
         LEFT JOIN user u ON u.id = v.attending_doctor_id
        WHERE v.patient_id IN (${patientPlaceholders}) AND v.deleted_at IS NULL ${visitFilter}
        ORDER BY v.visit_date DESC, v.id DESC`,
    )
    .all(...allIds, ...(visitIds ?? [])) as Omit<VisitForBilling, 'lines'>[];

  const prescribedStmt = db.prepare(
    `SELECT pl.id, m.name AS medicine_name, pl.quantity_prescribed, m.price_cents,
            (SELECT SUM(d.quantity_dispensed) FROM dispense_log d WHERE d.prescription_line_id = pl.id AND d.voided_at IS NULL) AS given_qty,
            (SELECT SUM(d.line_total_cents) FROM dispense_log d WHERE d.prescription_line_id = pl.id AND d.voided_at IS NULL) AS given_total,
            (SELECT MIN(d.unit_price_cents) FROM dispense_log d WHERE d.prescription_line_id = pl.id AND d.voided_at IS NULL) AS given_price
       FROM prescription_line pl JOIN medicine m ON m.id = pl.medicine_id
      WHERE pl.visit_event_id = ? AND pl.deleted_at IS NULL
        -- An old prescription that was never dispensed has nothing to bill.
        AND (pl.before_pharmacy_tracking = 0
             OR EXISTS (SELECT 1 FROM dispense_log d WHERE d.prescription_line_id = pl.id AND d.voided_at IS NULL))
      ORDER BY pl.id`,
  );
  // Dispenses with no prescription line (older ad-hoc ones) still bill as before.
  const adHocStmt = db.prepare(
    `SELECT m.name AS medicine_name, d.quantity_dispensed, d.unit_price_cents, d.line_total_cents
       FROM dispense_log d JOIN medicine m ON m.id = d.medicine_id
      WHERE d.visit_event_id = ? AND d.prescription_line_id IS NULL AND d.voided_at IS NULL
      ORDER BY d.id`,
  );

  return visits.map((v) => {
    const prescribed = (prescribedStmt.all(v.id) as any[]).map((l) => {
      const given = l.given_qty != null;
      const quantity = given ? l.given_qty : l.quantity_prescribed;
      const unitPriceCents = given ? l.given_price : l.price_cents;
      return {
        description: l.medicine_name,
        quantity,
        unitPriceCents,
        lineTotalCents: given ? l.given_total : quantity * unitPriceCents,
        sourceType: 'prescription_line' as const,
        sourceId: l.id as number,
      };
    });
    const adHoc = (adHocStmt.all(v.id) as any[]).map((l) => ({
      description: l.medicine_name,
      quantity: l.quantity_dispensed,
      unitPriceCents: l.unit_price_cents,
      lineTotalCents: l.line_total_cents,
      sourceType: null,
      sourceId: null,
    }));
    return { ...v, lines: [...prescribed, ...adHoc] };
  });
}

/**
 * For a new bill: drop what is already on a bill. A prescribed medicine is
 * checked line by line (one added after the visit was billed can still be
 * billed); ad-hoc dispense lines have no source, so they go with the visit.
 * A billed visit with nothing left to bill is dropped.
 */
export function withoutBilledLines(db: Database.Database, visits: VisitForBilling[]): VisitForBilling[] {
  const onBill = db.prepare(
    `SELECT 1 FROM invoice_line l JOIN invoice i ON i.id = l.invoice_id AND i.deleted_at IS NULL
      WHERE l.source_type = ? AND l.source_id = ? LIMIT 1`,
  );
  return visits
    .map((v) => ({
      ...v,
      lines: v.lines.filter((l) => (l.sourceType && l.sourceId ? !onBill.get(l.sourceType, l.sourceId) : !v.invoiced_on)),
    }))
    .filter((v) => !v.invoiced_on || v.lines.length > 0);
}

/** A prescribed medicine or lab test may be on one bill only (bills in exceptInvoiceIds don't count). */
function assertNotBilledElsewhere(db: Database.Database, lines: InvoiceLineInput[], exceptInvoiceIds: number[]): void {
  const find = db.prepare(
    `SELECT i.invoice_number FROM invoice_line l JOIN invoice i ON i.id = l.invoice_id AND i.deleted_at IS NULL
      WHERE l.source_type = ? AND l.source_id = ? AND i.id NOT IN (SELECT value FROM json_each(?)) LIMIT 1`,
  );
  const except = JSON.stringify(exceptInvoiceIds);
  for (const l of lines) {
    if (!l.sourceType || !l.sourceId) continue;
    const row = find.get(l.sourceType, l.sourceId, except) as { invoice_number: string } | undefined;
    if (row) throw new ConflictError(`"${l.description}" is already on bill ${row.invoice_number}.`);
  }
}

/** Lab tests for this patient that are not on any bill yet (cancelled tests excluded). */
export function getUnbilledLabItems(db: Database.Database, patientId: number) {
  const allIds = resolvePatientIds(db, patientId);
  const placeholders = allIds.map(() => '?').join(',');
  return (
    db
      .prepare(
        `SELECT i.id, i.test_name, i.price_cents, o.order_number, o.created_at
           FROM lab_order_item i JOIN lab_order o ON o.id = i.lab_order_id
          WHERE o.patient_id IN (${placeholders}) AND i.status != 'cancelled'
            AND NOT EXISTS (SELECT 1 FROM invoice_line l JOIN invoice inv ON inv.id = l.invoice_id AND inv.deleted_at IS NULL
                             WHERE l.source_type = 'lab_order_item' AND l.source_id = i.id)
          ORDER BY o.created_at, i.id`,
      )
      .all(...allIds) as { id: number; test_name: string; price_cents: number; order_number: string; created_at: string }[]
  ).map((i) => ({
    id: i.id,
    orderNumber: i.order_number,
    orderedAt: i.created_at,
    description: `Lab: ${i.test_name} (${i.order_number})`,
    quantity: 1,
    unitPriceCents: i.price_cents,
    lineTotalCents: i.price_cents,
    sourceType: 'lab_order_item' as const,
    sourceId: i.id,
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
    assertNotBilledElsewhere(db, input.lines, []);
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
    `INSERT INTO invoice_line (invoice_id, description, quantity, unit_price_cents, line_total_cents, sort_order, source_type, source_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  lines.forEach((l, i) => {
    const hasSource = Boolean(l.sourceType && l.sourceId);
    insert.run(
      invoiceId,
      l.description,
      l.quantity,
      l.unitPriceCents,
      l.quantity * l.unitPriceCents,
      i,
      hasSource ? l.sourceType : null,
      hasSource ? l.sourceId : null,
    );
  });
}

export function updateInvoice(db: Database.Database, invoiceId: number, input: SaveInvoiceInput): void {
  const existing = db.prepare('SELECT id FROM invoice WHERE id = ? AND deleted_at IS NULL').get(invoiceId);
  if (!existing) throw new NotFoundError(`Invoice ${invoiceId} not found`);

  const update = db.transaction(() => {
    assertNotBilledElsewhere(db, input.lines, [invoiceId]);
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
    .prepare(
      'SELECT id, description, quantity, unit_price_cents, line_total_cents, source_type, source_id FROM invoice_line WHERE invoice_id = ? ORDER BY sort_order, id',
    )
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
