// Lab: test catalog (per branch), orders from a visit, and the lab queue.
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import {
  flagResult,
  LAB_CATALOG,
  labOrderInputSchema,
  labResultsSchema,
  labTestInputSchema,
  LAB_ORDER_STATUSES,
  type LabOrder,
  type LabQueueEntry,
  type LabReport,
  type LabReportTest,
  type LabTestDetail,
  type PatientLabOrder,
} from '@platform/shared';
import { AppError, notFound, printHeaderOf, requireAnyPermission, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { labOrder, labResult, labTest, labTestParameter, opBill, opBillLine, opVisit, patient, user } from '../db/schema.js';
import { patientOfBranch, visitOfBranch, withToken } from '../lib/clinic.js';
import { labPaymentState, onLabOrderCancel } from './billing.js';

const doctor = alias(user, 'doctor');

const orderColumns = {
  id: labOrder.id,
  visitId: labOrder.visitId,
  testId: labOrder.testId,
  testName: labTest.name,
  pricePaise: labOrder.pricePaise,
  status: labOrder.status,
  createdAt: labOrder.createdAt,
  sampleCollectedAt: labOrder.sampleCollectedAt,
  completedAt: labOrder.completedAt,
};

/**
 * A result line added by hand. With a range that has a number in it ("12 - 15", "< 200") the result is a number
 * and is flagged high / low; otherwise it is free text, with no quick picks.
 */
const newLine = (p: { name: string; method: string; unit: string; refRange: string }) => {
  const number = /\d/.test(p.refRange);
  return { name: p.name, method: p.method, unit: p.unit, refRange: p.refRange, valueType: number ? ('number' as const) : ('text' as const), options: number ? null : '[]' };
};

export function createLabRoutes(db: Db) {
  const app = new Hono<BranchEnv>();

  async function testOfBranch(branchId: number, id: number) {
    if (!Number.isInteger(id)) throw notFound('Test not found');
    const [t] = await db.select({ id: labTest.id }).from(labTest).where(and(eq(labTest.branchId, branchId), eq(labTest.id, id), isNull(labTest.deletedAt)));
    if (!t) throw notFound('Test not found');
    return t;
  }

  async function labReportOf(branchId: number, visitId: number): Promise<LabReport> {
    const [v] = await db
      .select({ id: opVisit.id, opNo: opVisit.opNo, visitDate: opVisit.visitDate, doctorName: doctor.name, labNote: opVisit.labNote, patientId: opVisit.patientId })
      .from(opVisit)
      .leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId))
      .where(eq(opVisit.id, visitId));
    const [p] = await db
      .select({ id: patient.id, name: patient.name, uhid: patient.uhid, gender: patient.gender, ageYears: patient.ageYears, dob: patient.dob, phone: patient.phone })
      .from(patient)
      .where(eq(patient.id, v!.patientId));
    const orders = await db
      .select({ ...orderColumns, department: labTest.department, kind: labTest.kind, sortOrder: labTest.sortOrder })
      .from(labOrder)
      .innerJoin(labTest, eq(labTest.id, labOrder.testId))
      .where(and(eq(labOrder.branchId, branchId), eq(labOrder.visitId, visitId), sql`${labOrder.status} <> 'cancelled'`))
      .orderBy(asc(labTest.sortOrder), asc(labOrder.id));
    const testIds = [...new Set(orders.map((o) => o.testId))];
    const params = testIds.length
      ? await db
          .select()
          .from(labTestParameter)
          .where(and(inArray(labTestParameter.testId, testIds), isNull(labTestParameter.deletedAt)))
          .orderBy(asc(labTestParameter.sortOrder), asc(labTestParameter.id))
      : [];
    const results = orders.length ? await db.select().from(labResult).where(inArray(labResult.orderId, orders.map((o) => o.id))) : [];
    const tests: LabReportTest[] = orders.map((o) => ({
      orderId: o.id,
      testId: o.testId,
      name: o.testName,
      department: o.department,
      kind: o.kind,
      status: o.status,
      sampleCollectedAt: o.sampleCollectedAt,
      completedAt: o.completedAt,
      parameters: params
        .filter((x) => x.testId === o.testId)
        .map((x) => {
          const r = results.find((r) => r.orderId === o.id && r.parameterId === x.id);
          return {
            id: x.id,
            name: x.name,
            method: x.method,
            unit: x.unit,
            refRange: x.refRange,
            type: x.valueType,
            options: x.options ? (JSON.parse(x.options) as string[]) : x.valueType === 'text' ? ['NEGATIVE', 'POSITIVE'] : [],
            noFlag: x.noFlag,
            value: r?.value ?? '',
            flag: (r?.flag ?? '') as LabReportTest['parameters'][number]['flag'],
          };
        }),
    }));
    // The patient bill(s) these lab tests are on (not the pharmacy sale); usually one.
    const bills = await db
      .selectDistinct({ id: opBill.id, billNo: opBill.billNo, createdAt: opBill.createdAt })
      .from(opBillLine)
      .innerJoin(labOrder, eq(labOrder.id, opBillLine.labOrderId))
      .innerJoin(opBill, eq(opBill.id, opBillLine.billId))
      .where(and(eq(opBillLine.branchId, branchId), eq(opBill.branchId, branchId), eq(labOrder.branchId, branchId), eq(labOrder.visitId, visitId)))
      .orderBy(asc(opBill.id));
    const dobAge = p!.dob ? Math.floor((Date.now() - new Date(p!.dob).getTime()) / 31_557_600_000) : null;
    return {
      visit: { id: v!.id, opNo: v!.opNo, visitDate: v!.visitDate, doctorName: v!.doctorName, labNote: v!.labNote },
      patient: { id: p!.id, name: p!.name, uhid: p!.uhid, gender: p!.gender, age: dobAge ?? p!.ageYears, phone: p!.phone },
      tests,
      header: await printHeaderOf(db, branchId),
      billNo: bills.length ? bills.map((b) => b.billNo).join(', ') : null,
      billedAt: bills[0]?.createdAt ?? null,
    };
  }

  // ---------------------------------------------------------------- tests catalog

  app.get('/lab/tests', requireAnyPermission('lab.view', 'lab.order'), async (c) => {
    const tests = await db
      .select({
        id: labTest.id,
        name: labTest.name,
        pricePaise: labTest.pricePaise,
        department: labTest.department,
        kind: labTest.kind,
      })
      .from(labTest)
      .where(and(eq(labTest.branchId, c.get('branch').id), isNull(labTest.deletedAt)))
      .orderBy(asc(labTest.sortOrder), asc(labTest.id));
    // Count parameters separately (a correlated subquery here rendered an unqualified "id").
    const counts = await db
      .select({ testId: labTestParameter.testId, n: sql<number>`count(*)` })
      .from(labTestParameter)
      .where(and(eq(labTestParameter.branchId, c.get('branch').id), isNull(labTestParameter.deletedAt)))
      .groupBy(labTestParameter.testId);
    const byTest = new Map(counts.map((r) => [r.testId, r.n]));
    return c.json({ tests: tests.map((x) => ({ ...x, parameterCount: byTest.get(x.id) ?? 0 })) });
  });

  app.post('/lab/tests', requirePermission('settings.manage'), async (c) => {
    const parsed = labTestInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const { parameters, ...test } = parsed.data;
    const row = await db.transaction(async (tx) => {
      const [t] = await tx.insert(labTest).values({ ...test, branchId: b.id, sortOrder: 1000 }).returning({ id: labTest.id });
      // Its own result lines (a group test: CBC with Haemoglobin, Basophils, ...); without any, one line with the test's name (a free-text result).
      if (parameters) await tx.insert(labTestParameter).values(parameters.map((p, i) => ({ ...newLine(p), branchId: b.id, testId: t.id, sortOrder: i })));
      else await tx.insert(labTestParameter).values({ branchId: b.id, testId: t.id, name: parsed.data.name, valueType: 'text' });
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'lab_test', entityId: t.id, detail: parsed.data });
      return t;
    });
    return c.json({ id: row.id }, 201);
  });

  /** Add the clinic's standard tests (CBC, LFT, urine, card tests ...). Skips names the branch already has. */
  app.post('/lab/tests/load-standard', requirePermission('settings.manage'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const existing = new Set(
      (await db.select({ name: labTest.name }).from(labTest).where(and(eq(labTest.branchId, b.id), isNull(labTest.deletedAt)))).map((t) => t.name.toLowerCase()),
    );
    const added: string[] = [];
    await db.transaction(async (tx) => {
      for (const [i, t] of LAB_CATALOG.entries()) {
        if (existing.has(t.name.toLowerCase())) continue;
        const [row] = await tx
          .insert(labTest)
          .values({ branchId: b.id, name: t.name, pricePaise: 0, department: t.department, kind: t.kind, sortOrder: i })
          .returning({ id: labTest.id });
        await tx.insert(labTestParameter).values(
          t.parameters.map((p, j) => ({
            branchId: b.id,
            testId: row.id,
            name: p.name,
            method: p.method,
            unit: p.unit,
            refRange: p.refRange,
            valueType: p.type,
            options: p.options ? JSON.stringify(p.options) : null,
            noFlag: !!p.noFlag,
            sortOrder: j,
          })),
        );
        added.push(t.name);
      }
      if (added.length) await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'load_standard', entity: 'lab_test', detail: { added } });
    });
    return c.json({ added: added.length, skipped: LAB_CATALOG.length - added.length });
  });

  app.patch('/lab/tests/:id', requirePermission('settings.manage'), async (c) => {
    const parsed = labTestInputSchema.partial().safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const t = await testOfBranch(b.id, Number(c.req.param('id')));
    const { parameters, ...test } = parsed.data;
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.update(labTest).set({ ...test, updatedAt: now }).where(eq(labTest.id, t.id));
      if (parameters) {
        const have = (await tx.select({ id: labTestParameter.id }).from(labTestParameter).where(and(eq(labTestParameter.branchId, b.id), eq(labTestParameter.testId, t.id), isNull(labTestParameter.deletedAt)))).map((r) => r.id);
        if (parameters.some((p) => p.id != null && !have.includes(p.id))) throw new AppError(400, 'validation', 'A result line belongs to a different test. Refresh and try again.');
        // Lines left out are removed (kept in the database: results already entered for them stay on record).
        const gone = have.filter((id) => !parameters.some((p) => p.id === id));
        if (gone.length) await tx.update(labTestParameter).set({ deletedAt: now }).where(inArray(labTestParameter.id, gone));
        for (const [i, p] of parameters.entries()) {
          const { id, ...line } = p;
          // An existing line keeps how its result is typed (number / text, quick picks); only what is on the form changes.
          if (id != null) await tx.update(labTestParameter).set({ ...line, sortOrder: i }).where(eq(labTestParameter.id, id));
          else await tx.insert(labTestParameter).values({ ...newLine(p), branchId: b.id, testId: t.id, sortOrder: i });
        }
      }
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'lab_test', entityId: t.id, detail: parsed.data });
    });
    return c.json({ ok: true });
  });

  /** One test with its result lines, for the edit form. */
  app.get('/lab/tests/:id', requirePermission('settings.manage'), async (c) => {
    const b = c.get('branch');
    const t = await testOfBranch(b.id, Number(c.req.param('id')));
    const [row] = await db.select({ id: labTest.id, name: labTest.name, pricePaise: labTest.pricePaise, department: labTest.department, kind: labTest.kind }).from(labTest).where(eq(labTest.id, t.id));
    const parameters = await db
      .select({ id: labTestParameter.id, name: labTestParameter.name, method: labTestParameter.method, unit: labTestParameter.unit, refRange: labTestParameter.refRange })
      .from(labTestParameter)
      .where(and(eq(labTestParameter.branchId, b.id), eq(labTestParameter.testId, t.id), isNull(labTestParameter.deletedAt)))
      .orderBy(asc(labTestParameter.sortOrder), asc(labTestParameter.id));
    const test: LabTestDetail = { ...row!, parameters };
    return c.json({ test });
  });

  app.delete('/lab/tests/:id', requirePermission('settings.manage'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const t = await testOfBranch(b.id, Number(c.req.param('id')));
    await db.update(labTest).set({ deletedAt: new Date().toISOString() }).where(eq(labTest.id, t.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'lab_test', entityId: t.id });
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------- orders from a visit

  app.get('/visits/:visitId/lab-orders', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    const orders: LabOrder[] = await db
      .select(orderColumns)
      .from(labOrder)
      .innerJoin(labTest, eq(labTest.id, labOrder.testId))
      .where(and(eq(labOrder.branchId, b.id), eq(labOrder.visitId, v.id)))
      .orderBy(asc(labOrder.id));
    return c.json({ orders });
  });

  app.post('/visits/:visitId/lab-orders', requirePermission('lab.order'), async (c) => {
    const parsed = labOrderInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    if (v.status === 'cancelled') throw new AppError(400, 'visit_cancelled', 'This visit was cancelled');
    const testIds = [...new Set(parsed.data.testIds)];
    const tests = await db
      .select({ id: labTest.id, pricePaise: labTest.pricePaise })
      .from(labTest)
      .where(and(eq(labTest.branchId, b.id), isNull(labTest.deletedAt), inArray(labTest.id, testIds)));
    if (tests.length !== testIds.length) throw new AppError(400, 'validation', 'Choose tests from this branch', { testIds: ['Choose tests from this branch'] });
    await db.transaction(async (tx) => {
      await tx.insert(labOrder).values(tests.map((t) => ({ branchId: b.id, visitId: v.id, patientId: v.patientId, testId: t.id, pricePaise: t.pricePaise, orderedBy: u.id })));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'order', entity: 'lab_order', entityId: v.id, detail: { testIds } });
    });
    return c.json({ ok: true, count: tests.length }, 201);
  });

  /** A patient's lab orders over all visits, newest first, with whether each visit's report can be printed. */
  app.get('/patients/:id/lab-orders', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const p = await patientOfBranch(db, b.id, Number(c.req.param('id')));
    const rows = await db
      .select({ ...orderColumns, opNo: opVisit.opNo, visitDate: opVisit.visitDate })
      .from(labOrder)
      .innerJoin(labTest, eq(labTest.id, labOrder.testId))
      .innerJoin(opVisit, eq(opVisit.id, labOrder.visitId))
      .where(and(eq(labOrder.branchId, b.id), eq(labOrder.patientId, p.id), isNull(opVisit.deletedAt)))
      .orderBy(desc(labOrder.id));
    // Paid / released is a rule of the visit (the same one the report endpoint applies).
    const payment = new Map<number, Awaited<ReturnType<typeof labPaymentState>>>();
    for (const visitId of new Set(rows.map((r) => r.visitId))) payment.set(visitId, await labPaymentState(db, b.id, visitId));
    const orders: PatientLabOrder[] = rows.map((r) => {
      const { paid, released, printAllowed } = payment.get(r.visitId)!;
      return { ...withToken(r), paid, released, printAllowed };
    });
    return c.json({ orders });
  });

  // ---------------------------------------------------------------- lab queue

  /** Orders waiting in the lab (default: ordered + sample collected), oldest first. */
  app.get('/lab/orders', requirePermission('lab.view'), async (c) => {
    const b = c.get('branch');
    const status = c.req.query('status');
    const statuses = (LAB_ORDER_STATUSES as readonly string[]).includes(status ?? '') ? [status as LabOrder['status']] : (['ordered', 'sample_collected'] as const);
    const orders: LabQueueEntry[] = await db
      .select({ ...orderColumns, opNo: opVisit.opNo, patientId: patient.id, patientName: patient.name, patientUhid: patient.uhid, doctorName: doctor.name, labNote: opVisit.labNote })
      .from(labOrder)
      .innerJoin(labTest, eq(labTest.id, labOrder.testId))
      .innerJoin(opVisit, eq(opVisit.id, labOrder.visitId))
      .innerJoin(patient, eq(patient.id, labOrder.patientId))
      .leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId))
      // A deleted visit's tests are gone with it; a cancelled visit has nothing waiting at the lab.
      .where(and(eq(labOrder.branchId, b.id), inArray(labOrder.status, [...statuses]), isNull(opVisit.deletedAt), status === 'completed' ? undefined : sql`${opVisit.status} <> 'cancelled'`))
      // The queue in the order the tests came in; finished ones newest first, and only the latest (the rest are on the patient's page).
      .orderBy(status === 'completed' ? desc(labOrder.id) : asc(labOrder.id))
      .limit(status === 'completed' ? 300 : 1000);
    return c.json({ orders });
  });

  /** Everything for the results screen and the printed report of one visit. */
  app.get('/visits/:visitId/lab-report', requireAnyPermission('lab.view', 'lab.order'), async (c) => {
    const b = c.get('branch');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    const payment = await labPaymentState(db, b.id, v.id);
    // Printing needs the lab charges paid (or an admin release); entering results does not.
    if (c.req.query('print') === '1' && !payment.printAllowed) {
      throw new AppError(402, 'unpaid', `Lab charges of ₹${(payment.duePaise / 100).toFixed(2)} are not paid yet. Collect payment in Billing first.`);
    }
    return c.json({ ...(await labReportOf(b.id, v.id)), payment });
  });

  /** Save results for one order. complete=true marks it done (it then appears on the report as final). */
  app.put('/lab/orders/:id/results', requirePermission('lab.view'), async (c) => {
    const parsed = labResultsSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const id = Number(c.req.param('id'));
    const [o] = await db.select({ id: labOrder.id, testId: labOrder.testId, status: labOrder.status }).from(labOrder).where(and(eq(labOrder.branchId, b.id), eq(labOrder.id, id)));
    if (!o) throw notFound('Lab order not found');
    if (o.status === 'cancelled') throw new AppError(409, 'bad_state', 'This test was cancelled');
    const amending = o.status === 'completed';
    // A final report stays whole: a value can be corrected, not emptied.
    if (amending && parsed.data.results.some((r) => r.value === '')) throw new AppError(400, 'validation', 'This test is completed. A value can be corrected, but not left empty.');
    const params = await db
      .select({ id: labTestParameter.id, refRange: labTestParameter.refRange, noFlag: labTestParameter.noFlag })
      .from(labTestParameter)
      .where(and(eq(labTestParameter.testId, o.testId), isNull(labTestParameter.deletedAt)));
    const byId = new Map(params.map((p) => [p.id, p]));
    if (parsed.data.results.some((r) => !byId.has(r.parameterId))) throw new AppError(400, 'validation', 'A result belongs to a different test');
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      for (const r of parsed.data.results) {
        if (r.value === '') {
          await tx.delete(labResult).where(and(eq(labResult.orderId, id), eq(labResult.parameterId, r.parameterId)));
          continue;
        }
        const p = byId.get(r.parameterId)!;
        const flag = flagResult(r.value, p.refRange, p.noFlag);
        await tx
          .insert(labResult)
          .values({ branchId: b.id, orderId: id, parameterId: r.parameterId, value: r.value, flag, enteredBy: u.id })
          .onConflictDoUpdate({ target: [labResult.orderId, labResult.parameterId], set: { value: r.value, flag, enteredBy: u.id, updatedAt: now } });
      }
      if (amending) {
        // A correction after the report was final: when and by whom it was completed stays as it was.
        await tx.update(labOrder).set({ updatedAt: now }).where(eq(labOrder.id, id));
      } else if (parsed.data.complete) {
        await tx
          .update(labOrder)
          .set({ status: 'completed', completedAt: now, completedBy: u.id, sampleCollectedAt: sql`coalesce(${labOrder.sampleCollectedAt}, ${now})`, updatedAt: now })
          .where(eq(labOrder.id, id));
      } else if (o.status === 'ordered') {
        await tx.update(labOrder).set({ status: 'sample_collected', sampleCollectedAt: now, updatedAt: now }).where(eq(labOrder.id, id));
      }
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: amending ? 'amend' : parsed.data.complete ? 'complete' : 'results', entity: 'lab_order', entityId: id, detail: amending ? { results: parsed.data.results } : undefined });
    });
    return c.json({ ok: true });
  });

  /** Sample collected, or cancel an order that has no results yet. */
  app.patch('/lab/orders/:id', requireAnyPermission('lab.view', 'lab.order'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const id = Number(c.req.param('id'));
    const body = (await c.req.json().catch(() => ({}))) as { status?: string };
    const [o] = await db.select({ id: labOrder.id, status: labOrder.status }).from(labOrder).where(and(eq(labOrder.branchId, b.id), eq(labOrder.id, id)));
    if (!o) throw notFound('Lab order not found');
    if (body.status === 'sample_collected') {
      if (!c.get('branch').permissions.includes('lab.view')) throw new AppError(403, 'forbidden', "You don't have permission for this");
      if (o.status !== 'ordered') throw new AppError(409, 'bad_state', 'Only a new order can be marked as collected');
      await db.update(labOrder).set({ status: 'sample_collected', sampleCollectedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(labOrder.id, id));
    } else if (body.status === 'cancelled') {
      // The patient may change their mind even after the sample is taken; once results exist the test stays on record.
      if (o.status === 'cancelled') throw new AppError(409, 'bad_state', 'This test is already cancelled');
      const [entered] = await db.select({ id: labResult.id }).from(labResult).where(eq(labResult.orderId, id)).limit(1);
      if (o.status === 'completed' || entered) throw new AppError(409, 'bad_state', 'Results are already entered for this test; it can no longer be cancelled');
      await db.transaction(async (tx) => {
        await onLabOrderCancel(tx, id); // off its bill (refused if that bill has payments)
        await tx.update(labOrder).set({ status: 'cancelled', updatedAt: new Date().toISOString() }).where(eq(labOrder.id, id));
      });
    } else {
      throw new AppError(400, 'validation', 'Unknown status');
    }
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: body.status, entity: 'lab_order', entityId: id });
    return c.json({ ok: true });
  });

  return app;
}
