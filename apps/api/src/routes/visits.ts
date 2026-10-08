import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import {
  visitCallNextSchema,
  visitInputSchema,
  visitSendSchema,
  visitUpdateSchema,
  type OpVisitRow,
  type VisitCallNextResponse,
  type VisitLabSummary,
  type VisitQueue,
  type VisitSendResponse,
} from '@platform/shared';
import { AppError, nextNumber, notFound, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { labOrder, opVisit, patient, prescriptionItem, user } from '../db/schema.js';
import { withToken } from '../lib/clinic.js';
import { visitFee } from './billing.js';
import { defaultDoctorOf, doctorsOf } from './doctors.js';

// Visits reuse the patient permissions: view / create (register a visit) / edit / delete.
const doctor = alias(user, 'doctor');
const columns = {
  id: opVisit.id,
  opNo: opVisit.opNo,
  patientId: opVisit.patientId,
  visitDate: opVisit.visitDate,
  status: opVisit.status,
  doctorUserId: opVisit.doctorUserId,
  doctorName: doctor.name,
  complaint: opVisit.complaint,
  notes: opVisit.notes,
  pharmacyNote: opVisit.pharmacyNote,
  labNote: opVisit.labNote,
  bpSystolic: opVisit.bpSystolic,
  bpDiastolic: opVisit.bpDiastolic,
  pulse: opVisit.pulse,
  temperatureF: opVisit.temperatureF,
  spo2: opVisit.spo2,
  weightKg: opVisit.weightKg,
  createdAt: opVisit.createdAt,
  patientName: patient.name,
  patientUhid: patient.uhid,
  patientConditions: patient.conditions,
};

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * THE queue rule, used by "call next" and by the banner on the OP list: a patient back from the lab
 * with every result ready goes in before the next token; otherwise the lowest waiting token.
 * `rows` = one doctor's (or everyone's) visits of today, in token order.
 */
function pickNext(rows: OpVisitRow[], excludeId?: number): VisitQueue['next'] {
  const pool = rows.filter((v) => v.id !== excludeId);
  const back = pool.find((v) => v.status === 'at_lab' && v.labReady);
  if (back) return { visit: back, reason: 'lab_ready' };
  const waiting = pool.find((v) => v.status === 'waiting');
  return waiting ? { visit: waiting, reason: 'next_token' } : null;
}

/** One doctor's visits out of the day's list; null = all doctors. */
const ofDoctor = (rows: OpVisitRow[], doctorUserId: number | null) => (doctorUserId == null ? rows : rows.filter((v) => v.doctorUserId === doctorUserId));

function queueOf(rows: OpVisitRow[], doctorUserId: number | null): VisitQueue {
  const mine = ofDoctor(rows, doctorUserId);
  return {
    doctorUserId,
    withDoctor: mine.filter((v) => v.status === 'with_doctor'),
    next: pickNext(mine),
    labReady: mine.filter((v) => v.status === 'at_lab' && v.labReady),
  };
}

/** Today's date on the server (the clinic PC's local time), YYYY-MM-DD. */
async function localToday(db: Db): Promise<string> {
  return (await db.get<{ d: string }>(sql`select date('now', 'localtime') as d`))!.d;
}

/** OP-YYMMDD-NNN: the day's running number in this branch (doubles as the queue token). */
async function nextOpNo(db: Pick<Db, 'insert'>, branchId: number, day: string): Promise<string> {
  const n = await nextNumber(db, branchId, `op:${day}`);
  return `OP-${day.slice(2).replace(/-/g, '')}-${String(n).padStart(3, '0')}`;
}

export function createVisitRoutes(db: Db) {
  const app = new Hono<BranchEnv>();

  const visitInBranch = (branchId: number) => and(eq(opVisit.branchId, branchId), isNull(opVisit.deletedAt));
  const selectVisits = (d: Db | Tx = db) =>
    d.select(columns).from(opVisit).innerJoin(patient, eq(patient.id, opVisit.patientId)).leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId));

  /** Adds the token, the lab summary, labReady and the medicine count. Two grouped queries for the whole list. */
  async function withProgress<T extends { id: number; opNo: string }>(d: Db | Tx, branchId: number, rows: T[]) {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const labRows = await d
      .select({ visitId: labOrder.visitId, status: labOrder.status, n: sql<number>`count(*)` })
      .from(labOrder)
      .where(and(eq(labOrder.branchId, branchId), inArray(labOrder.visitId, ids), ne(labOrder.status, 'cancelled')))
      .groupBy(labOrder.visitId, labOrder.status);
    const rxRows = await d
      .select({ visitId: prescriptionItem.visitId, n: sql<number>`count(*)` })
      .from(prescriptionItem)
      .where(and(eq(prescriptionItem.branchId, branchId), inArray(prescriptionItem.visitId, ids), isNull(prescriptionItem.deletedAt)))
      .groupBy(prescriptionItem.visitId);
    const labOf = new Map<number, VisitLabSummary>();
    for (const r of labRows) {
      const lab = labOf.get(r.visitId) ?? { ordered: 0, sampleCollected: 0, completed: 0 };
      if (r.status === 'ordered') lab.ordered = r.n;
      else if (r.status === 'sample_collected') lab.sampleCollected = r.n;
      else lab.completed = r.n;
      labOf.set(r.visitId, lab);
    }
    const rxOf = new Map(rxRows.map((r) => [r.visitId, r.n]));
    return rows.map((r) => {
      const lab = labOf.get(r.id) ?? { ordered: 0, sampleCollected: 0, completed: 0 };
      return { ...withToken(r), lab, labReady: lab.completed > 0 && lab.ordered + lab.sampleCollected === 0, medicineCount: rxOf.get(r.id) ?? 0 };
    });
  }

  /** Every visit of the branch on that day, in token order. */
  const dayRows = async (d: Db | Tx, branchId: number, day: string): Promise<OpVisitRow[]> =>
    withProgress(d, branchId, await selectVisits(d).where(and(visitInBranch(branchId), eq(opVisit.visitDate, day))).orderBy(opVisit.id));

  /** Whose queue: the doctor asked for; else the caller if they are a doctor of this branch; else everyone's (null). */
  async function queueDoctor(branchId: number, callerId: number, asked: number | null | undefined): Promise<number | null> {
    if (asked !== undefined) {
      await assertDoctor(branchId, asked);
      return asked;
    }
    return (await doctorsOf(db, branchId)).some((d) => d.userId === callerId) ? callerId : null;
  }

  /**
   * The patient goes in to their doctor. Only one can be inside per doctor (visits with no doctor share
   * one slot), so whoever was inside goes back to waiting. Returns that visit's id, if any.
   */
  async function callIn(tx: Tx, branchId: number, visit: { id: number; doctorUserId: number | null }): Promise<number | null> {
    const now = new Date().toISOString();
    const slot = visit.doctorUserId == null ? isNull(opVisit.doctorUserId) : eq(opVisit.doctorUserId, visit.doctorUserId);
    const moved = await tx
      .update(opVisit)
      .set({ status: 'waiting', updatedAt: now })
      .where(and(visitInBranch(branchId), eq(opVisit.status, 'with_doctor'), slot, ne(opVisit.id, visit.id)))
      .returning({ id: opVisit.id });
    await tx.update(opVisit).set({ status: 'with_doctor', updatedAt: now }).where(and(visitInBranch(branchId), eq(opVisit.id, visit.id)));
    return moved[0]?.id ?? null;
  }

  async function assertDoctor(branchId: number, doctorUserId: number | null | undefined) {
    if (doctorUserId == null) return;
    if (!(await doctorsOf(db, branchId)).some((d) => d.userId === doctorUserId)) {
      throw new AppError(400, 'validation', 'Choose a doctor of this branch', { doctorUserId: ['Choose a doctor of this branch'] });
    }
  }

  async function findPatient(branchId: number, id: number) {
    if (!Number.isInteger(id)) throw notFound('Patient not found');
    const [p] = await db
      .select({ id: patient.id })
      .from(patient)
      .where(and(eq(patient.branchId, branchId), eq(patient.id, id), isNull(patient.deletedAt)))
      .limit(1);
    if (!p) throw notFound('Patient not found');
    return p;
  }

  async function findVisit(branchId: number, id: number): Promise<OpVisitRow> {
    if (!Number.isInteger(id)) throw notFound('Visit not found');
    const rows = await selectVisits().where(and(visitInBranch(branchId), eq(opVisit.id, id))).limit(1);
    if (!rows.length) throw notFound('Visit not found');
    return (await withProgress(db, branchId, rows))[0]!;
  }

  // A patient's visits, newest first.
  app.get('/patients/:id/visits', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const p = await findPatient(b.id, Number(c.req.param('id')));
    const visits: OpVisitRow[] = await withProgress(db, b.id, await selectVisits().where(and(visitInBranch(b.id), eq(opVisit.patientId, p.id))).orderBy(desc(opVisit.id)));
    return c.json({ visits });
  });

  // Register an OP visit for today.
  app.post('/patients/:id/visits', requirePermission('patient.create'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const p = await findPatient(b.id, Number(c.req.param('id')));
    const parsed = visitInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    await assertDoctor(b.id, parsed.data.doctorUserId);
    // No doctor given at all = the branch's default doctor; an explicit null stays "not assigned".
    const doctorUserId = parsed.data.doctorUserId === undefined ? await defaultDoctorOf(db, b.id) : parsed.data.doctorUserId;

    const day = await localToday(db);
    const id = await db.transaction(async (tx) => {
      const opNo = await nextOpNo(tx, b.id, day);
      const [row] = await tx
        .insert(opVisit)
        .values({ ...parsed.data, doctorUserId, branchId: b.id, patientId: p.id, opNo, visitDate: day, createdBy: u.id })
        .returning({ id: opVisit.id });
      // Weight taken at the visit becomes the patient's latest weight.
      if (parsed.data.weightKg != null) await tx.update(patient).set({ weightKg: parsed.data.weightKg }).where(eq(patient.id, p.id));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'op_visit', entityId: row.id, detail: { opNo, patientId: p.id } });
      return row.id;
    });
    return c.json({ visit: await findVisit(b.id, id) }, 201);
  });

  // The day's OP list (default: today) in token order, with patient names. ?doctor=<userId> narrows to one doctor.
  app.get('/visits', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const date = c.req.query('date');
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : await localToday(db);
    const asked = Number(c.req.query('doctor'));
    const doctorId = Number.isInteger(asked) && asked > 0 ? asked : null;
    const rows = await selectVisits()
      .where(and(visitInBranch(b.id), eq(opVisit.visitDate, day), doctorId != null ? eq(opVisit.doctorUserId, doctorId) : undefined))
      .orderBy(opVisit.id); // = token order: both are handed out in the same insert
    const visits: OpVisitRow[] = await withProgress(db, b.id, rows);
    // Who is inside and who is next, for the banner: only today has a queue. No doctor chosen = the caller's own queue if they are a doctor.
    const queue: VisitQueue | null = day === (await localToday(db)) ? queueOf(visits, doctorId ?? (await queueDoctor(b.id, c.get('user').id, undefined))) : null;
    return c.json({ date: day, visits, queue });
  });

  const NOT_OPEN: Partial<Record<OpVisitRow['status'], string>> = { completed: 'This visit is already completed', cancelled: 'This visit was cancelled' };

  // Call the next patient in (or the one chosen with visitId). Same permission as changing a visit's status.
  app.post('/visits/call-next', requirePermission('patient.edit'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const parsed = visitCallNextSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const chosen = parsed.data.visitId != null ? await findVisit(b.id, parsed.data.visitId) : null;
    if (chosen && NOT_OPEN[chosen.status]) throw new AppError(409, 'bad_state', NOT_OPEN[chosen.status]!);
    // A chosen visit goes to its own doctor; otherwise the pick is from this doctor's queue.
    const doctorId = chosen ? null : await queueDoctor(b.id, u.id, parsed.data.doctorUserId);
    const today = await localToday(db);

    const done = await db.transaction(async (tx) => {
      const pick: VisitQueue['next'] = chosen ? { visit: chosen, reason: 'chosen' } : pickNext(ofDoctor(await dayRows(tx, b.id, today), doctorId));
      if (!pick) throw new AppError(409, 'nobody_waiting', 'Nobody is waiting for the doctor right now');
      const previousId = await callIn(tx, b.id, pick.visit);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'op_visit', entityId: pick.visit.id, detail: { status: 'with_doctor', reason: pick.reason, backToWaiting: previousId } });
      return { id: pick.visit.id, previousId, reason: pick.reason };
    });
    const res: VisitCallNextResponse = { visit: await findVisit(b.id, done.id), previous: done.previousId != null ? await findVisit(b.id, done.previousId) : null, reason: done.reason };
    return c.json(res);
  });

  // The doctor's "what next?": to the lab, to the pharmacy / billing counter, or back to waiting. callNext also calls that doctor's next patient in.
  app.post('/visits/:visitId/send', requirePermission('patient.edit'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const visit = await findVisit(b.id, Number(c.req.param('visitId')));
    const parsed = visitSendSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    if (NOT_OPEN[visit.status]) throw new AppError(409, 'bad_state', NOT_OPEN[visit.status]!);
    const { to, callNext } = parsed.data;
    if (to === 'lab' && visit.lab.ordered + visit.lab.sampleCollected === 0) throw new AppError(400, 'no_lab_test', 'Order a test first');
    const status = ({ lab: 'at_lab', counter: 'at_counter', waiting: 'waiting' } as const)[to];
    const today = await localToday(db);

    const next = await db.transaction(async (tx) => {
      await tx.update(opVisit).set({ status, updatedAt: new Date().toISOString() }).where(and(visitInBranch(b.id), eq(opVisit.id, visit.id)));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'op_visit', entityId: visit.id, detail: { status } });
      if (!callNext) return null;
      // Same doctor's queue (visits with no doctor are one queue); never the patient who just went out. Nobody waiting is not an error here.
      const pick = pickNext((await dayRows(tx, b.id, today)).filter((v) => v.doctorUserId === visit.doctorUserId), visit.id);
      if (!pick) return null;
      const previousId = await callIn(tx, b.id, pick.visit);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'op_visit', entityId: pick.visit.id, detail: { status: 'with_doctor', reason: pick.reason, backToWaiting: previousId } });
      return { id: pick.visit.id, reason: pick.reason };
    });
    const res: VisitSendResponse = { visit: await findVisit(b.id, visit.id), next: next ? { visit: await findVisit(b.id, next.id), reason: next.reason } : null };
    return c.json(res);
  });

  // One visit with the patient's basics (the consultation screen).
  app.get('/visits/:visitId', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const visit = await findVisit(b.id, Number(c.req.param('visitId')));
    const [p] = await db
      .select({ id: patient.id, name: patient.name, uhid: patient.uhid, gender: patient.gender, ageYears: patient.ageYears, dob: patient.dob, phone: patient.phone, conditions: patient.conditions })
      .from(patient)
      .where(eq(patient.id, visit.patientId));
    // What this visit's consultation costs (the doctor may have changed it) and whether it can still be changed.
    return c.json({ visit, patient: p, fee: await visitFee(db, b.id, visit.id) });
  });

  app.patch('/visits/:visitId', requirePermission('patient.edit'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const id = Number(c.req.param('visitId'));
    const existing = await findVisit(b.id, id);
    const parsed = visitUpdateSchema.partial().safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw validationError(parsed.error);
    if (Object.keys(parsed.data).length === 0) throw new AppError(400, 'validation', 'Nothing to change');
    await assertDoctor(b.id, parsed.data.doctorUserId);
    // Status here is only waiting / completed / cancelled (the schema refuses the rest: those go through call-next and send).
    const to = parsed.data.status;
    if (to === 'completed' && existing.status === 'cancelled') throw new AppError(409, 'bad_state', 'This visit was cancelled. Move it back to waiting first.');
    if (to === 'cancelled' && existing.status === 'completed') throw new AppError(409, 'bad_state', 'This visit is already completed; it can no longer be cancelled.');
    const changes: typeof parsed.data = { ...parsed.data };
    // Given to another doctor while inside: the patient waits for the new doctor (one inside per doctor).
    if (!to && existing.status === 'with_doctor' && parsed.data.doctorUserId !== undefined && parsed.data.doctorUserId !== existing.doctorUserId) changes.status = 'waiting';
    await db.transaction(async (tx) => {
      await tx.update(opVisit).set({ ...changes, updatedAt: new Date().toISOString() }).where(and(visitInBranch(b.id), eq(opVisit.id, id)));
      if (parsed.data.weightKg != null) await tx.update(patient).set({ weightKg: parsed.data.weightKg }).where(eq(patient.id, existing.patientId));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'op_visit', entityId: id, detail: changes });
    });
    return c.json({ visit: await findVisit(b.id, id) });
  });

  app.delete('/visits/:visitId', requirePermission('patient.delete'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const id = Number(c.req.param('visitId'));
    await findVisit(b.id, id);
    await db.update(opVisit).set({ deletedAt: new Date().toISOString() }).where(and(visitInBranch(b.id), eq(opVisit.id, id)));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'op_visit', entityId: id });
    return c.json({ ok: true });
  });

  return app;
}
