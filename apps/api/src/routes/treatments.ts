// Treatments given in the hospital: a prescription line marked "given here" becomes one dose per time of day
// per day; the nurse ticks each dose when it is given. The medicine itself is billed once, at the counter.
import { and, asc, eq, gte, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import { TREATMENT_LOOKBACK_DAYS, treatmentGiveSchema, treatmentSlots, type TreatmentDose, type TreatmentList } from '@platform/shared';
import { AppError, notFound, requireAnyPermission, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { medicine, opVisit, patient, prescriptionItem, treatmentDose, user } from '../db/schema.js';
import { localToday, withToken } from '../lib/clinic.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
const giver = alias(user, 'giver');

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** The doses of a "given here" line: every time of day of the dose pattern, for each day, starting on `firstDay`. */
export async function createDoses(tx: Tx, branchId: number, item: { id: number; visitId: number; patientId: number; dose: string; days: number }, firstDay: string) {
  const slots = treatmentSlots(item.dose);
  const rows = Array.from({ length: item.days }, (_, d) => slots.map((s) => ({ branchId, prescriptionItemId: item.id, visitId: item.visitId, patientId: item.patientId, dueDate: addDays(firstDay, d), ...s }))).flat();
  if (rows.length) await tx.insert(treatmentDose).values(rows);
  return rows.length;
}

/** A prescription line can be removed (its doses then drop off every list) -- unless a dose was already given. */
export async function assertNoDoseGiven(tx: Tx | Db, prescriptionItemId: number) {
  const [given] = await tx.select({ n: sql<number>`count(*)` }).from(treatmentDose).where(and(eq(treatmentDose.prescriptionItemId, prescriptionItemId), isNotNull(treatmentDose.givenAt)));
  if (given!.n > 0) throw new AppError(409, 'doses_given', `${given!.n} dose${given!.n > 1 ? 's were' : ' was'} already given — this medicine can no longer be removed`);
}

export function createTreatmentRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  const give = requirePermission('treatment.give');

  /** Doses with who and what; only lines that still stand (not removed, visit not cancelled or deleted). */
  async function doses(branchId: number, where: ReturnType<typeof and>): Promise<TreatmentDose[]> {
    const rows = await db
      .select({
        id: treatmentDose.id,
        prescriptionItemId: treatmentDose.prescriptionItemId,
        visitId: treatmentDose.visitId,
        opNo: opVisit.opNo,
        patientId: patient.id,
        patientName: patient.name,
        patientUhid: patient.uhid,
        patientConditions: patient.conditions,
        medicineName: medicine.name,
        strength: medicine.strength,
        form: medicine.form,
        dose: prescriptionItem.dose,
        days: prescriptionItem.days,
        instructions: prescriptionItem.instructions,
        /** The pharmacy has handed the medicine over (or the patient declined it). */
        itemStatus: prescriptionItem.status,
        dueDate: treatmentDose.dueDate,
        slotNo: treatmentDose.slotNo,
        slot: treatmentDose.slot,
        amount: treatmentDose.amount,
        givenAt: treatmentDose.givenAt,
        givenByName: giver.name,
        note: treatmentDose.note,
      })
      .from(treatmentDose)
      .innerJoin(prescriptionItem, eq(prescriptionItem.id, treatmentDose.prescriptionItemId))
      .innerJoin(medicine, eq(medicine.id, prescriptionItem.medicineId))
      .innerJoin(opVisit, eq(opVisit.id, treatmentDose.visitId))
      .innerJoin(patient, eq(patient.id, treatmentDose.patientId))
      .leftJoin(giver, eq(giver.id, treatmentDose.givenBy))
      .where(and(eq(treatmentDose.branchId, branchId), isNull(prescriptionItem.deletedAt), isNull(opVisit.deletedAt), sql`${opVisit.status} <> 'cancelled'`, where))
      .orderBy(asc(treatmentDose.dueDate), asc(treatmentDose.slotNo), asc(treatmentDose.id));
    return rows.map(withToken);
  }

  async function doseOf(branchId: number, id: number) {
    if (!Number.isInteger(id)) throw notFound('Dose not found');
    const [d] = await doses(branchId, and(eq(treatmentDose.id, id)));
    if (!d) throw notFound('Dose not found');
    return d;
  }

  /**
   * The nurse's list for a day (?date=, default today): that day's doses, and -- for today -- the doses of the
   * last few days that were never given. Whoever writes prescriptions sees it too.
   */
  app.get('/treatments', requireAnyPermission('treatment.give', 'prescription.write'), async (c) => {
    const b = c.get('branch');
    const today = await localToday(db);
    const asked = c.req.query('date');
    const date = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;
    const day = await doses(b.id, and(eq(treatmentDose.dueDate, date)));
    const missed =
      date === today
        ? await doses(b.id, and(lte(treatmentDose.dueDate, addDays(today, -1)), gte(treatmentDose.dueDate, addDays(today, -TREATMENT_LOOKBACK_DAYS)), isNull(treatmentDose.givenAt)))
        : [];
    const result: TreatmentList = { date, today, doses: day, missed };
    return c.json(result);
  });

  /** Tick a dose as given (with an optional note: site, reaction, "patient refused the second half"). */
  app.post('/treatments/:id/give', give, async (c) => {
    const parsed = treatmentGiveSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const d = await doseOf(b.id, Number(c.req.param('id')));
    if (d.givenAt) throw new AppError(409, 'already_given', `Already given${d.givenByName ? ` by ${d.givenByName}` : ''}`);
    if (d.dueDate > (await localToday(db))) throw new AppError(400, 'not_due', 'This dose is for a later day');
    const now = new Date().toISOString();
    await db.update(treatmentDose).set({ givenAt: now, givenBy: u.id, note: parsed.data.note ?? null, updatedAt: now }).where(eq(treatmentDose.id, d.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'give', entity: 'treatment_dose', entityId: d.id, detail: { visitId: d.visitId, medicine: d.medicineName, dueDate: d.dueDate, slot: d.slot, note: parsed.data.note ?? null } });
    return c.json({ dose: await doseOf(b.id, d.id) });
  });

  /** Ticked by mistake: back to not given. */
  app.post('/treatments/:id/undo', give, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const d = await doseOf(b.id, Number(c.req.param('id')));
    if (!d.givenAt) throw new AppError(409, 'not_given', 'This dose is not marked as given');
    await db.update(treatmentDose).set({ givenAt: null, givenBy: null, note: null, updatedAt: new Date().toISOString() }).where(eq(treatmentDose.id, d.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'undo', entity: 'treatment_dose', entityId: d.id, detail: { visitId: d.visitId, medicine: d.medicineName, dueDate: d.dueDate, slot: d.slot } });
    return c.json({ dose: await doseOf(b.id, d.id) });
  });

  return app;
}
