// Treatment courses (see db/schema.ts treatmentCourse): the doctor plans the sittings; each sitting becomes a
// small visit when it happens -- a review with the doctor (OP token), a lab-only visit (LAB-...) or, when the
// nurse gives something billable, a treatment visit (TRT-..., no token). Paid sitting by sitting at the counter,
// or everything at once on day one. The nurse never takes money: her "Given" only puts the item on the bill.
import { and, asc, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import {
  courseCloseSchema,
  courseInputSchema,
  courseNowSchema,
  courseTemplateSchema,
  sittingEditSchema,
  type CourseTemplate,
  indiaDay,
  partOfDay,
  sittingInputSchema,
  type CourseItem,
  type CourseSitting,
  type DueSitting,
  type TreatmentCourse,
} from '@platform/shared';
import { AppError, nextNumber, notFound, requireAnyPermission, requireModule, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { courseItem, courseSitting, courseTemplate, labOrder, labTest, medicine, opVisit, patient, prescriptionItem, treatmentCourse, user, visitCharge } from '../db/schema.js';
import { assertVisitOpen, assertPatientActive, dayStamp, exclusively, localToday, visitOfBranch } from '../lib/clinic.js';
import { addChargeToVisit, createBill } from './billing.js';
import { medicinesWithStock } from './pharmacy.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
const doctor = alias(user, 'doctor');
/** A planned sitting not started this long after its time is missed. */
const MISSED_AFTER_MS = 6 * 3_600_000;
/** A frozen course is closed when nobody came for this long. */
const CLOSE_AFTER_MS = 24 * 3_600_000;

/** "Day 2 evening": the day counts from the day the course started (India dates). */
export function sittingLabel(courseCreatedAt: string, dueAt: string) {
  const n = Math.round((Date.parse(`${indiaDay(dueAt)}T00:00:00Z`) - Date.parse(`${indiaDay(courseCreatedAt)}T00:00:00Z`)) / 86_400_000) + 1;
  return n < 1 ? `Before day 1, ${partOfDay(dueAt)}` : `Day ${n} ${partOfDay(dueAt)}`;
}

/** Day 1 of a course: the day picked when it was started, else the day of its first sitting, else the day it was made. */
const courseStart = sql<string>`coalesce(${treatmentCourse.startDay} || 'T00:00:00+05:30', (select min(x.due_at) from course_sitting x where x.course_id = ${treatmentCourse.id}), ${treatmentCourse.createdAt})`;

type Catalog = { med: Map<number, { id: number; name: string; strength: string | null; pricePaise: number }>; test: Map<number, { id: number; name: string; pricePaise: number }> };
/** The rows of a sitting's items, in the doctor's order (notes in between; prices locked when paid on day one). */
function itemRows(cat: Catalog, items: ReturnType<typeof sittingInputSchema.parse>['items'], prepaid: boolean) {
  return items.map((i, n) => {
    const base = { sortOrder: n, quantity: 1, medicineId: null as number | null, testId: null as number | null };
    if (i.kind === 'medicine') {
      const m = cat.med.get(i.medicineId!)!;
      return { ...base, kind: 'medicine' as 'medicine' | 'test' | 'charge' | 'note', medicineId: m.id, description: [m.name, m.strength].filter(Boolean).join(' '), quantity: i.quantity ?? 1, pricePaise: prepaid ? m.pricePaise * (i.quantity ?? 1) : 0 };
    }
    if (i.kind === 'test') {
      const t = cat.test.get(i.testId!)!;
      return { ...base, kind: 'test' as 'medicine' | 'test' | 'charge' | 'note', testId: t.id, description: t.name, pricePaise: prepaid ? t.pricePaise : 0 };
    }
    return { ...base, kind: i.kind as 'medicine' | 'test' | 'charge' | 'note', description: i.description!, pricePaise: i.kind === 'charge' ? (i.amountPaise ?? 0) : 0 };
  });
}

export function createCourseRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  /** Who plans and changes a course: the doctor, the branch admin, the owner. */
  const planners = requireAnyPermission('prescription.write', 'settings.manage');
  // Courses switched off for this hospital (super admin panel): every course route refuses. Each path on its own:
  // this app is mounted at the branch root, so a '*' here would reach every other branch route too.
  for (const path of ['/courses/*', '/course-sittings/*', '/course-items/*', '/course-templates', '/course-templates/*', '/visits/:visitId/courses', '/patients/:id/courses', '/treatments/due']) app.use(path, requireModule('courses'));

  // ------------------------------------------------------------ reading

  async function coursesWhere(branchId: number, where: ReturnType<typeof and>): Promise<TreatmentCourse[]> {
    const courses = await db
      .select({
        id: treatmentCourse.id, patientId: treatmentCourse.patientId, visitId: treatmentCourse.visitId, name: treatmentCourse.name, payMode: treatmentCourse.payMode,
        status: treatmentCourse.status, doctorName: doctor.name, frozenAt: treatmentCourse.frozenAt, closedAt: treatmentCourse.closedAt,
        closedReason: treatmentCourse.closedReason, creditPaise: treatmentCourse.creditPaise, createdAt: courseStart,
      })
      .from(treatmentCourse)
      .leftJoin(doctor, eq(doctor.id, treatmentCourse.doctorUserId))
      .where(and(eq(treatmentCourse.branchId, branchId), isNull(treatmentCourse.deletedAt), where))
      .orderBy(desc(treatmentCourse.id))
      .limit(50);
    if (!courses.length) return [];
    const sittings = await db.select().from(courseSitting).where(and(eq(courseSitting.branchId, branchId), inArray(courseSitting.courseId, courses.map((c) => c.id)))).orderBy(asc(courseSitting.dueAt), asc(courseSitting.id));
    const items = sittings.length ? await db.select().from(courseItem).where(and(eq(courseItem.branchId, branchId), inArray(courseItem.sittingId, sittings.map((s) => s.id)))).orderBy(asc(courseItem.sortOrder), asc(courseItem.id)) : [];
    const itemOf = (i: (typeof items)[number]): CourseItem => ({ id: i.id, kind: i.kind, medicineId: i.medicineId, testId: i.testId, description: i.description, quantity: i.quantity, pricePaise: i.pricePaise, prepaid: i.prepaid, givenAt: i.givenAt });
    const sittingOf = (s: (typeof sittings)[number]): CourseSitting => ({ id: s.id, dueAt: s.dueAt, kind: s.kind, reviewFeePaise: s.reviewFeePaise, status: s.status, visitId: s.visitId, doneAt: s.doneAt, note: s.note, items: items.filter((i) => i.sittingId === s.id).map(itemOf) });
    return courses.map((c) => ({ ...c, sittings: sittings.filter((s) => s.courseId === c.id).map(sittingOf) }));
  }

  /**
   * Missed sittings, freezing and closing, worked out when someone looks (no clock running in the background):
   * a sitting not started 6 h after its time is missed; two missed in a row (since the last one that happened)
   * freeze the course; a frozen course nobody came back to for 24 h is closed, with what was paid on day one and
   * never given as the patient's credit.
   */
  const lastRefresh = new Map<number, number>();
  async function refreshCourses(branchId: number, organizationId: number, onlyCourseIds?: number[]) {
    const now = Date.now();
    // The whole branch at most once a minute (the nurse's list asks every 30 s); one patient's courses always.
    if (!onlyCourseIds) {
      if (now - (lastRefresh.get(branchId) ?? 0) < 60_000) return;
      lastRefresh.set(branchId, now);
    }
    const open = await db
      .select({ id: treatmentCourse.id, status: treatmentCourse.status, frozenAt: treatmentCourse.frozenAt, since: treatmentCourse.updatedAt })
      .from(treatmentCourse)
      .where(and(eq(treatmentCourse.branchId, branchId), isNull(treatmentCourse.deletedAt), inArray(treatmentCourse.status, ['active', 'frozen']), onlyCourseIds?.length ? inArray(treatmentCourse.id, onlyCourseIds) : undefined));
    if (!open.length) return;
    const ids = open.map((c) => c.id);
    await db
      .update(courseSitting)
      .set({ status: 'missed', updatedAt: new Date(now).toISOString() })
      .where(and(eq(courseSitting.branchId, branchId), inArray(courseSitting.courseId, ids), eq(courseSitting.status, 'planned'), lt(courseSitting.dueAt, new Date(now - MISSED_AFTER_MS).toISOString())));
    const sittings = await db.select({ id: courseSitting.id, courseId: courseSitting.courseId, status: courseSitting.status, dueAt: courseSitting.dueAt, doneAt: courseSitting.doneAt }).from(courseSitting).where(and(eq(courseSitting.branchId, branchId), inArray(courseSitting.courseId, ids))).orderBy(asc(courseSitting.dueAt));
    for (const c of open) {
      // Missed sittings count only after the course last went on (started, or thawed by a visit or new days).
      const mine = sittings.filter((s) => s.courseId === c.id && s.dueAt > c.since);
      // Missed since the last sitting that happened.
      let missed = 0;
      for (const s of mine) {
        if (s.status === 'missed') missed++;
        else if (s.status === 'done' || s.status === 'started') missed = 0;
      }
      if (c.status === 'active' && missed >= 2) {
        await db.transaction(async (tx) => {
          await tx.update(treatmentCourse).set({ status: 'frozen', frozenAt: new Date(now).toISOString() }).where(eq(treatmentCourse.id, c.id));
          await writeAudit(tx, { organizationId, branchId, action: 'freeze', entity: 'treatment_course', entityId: c.id, detail: { reason: 'Missed two sittings' } });
        });
      } else if (c.status === 'frozen' && c.frozenAt && Date.parse(c.frozenAt) < now - CLOSE_AFTER_MS) {
        const credit = await closeCourse(c.id, branchId, 'Missed two sittings and did not come back within a day', null, true);
        await writeAudit(db, { organizationId, branchId, action: 'close', entity: 'treatment_course', entityId: c.id, detail: { reason: 'Missed two sittings, no visit for a day', creditPaise: credit } });
      }
    }
  }

  /** Close: the sittings still planned are cancelled. `withCredit`: what was paid on day one and not given. */
  async function closeCourse(courseId: number, branchId: number, reason: string, userId: number | null, withCredit: boolean) {
    const now = new Date().toISOString();
    return db.transaction(async (tx) => {
      let credit = 0;
      if (withCredit) {
        const [r] = await tx.all<{ c: number }>(sql`select coalesce(sum(i.price_paise), 0) as c from course_item i inner join course_sitting s on s.id = i.sitting_id where s.course_id = ${courseId} and i.prepaid = 1 and i.given_at is null and i.branch_id = ${branchId}`);
        credit = r?.c ?? 0;
      }
      await tx.update(courseSitting).set({ status: 'cancelled', updatedAt: now }).where(and(eq(courseSitting.courseId, courseId), eq(courseSitting.status, 'planned')));
      await tx.update(treatmentCourse).set({ status: 'closed', closedAt: now, closedReason: reason, closedBy: userId, creditPaise: credit, updatedAt: now }).where(eq(treatmentCourse.id, courseId));
      return credit;
    });
  }

  async function courseOfBranch(branchId: number, id: number) {
    const [c] = Number.isInteger(id) ? await db.select().from(treatmentCourse).where(and(eq(treatmentCourse.branchId, branchId), eq(treatmentCourse.id, id), isNull(treatmentCourse.deletedAt))) : [];
    if (!c) throw notFound('Course not found');
    return c;
  }

  // ------------------------------------------------------------ writing the plan

  /** Prices and names of what the sittings use, all of this branch (anything else is refused). */
  async function catalog(branchId: number, sittings: { items: { kind: string; medicineId?: number; testId?: number }[] }[]) {
    const medIds = [...new Set(sittings.flatMap((s) => s.items.filter((i) => i.kind === 'medicine').map((i) => i.medicineId!)))];
    const testIds = [...new Set(sittings.flatMap((s) => s.items.filter((i) => i.kind === 'test').map((i) => i.testId!)))];
    const meds = medIds.length ? await db.select({ id: medicine.id, name: medicine.name, strength: medicine.strength, pricePaise: medicine.pricePaise }).from(medicine).where(and(eq(medicine.branchId, branchId), isNull(medicine.deletedAt), inArray(medicine.id, medIds))) : [];
    const tests = testIds.length ? await db.select({ id: labTest.id, name: labTest.name, pricePaise: labTest.pricePaise }).from(labTest).where(and(eq(labTest.branchId, branchId), isNull(labTest.deletedAt), inArray(labTest.id, testIds))) : [];
    if (meds.length !== medIds.length || tests.length !== testIds.length) throw new AppError(400, 'validation', 'Choose medicines and tests of this branch');
    return { med: new Map(meds.map((m) => [m.id, m])), test: new Map(tests.map((t) => [t.id, t])) };
  }

  /** Adds sittings to a course. `prepaid`: day one -- everything goes on `billVisitId`'s bill now. */
  async function addSittings(tx: Tx, branchId: number, user: { id: number; organizationId: number }, course: { id: number; name: string; createdAt: string }, input: ReturnType<typeof sittingInputSchema.parse>[], prepaid: boolean, billVisitId: number) {
    const cat = await catalog(branchId, input);
    const userId = user.id;
    const dayOne = new Map<number, number>(); // medicine -> units to give on day one
    const dayOneCharges = new Map<string, { count: number; amountPaise: number }>(); // "Lab: CBC" -> how many, how much
    const made: number[] = [];
    for (const s of input) {
      const [row] = await tx
        .insert(courseSitting)
        .values({ branchId, courseId: course.id, dueAt: new Date(s.dueAt).toISOString(), kind: s.kind, reviewFeePaise: prepaid ? null : (s.reviewFeePaise ?? null), note: s.note ?? null })
        .returning({ id: courseSitting.id });
      made.push(row!.id);
      const items = itemRows(cat, s.items, prepaid);
      // Day one: the review fee is paid now too, as a charge of that sitting.
      if (prepaid && s.kind === 'review' && s.reviewFeePaise) items.push({ sortOrder: items.length, kind: 'charge', medicineId: null, testId: null, description: 'Review fee', quantity: 1, pricePaise: s.reviewFeePaise });
      if (items.length) await tx.insert(courseItem).values(items.map((i) => ({ ...i, branchId, sittingId: row!.id, prepaid: prepaid && i.kind !== 'note' })));
      if (prepaid) {
        for (const i of items) {
          if (i.kind === 'note') continue;
          if (i.kind === 'medicine') dayOne.set(i.medicineId!, (dayOne.get(i.medicineId!) ?? 0) + i.quantity);
          // Tests and charges of later sittings: on today's bill, named with their sitting.
          else {
            const name = `${i.kind === 'test' ? 'Lab: ' : ''}${i.description}`;
            const had = dayOneCharges.get(name) ?? { count: 0, amountPaise: 0 };
            dayOneCharges.set(name, { count: had.count + 1, amountPaise: had.amountPaise + i.pricePaise });
          }
        }
      }
    }
    // Day one: tests and charges of all the sittings, one line each ("Lab: CBC ×2 (Dengue course)"), on today's bill.
    for (const [name, x] of dayOneCharges) await addChargeToVisit(tx, branchId, user, billVisitId, { description: `${name}${x.count > 1 ? ` ×${x.count}` : ''} (${course.name} course)`.slice(0, 60), amountPaise: x.amountPaise });
    // Day one: the medicines of all the sittings are given out (and paid) today, as one line each.
    for (const [medicineId, quantity] of dayOne) {
      await tx.insert(prescriptionItem).values({ branchId, visitId: billVisitId, medicineId, dose: 'Course', days: 1, quantity, instructions: `${course.name} course: given in the hospital`, createdBy: userId });
    }
    return made;
  }

  /** Not enough stock for what the sittings need: told, not refused (the pharmacy can still order). */
  async function stockWarnings(branchId: number, input: { items: { kind: string; medicineId?: number; quantity?: number }[] }[]) {
    const need = new Map<number, number>();
    for (const s of input) for (const i of s.items) if (i.kind === 'medicine' && i.medicineId) need.set(i.medicineId, (need.get(i.medicineId) ?? 0) + (i.quantity ?? 1));
    if (!need.size) return [];
    const stock = await medicinesWithStock(db, branchId, await localToday(db), inArray(medicine.id, [...need.keys()]));
    return stock.filter((m) => m.stock < need.get(m.id)!).map((m) => `${m.name}: ${need.get(m.id)} needed, ${m.stock} in stock`);
  }

  app.post('/visits/:visitId/courses', planners, async (c) => {
    const parsed = courseInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    assertVisitOpen(v.status);
    await assertPatientActive(db, b.id, v.patientId);
    const prepaid = parsed.data.payMode === 'day_one';
    const [{ doctorUserId }] = await db.select({ doctorUserId: opVisit.doctorUserId }).from(opVisit).where(eq(opVisit.id, v.id));
    const id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(treatmentCourse)
        .values({ branchId: b.id, patientId: v.patientId, visitId: v.id, name: parsed.data.name, payMode: parsed.data.payMode, startDay: parsed.data.startDay ?? null, doctorUserId: doctorUserId ?? u.id, createdBy: u.id })
        .returning({ id: treatmentCourse.id, createdAt: treatmentCourse.createdAt });
      await addSittings(tx, b.id, u, { id: row!.id, name: parsed.data.name, createdAt: row!.createdAt }, parsed.data.sittings, prepaid, v.id);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'treatment_course', entityId: row!.id, detail: { name: parsed.data.name, payMode: parsed.data.payMode, sittings: parsed.data.sittings.length, visitId: v.id } });
      return row!.id;
    });
    const [course] = await coursesWhere(b.id, eq(treatmentCourse.id, id));
    return c.json({ course, warnings: await stockWarnings(b.id, parsed.data.sittings) }, 201);
  });

  /** More sittings (platelets still low): always paid sitting by sitting, whatever the course's mode. */
  app.post('/courses/:id/sittings', planners, async (c) => {
    const parsed = sittingInputSchema.array().min(1).max(30).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const course = await courseOfBranch(b.id, Number(c.req.param('id')));
    if (course.status === 'closed') throw new AppError(409, 'bad_state', 'This course is closed');
    await db.transaction(async (tx) => {
      await addSittings(tx, b.id, u, course, parsed.data, false, course.visitId);
      // Coming back means it is going on.
      if (course.status === 'frozen') await tx.update(treatmentCourse).set({ status: 'active', frozenAt: null, updatedAt: new Date().toISOString() }).where(eq(treatmentCourse.id, course.id));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'treatment_course', entityId: course.id, detail: { addedSittings: parsed.data.length } });
    });
    const [fresh] = await coursesWhere(b.id, eq(treatmentCourse.id, course.id));
    return c.json({ course: fresh, warnings: await stockWarnings(b.id, parsed.data) }, 201);
  });

  /** A planned sitting is not needed after all. */
  app.post('/course-sittings/:id/cancel', planners, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const s = await sittingOfBranch(b.id, Number(c.req.param('id')));
    if (s.status !== 'planned' && s.status !== 'missed') throw new AppError(409, 'bad_state', 'Only a sitting that has not happened can be cancelled');
    await db.update(courseSitting).set({ status: 'cancelled', updatedAt: new Date().toISOString() }).where(eq(courseSitting.id, s.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'cancel', entity: 'course_sitting', entityId: s.id });
    return c.json({ ok: true });
  });

  /** The doctor (or the owner / branch admin) ends the course: recovered, or treatment changed. */
  app.post('/courses/:id/close', requireAnyPermission('prescription.write', 'settings.manage'), async (c) => {
    const parsed = courseCloseSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const course = await courseOfBranch(b.id, Number(c.req.param('id')));
    if (course.status === 'closed') throw new AppError(409, 'bad_state', 'This course is already closed');
    await closeCourse(course.id, b.id, parsed.data.reason, u.id, false);
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'close', entity: 'treatment_course', entityId: course.id, detail: parsed.data });
    const [fresh] = await coursesWhere(b.id, eq(treatmentCourse.id, course.id));
    return c.json({ course: fresh });
  });

  /** Started by mistake: deleted while nothing of it has happened (nothing given, billed or paid on day one). */
  app.delete('/courses/:id', planners, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const course = await courseOfBranch(b.id, Number(c.req.param('id')));
    if (course.payMode === 'day_one') throw new AppError(409, 'has_bills', 'Paid on day one: it is on the bill. Close the course instead');
    const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(courseSitting).where(and(eq(courseSitting.courseId, course.id), sql`(${courseSitting.visitId} is not null or ${courseSitting.status} in ('started', 'done'))`));
    if (n > 0) throw new AppError(409, 'has_bills', 'Some of it already happened. Close the course instead');
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.update(courseSitting).set({ status: 'cancelled', updatedAt: now }).where(and(eq(courseSitting.courseId, course.id), inArray(courseSitting.status, ['planned', 'missed'])));
      await tx.update(treatmentCourse).set({ deletedAt: now, updatedAt: now }).where(eq(treatmentCourse.id, course.id));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'treatment_course', entityId: course.id, detail: { name: course.name } });
    });
    return c.json({ ok: true });
  });

  app.get('/patients/:id/courses', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const pid = Number(c.req.param('id'));
    const [p] = Number.isInteger(pid) ? await db.select({ id: patient.id }).from(patient).where(and(eq(patient.branchId, b.id), eq(patient.id, pid), isNull(patient.deletedAt))) : [];
    if (!p) throw notFound('Patient not found');
    const ids = (await db.select({ id: treatmentCourse.id }).from(treatmentCourse).where(and(eq(treatmentCourse.branchId, b.id), eq(treatmentCourse.patientId, p.id)))).map((r) => r.id);
    await refreshCourses(b.id, c.get('user').organizationId, ids);
    return c.json({ courses: await coursesWhere(b.id, eq(treatmentCourse.patientId, p.id)) });
  });

  // ------------------------------------------------------------ the day's sittings

  async function sittingOfBranch(branchId: number, id: number) {
    const [s] = Number.isInteger(id) ? await db.select().from(courseSitting).where(and(eq(courseSitting.branchId, branchId), eq(courseSitting.id, id))) : [];
    if (!s) throw notFound('Sitting not found');
    return s;
  }

  /**
   * "Today's treatments": the sittings of yesterday, today and tomorrow (India dates), plus older ones still
   * waiting, of courses that are not closed. Oldest first.
   */
  app.get('/treatments/due', requireAnyPermission('treatment.give', 'patient.create', 'prescription.write', 'lab.view'), async (c) => {
    const b = c.get('branch');
    await refreshCourses(b.id, c.get('user').organizationId);
    const today = await localToday(db);
    const fromIso = new Date(Date.parse(`${today}T00:00:00+05:30`) - 86_400_000).toISOString();
    const toIso = new Date(Date.parse(`${today}T00:00:00+05:30`) + 2 * 86_400_000).toISOString();
    const rows = await db
      .select({
        s: courseSitting,
        courseName: treatmentCourse.name, courseStatus: treatmentCourse.status, payMode: treatmentCourse.payMode, courseCreatedAt: courseStart,
        patientId: patient.id, patientName: patient.name, patientUhid: patient.uhid, patientPhone: patient.phone,
      })
      .from(courseSitting)
      .innerJoin(treatmentCourse, eq(treatmentCourse.id, courseSitting.courseId))
      .innerJoin(patient, eq(patient.id, treatmentCourse.patientId))
      .where(and(
        eq(courseSitting.branchId, b.id),
        isNull(treatmentCourse.deletedAt),
        sql`${treatmentCourse.status} <> 'closed'`,
        sql`((${courseSitting.dueAt} >= ${fromIso} and ${courseSitting.dueAt} < ${toIso}) or ${courseSitting.status} = 'started')`,
        sql`${courseSitting.status} <> 'cancelled'`,
      ))
      .orderBy(asc(courseSitting.dueAt))
      .limit(500);
    const items = rows.length ? await db.select().from(courseItem).where(and(eq(courseItem.branchId, b.id), inArray(courseItem.sittingId, rows.map((r) => r.s.id)))).orderBy(asc(courseItem.sortOrder), asc(courseItem.id)) : [];
    const sittings: DueSitting[] = rows.map((r) => ({
      id: r.s.id, dueAt: r.s.dueAt, kind: r.s.kind, reviewFeePaise: r.s.reviewFeePaise, status: r.s.status, visitId: r.s.visitId, doneAt: r.s.doneAt, note: r.s.note,
      items: items.filter((i) => i.sittingId === r.s.id).map((i) => ({ id: i.id, kind: i.kind, medicineId: i.medicineId, testId: i.testId, description: i.description, quantity: i.quantity, pricePaise: i.pricePaise, prepaid: i.prepaid, givenAt: i.givenAt })),
      courseId: r.s.courseId, courseName: r.courseName, courseStatus: r.courseStatus, payMode: r.payMode,
      patientId: r.patientId, patientName: r.patientName, patientUhid: r.patientUhid, patientPhone: r.patientPhone,
      label: sittingLabel(r.courseCreatedAt, r.s.dueAt),
    }));
    return c.json({ today, sittings });
  });

  /** The visit of a sitting, made the first time it is needed (in the same transaction as what goes on it). */
  async function visitForSitting(tx: Tx, branchId: number, userId: number, s: typeof courseSitting.$inferSelect, course: typeof treatmentCourse.$inferSelect) {
    if (s.visitId) return s.visitId;
    const day = await localToday(tx as unknown as Db);
    const [{ start }] = await tx.select({ start: courseStart }).from(treatmentCourse).where(eq(treatmentCourse.id, course.id));
    const label = sittingLabel(start, s.dueAt);
    // A review is a normal OP visit (token, the doctor's queue); lab and nurse sittings take no token.
    const kind = s.kind === 'review' ? 'op' : s.kind === 'lab' ? 'lab' : 'trt';
    const n = await nextNumber(tx, branchId, `${kind}:${day}`);
    const opNo = `${kind.toUpperCase()}-${dayStamp(day)}-${String(n).padStart(3, '0')}`;
    const [v] = await tx
      .insert(opVisit)
      .values({
        branchId, patientId: course.patientId, opNo, visitDate: day, createdBy: userId,
        doctorUserId: s.kind === 'review' ? course.doctorUserId : null,
        complaint: `${course.name} course · ${label}`,
        consultationFeePaise: s.kind === 'review' ? (s.reviewFeePaise ?? 0) : 0,
        status: s.kind === 'review' ? 'waiting' : 'at_counter',
      })
      .returning({ id: opVisit.id });
    await tx.update(courseSitting).set({ visitId: v!.id, updatedAt: new Date().toISOString() }).where(eq(courseSitting.id, s.id));
    return v!.id;
  }

  async function sittingOfBranchTx(tx: Tx, branchId: number, id: number) {
    const [s] = await tx.select().from(courseSitting).where(and(eq(courseSitting.branchId, branchId), eq(courseSitting.id, id)));
    return s!;
  }

  /** What the counter collects for an item given at a sitting (not paid on day one). */
  async function billItem(tx: Tx, branchId: number, u: { id: number; organizationId: number }, item: typeof courseItem.$inferSelect, visitId: number, courseName: string) {
    if (item.kind === 'medicine') await tx.insert(prescriptionItem).values({ branchId, visitId, medicineId: item.medicineId!, dose: 'Course', days: 1, quantity: item.quantity, instructions: `${courseName} course: given in the hospital`, createdBy: u.id });
    else if (item.kind === 'charge') await addChargeToVisit(tx, branchId, u, visitId, { description: item.description, amountPaise: item.pricePaise });
  }

  /** Coming for a sitting un-freezes the course. */
  const thaw = (tx: Tx, course: typeof treatmentCourse.$inferSelect) =>
    course.status === 'frozen' ? tx.update(treatmentCourse).set({ status: 'active', frozenAt: null, updatedAt: new Date().toISOString() }).where(eq(treatmentCourse.id, course.id)) : Promise.resolve();

  /**
   * The patient is here for this sitting. Review: an OP visit waiting for the doctor. Lab: a lab-only visit with
   * its tests ordered (already paid on day one: settled at once). Nurse: marked started; the nurse ticks what she gives.
   */
  app.post('/course-sittings/:id/start', requireAnyPermission('treatment.give', 'patient.create', 'lab.view'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const s = await sittingOfBranch(b.id, Number(c.req.param('id')));
    const course = await courseOfBranch(b.id, s.courseId);
    if (course.status === 'closed') throw new AppError(409, 'bad_state', 'This course is closed');
    if (s.status !== 'planned' && s.status !== 'missed') throw new AppError(409, 'bad_state', s.status === 'cancelled' ? 'This sitting was cancelled' : 'This sitting has already started');
    await assertPatientActive(db, b.id, course.patientId);
    const visitId = await exclusively(db, async (tx) => {
      // Claim the sitting first: two Start presses at once make one visit, not two.
      const claimed = await tx.update(courseSitting).set({ status: s.kind === 'nurse' ? 'started' : 'done', doneAt: s.kind === 'nurse' ? null : new Date().toISOString(), updatedAt: new Date().toISOString() }).where(and(eq(courseSitting.id, s.id), inArray(courseSitting.status, ['planned', 'missed']))).returning({ id: courseSitting.id });
      if (!claimed.length) throw new AppError(409, 'bad_state', 'This sitting has already started');
      let vid: number | null = null;
      // Its lab tests are ordered now, whatever else the sitting holds (a drip and a CBC in one sitting).
      const tests = await tx.select().from(courseItem).where(and(eq(courseItem.sittingId, s.id), eq(courseItem.kind, 'test')));
      if (s.kind === 'review' || s.kind === 'lab' || tests.length) vid = await visitForSitting(tx, b.id, u.id, s, course);
      if (tests.length) {
        const prices = tests.length ? await tx.select({ id: labTest.id, price: labTest.pricePaise }).from(labTest).where(and(eq(labTest.branchId, b.id), inArray(labTest.id, tests.map((t) => t.testId!)))) : [];
        if (tests.length) {
          await tx.insert(labOrder).values(tests.map((t) => ({ branchId: b.id, visitId: vid!, patientId: course.patientId, testId: t.testId!, pricePaise: t.prepaid ? 0 : (prices.find((p) => p.id === t.testId)?.price ?? 0), orderedBy: u.id })));
          await tx.update(courseItem).set({ givenAt: new Date().toISOString(), givenBy: u.id }).where(and(eq(courseItem.sittingId, s.id), eq(courseItem.kind, 'test')));
        }
        // Paid on day one: a bill of nothing, so it never waits at the counter.
        if (s.kind === 'lab' && tests.every((t) => t.prepaid)) {
          await createBill(tx, b.id, u, { id: vid!, patientId: course.patientId }, await localToday(tx as unknown as Db));
          await tx.update(opVisit).set({ status: 'completed' }).where(eq(opVisit.id, vid!));
        }
      }
      // A review or lab sitting is done now: its other items (a medicine, a charge, the prepaid review fee) too.
      // A nurse sitting's are ticked by the nurse one by one.
      if (vid && s.kind !== 'nurse') {
        const rest = await tx.select().from(courseItem).where(and(eq(courseItem.sittingId, s.id), isNull(courseItem.givenAt), sql`${courseItem.kind} not in ('test', 'note')`));
        for (const i of rest) if (!i.prepaid) await billItem(tx, b.id, u, i, vid, course.name);
        if (rest.length) await tx.update(courseItem).set({ givenAt: new Date().toISOString(), givenBy: u.id }).where(inArray(courseItem.id, rest.map((i) => i.id)));
      }
      await thaw(tx, course);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'start', entity: 'course_sitting', entityId: s.id, detail: { courseId: course.id, kind: s.kind, visitId: vid } });
      return vid;
    });
    return c.json({ ok: true, visitId });
  });

  /**
   * The nurse gave this. Paid on day one: only marked. Paid per sitting: a medicine goes on the sitting's visit for
   * the counter (stock is taken when the counter collects), a charge on its bill. The last item done = sitting done.
   */
  app.post('/course-items/:id/given', requirePermission('treatment.give'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const id = Number(c.req.param('id'));
    const [item] = Number.isInteger(id) ? await db.select().from(courseItem).where(and(eq(courseItem.branchId, b.id), eq(courseItem.id, id))) : [];
    if (!item) throw notFound('Not found');
    if (item.givenAt) throw new AppError(409, 'bad_state', 'Already marked as given');
    if (item.kind === 'note') throw new AppError(400, 'validation', 'A note is not given');
    const s = await sittingOfBranch(b.id, item.sittingId);
    const course = await courseOfBranch(b.id, s.courseId);
    if (course.status === 'closed') throw new AppError(409, 'bad_state', 'This course is closed');
    if (s.status === 'cancelled' || s.status === 'done') throw new AppError(409, 'bad_state', s.status === 'done' ? 'This sitting is already done' : 'This sitting was cancelled');
    await assertPatientActive(db, b.id, course.patientId);
    if (item.kind === 'medicine' && !item.prepaid) {
      const [m] = await medicinesWithStock(db, b.id, await localToday(db), eq(medicine.id, item.medicineId!));
      if (!m || m.stock < item.quantity) throw new AppError(409, 'out_of_stock', `${item.description}: ${m?.stock ?? 0} in stock, ${item.quantity} needed. Ask the pharmacy, or the doctor to change the medicine.`);
    }
    const now = new Date().toISOString();
    await exclusively(db, async (tx) => {
      // Claim it first: of two taps at once only one gets the row, the other is told it is already given.
      const claimed = await tx.update(courseItem).set({ givenAt: now, givenBy: u.id, updatedAt: now }).where(and(eq(courseItem.id, item.id), isNull(courseItem.givenAt))).returning({ id: courseItem.id });
      if (!claimed.length) throw new AppError(409, 'bad_state', 'Already marked as given');
      if (!item.prepaid && item.kind !== 'test') await billItem(tx, b.id, u, item, await visitForSitting(tx, b.id, u.id, await sittingOfBranchTx(tx, b.id, s.id), course), course.name);
      const [{ left }] = await tx.all<{ left: number }>(sql`select count(*) as left from course_item where sitting_id = ${s.id} and given_at is null and kind <> 'note'`);
      await tx.update(courseSitting).set({ status: left === 0 ? 'done' : 'started', doneAt: left === 0 ? now : null, updatedAt: now }).where(eq(courseSitting.id, s.id));
      await thaw(tx, course);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'given', entity: 'course_item', entityId: item.id, detail: { courseId: course.id, sittingId: s.id, item: item.description, quantity: item.quantity, prepaid: item.prepaid } });
    });
    return c.json({ ok: true });
  });

  // ------------------------------------------------------------ the course page: now, later, edit

  /**
   * "+ Add now": something given right now (dizzy -> glucose). One sitting at this minute, everything in it given
   * and on the bill at once (the counter collects). Doctor, branch admin or owner.
   */
  app.post('/courses/:id/now', planners, async (c) => {
    const parsed = courseNowSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const course = await courseOfBranch(b.id, Number(c.req.param('id')));
    if (course.status === 'closed') throw new AppError(409, 'bad_state', 'This course is closed');
    await assertPatientActive(db, b.id, course.patientId);
    const today = await localToday(db);
    for (const i of parsed.data.items.filter((x) => x.kind === 'medicine')) {
      const [m] = await medicinesWithStock(db, b.id, today, eq(medicine.id, i.medicineId!));
      if (!m || m.stock < (i.quantity ?? 1)) throw new AppError(409, 'out_of_stock', `${m?.name ?? 'This medicine'}: ${m?.stock ?? 0} in stock.`);
    }
    const now = new Date().toISOString();
    await exclusively(db, async (tx) => {
      const [sid] = await addSittings(tx, b.id, u, course, [{ dueAt: now, kind: 'nurse', items: parsed.data.items, reviewFeePaise: null }], false, course.visitId);
      const sitting = await sittingOfBranchTx(tx, b.id, sid!);
      const vid = await visitForSitting(tx, b.id, u.id, sitting, course);
      const items = await tx.select().from(courseItem).where(eq(courseItem.sittingId, sid!));
      for (const i of items) await billItem(tx, b.id, u, i, vid, course.name);
      await tx.update(courseItem).set({ givenAt: now, givenBy: u.id, updatedAt: now }).where(eq(courseItem.sittingId, sid!));
      await tx.update(courseSitting).set({ status: 'done', doneAt: now, updatedAt: now }).where(eq(courseSitting.id, sid!));
      await thaw(tx, course);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'given_now', entity: 'course_sitting', entityId: sid!, detail: { courseId: course.id, items: items.map((i) => `${i.description} x${i.quantity}`) } });
    });
    const [fresh] = await coursesWhere(b.id, eq(treatmentCourse.id, course.id));
    return c.json({ course: fresh }, 201);
  });

  /** Change a planned sitting: another time, or (not paid on day one) other things in it. */
  app.patch('/course-sittings/:id', planners, async (c) => {
    const parsed = sittingEditSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const s = await sittingOfBranch(b.id, Number(c.req.param('id')));
    if (s.status !== 'planned' && s.status !== 'missed') throw new AppError(409, 'bad_state', 'Only a sitting that has not happened can be changed');
    const course = await courseOfBranch(b.id, s.courseId);
    if (course.status === 'closed') throw new AppError(409, 'bad_state', 'This course is closed');
    const now = new Date().toISOString();
    await exclusively(db, async (tx) => {
      if (parsed.data.dueAt) await tx.update(courseSitting).set({ dueAt: new Date(parsed.data.dueAt).toISOString(), status: 'planned', updatedAt: now }).where(eq(courseSitting.id, s.id));
      if (parsed.data.note !== undefined) await tx.update(courseSitting).set({ note: parsed.data.note, updatedAt: now }).where(eq(courseSitting.id, s.id));
      const had = await tx.select({ prepaid: courseItem.prepaid }).from(courseItem).where(eq(courseItem.sittingId, s.id));
      const paidDayOne = had.some((i) => i.prepaid);
      if (parsed.data.kind && parsed.data.kind !== s.kind) {
        if (paidDayOne) throw new AppError(409, 'bad_state', 'This sitting was paid on day one: only its time and notes can be changed');
        await tx.update(courseSitting).set({ kind: parsed.data.kind, reviewFeePaise: parsed.data.kind === 'review' ? (parsed.data.reviewFeePaise ?? null) : null, updatedAt: now }).where(eq(courseSitting.id, s.id));
      } else if (parsed.data.reviewFeePaise !== undefined && s.kind === 'review') await tx.update(courseSitting).set({ reviewFeePaise: parsed.data.reviewFeePaise, updatedAt: now }).where(eq(courseSitting.id, s.id));
      if (parsed.data.items) {
        if (paidDayOne) throw new AppError(409, 'bad_state', 'This sitting was paid on day one: only its time and notes can be changed');
        const cat = await catalog(b.id, [{ items: parsed.data.items }]);
        await tx.delete(courseItem).where(eq(courseItem.sittingId, s.id));
        const rows = itemRows(cat, parsed.data.items, false);
        if (rows.length) await tx.insert(courseItem).values(rows.map((r) => ({ ...r, branchId: b.id, sittingId: s.id, prepaid: false })));
      }
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'course_sitting', entityId: s.id, detail: parsed.data });
    });
    const [fresh] = await coursesWhere(b.id, eq(treatmentCourse.id, course.id));
    return c.json({ course: fresh });
  });

  // ------------------------------------------------------------ course templates ("Dengue": made once)

  const templateRow = (t: typeof courseTemplate.$inferSelect): CourseTemplate => ({ id: t.id, name: t.name, sittings: JSON.parse(t.sittings) as CourseTemplate['sittings'] });
  async function templateOfBranch(branchId: number, id: number) {
    const [t] = Number.isInteger(id) ? await db.select().from(courseTemplate).where(and(eq(courseTemplate.branchId, branchId), eq(courseTemplate.id, id), isNull(courseTemplate.deletedAt))) : [];
    if (!t) throw notFound('Template not found');
    return t;
  }

  app.get('/course-templates', planners, async (c) => {
    const rows = await db.select().from(courseTemplate).where(and(eq(courseTemplate.branchId, c.get('branch').id), isNull(courseTemplate.deletedAt))).orderBy(asc(courseTemplate.name));
    return c.json({ templates: rows.map(templateRow) });
  });

  app.post('/course-templates', planners, async (c) => {
    const parsed = courseTemplateSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    await catalog(b.id, parsed.data.sittings);
    const [row] = await db.insert(courseTemplate).values({ branchId: b.id, name: parsed.data.name, sittings: JSON.stringify(parsed.data.sittings), createdBy: u.id }).returning({ id: courseTemplate.id });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'course_template', entityId: row!.id, detail: { name: parsed.data.name } });
    return c.json({ id: row!.id }, 201);
  });

  app.put('/course-templates/:id', planners, async (c) => {
    const parsed = courseTemplateSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const t = await templateOfBranch(b.id, Number(c.req.param('id')));
    await catalog(b.id, parsed.data.sittings);
    await db.update(courseTemplate).set({ name: parsed.data.name, sittings: JSON.stringify(parsed.data.sittings), updatedAt: new Date().toISOString() }).where(eq(courseTemplate.id, t.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'course_template', entityId: t.id, detail: { name: parsed.data.name } });
    return c.json({ ok: true });
  });

  app.delete('/course-templates/:id', planners, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const t = await templateOfBranch(b.id, Number(c.req.param('id')));
    await db.update(courseTemplate).set({ deletedAt: new Date().toISOString() }).where(eq(courseTemplate.id, t.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'course_template', entityId: t.id });
    return c.json({ ok: true });
  });

  return app;
}
