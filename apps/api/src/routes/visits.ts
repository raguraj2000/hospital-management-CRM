import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import { visitInputSchema, visitUpdateSchema, type OpVisit, type OpVisitRow } from '@platform/shared';
import { AppError, nextNumber, notFound, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { opVisit, patient, user } from '../db/schema.js';
import { withToken } from '../lib/clinic.js';
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
  bpSystolic: opVisit.bpSystolic,
  bpDiastolic: opVisit.bpDiastolic,
  pulse: opVisit.pulse,
  temperatureF: opVisit.temperatureF,
  spo2: opVisit.spo2,
  weightKg: opVisit.weightKg,
  createdAt: opVisit.createdAt,
};

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
  const selectVisits = () => db.select(columns).from(opVisit).leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId));

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

  async function findVisit(branchId: number, id: number): Promise<OpVisit> {
    if (!Number.isInteger(id)) throw notFound('Visit not found');
    const [v] = await selectVisits().where(and(visitInBranch(branchId), eq(opVisit.id, id))).limit(1);
    if (!v) throw notFound('Visit not found');
    return withToken(v);
  }

  // A patient's visits, newest first.
  app.get('/patients/:id/visits', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const p = await findPatient(b.id, Number(c.req.param('id')));
    const visits: OpVisit[] = (await selectVisits().where(and(visitInBranch(b.id), eq(opVisit.patientId, p.id))).orderBy(desc(opVisit.id))).map(withToken);
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
    const doctorId = Number(c.req.query('doctor'));
    const rows = await db
      .select({ ...columns, patientName: patient.name, patientUhid: patient.uhid })
      .from(opVisit)
      .innerJoin(patient, eq(patient.id, opVisit.patientId))
      .leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId))
      .where(and(visitInBranch(b.id), eq(opVisit.visitDate, day), Number.isInteger(doctorId) && doctorId > 0 ? eq(opVisit.doctorUserId, doctorId) : undefined))
      .orderBy(opVisit.id); // = token order: both are handed out in the same insert
    const visits: OpVisitRow[] = rows.map(withToken);
    return c.json({ date: day, visits });
  });

  // One visit with the patient's basics (the consultation screen).
  app.get('/visits/:visitId', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const visit = await findVisit(b.id, Number(c.req.param('visitId')));
    const [p] = await db
      .select({ id: patient.id, name: patient.name, uhid: patient.uhid, gender: patient.gender, ageYears: patient.ageYears, dob: patient.dob, phone: patient.phone })
      .from(patient)
      .where(eq(patient.id, visit.patientId));
    return c.json({ visit, patient: p });
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
    await db.transaction(async (tx) => {
      await tx.update(opVisit).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(and(visitInBranch(b.id), eq(opVisit.id, id)));
      if (parsed.data.weightKg != null) await tx.update(patient).set({ weightKg: parsed.data.weightKg }).where(eq(patient.id, existing.patientId));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'op_visit', entityId: id, detail: parsed.data });
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
