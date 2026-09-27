import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { insertAuditLog } from '../services/audit-service.js';
import { getPrintHeader } from '../services/invoice-service.js';
import { resolvePatientIds } from '../services/patient-merge-service.js';
import { coverStatus, recordOverride } from '../services/payment-service.js';
import {
  createLabOrder,
  addTestsToOrder,
  saveLabResults,
  cancelLabItem,
  rangeFor,
  type LabParameterRow,
} from '../services/lab-service.js';

const optionalNumber = z.number().finite().nullable().optional();

const parameterSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1).max(80),
  method: z.string().trim().max(80).nullable().optional(),
  unit: z.string().trim().max(30).nullable().optional(),
  refLow: optionalNumber,
  refHigh: optionalNumber,
  refLowFemale: optionalNumber,
  refHighFemale: optionalNumber,
  refText: z.string().trim().max(60).nullable().optional(),
  refDisplay: z.string().trim().max(60).nullable().optional(),
  options: z.array(z.string().trim().min(1).max(40)).max(12).nullable().optional(),
  noFlag: z.boolean().optional(),
});

const testSchema = z.object({
  name: z.string().trim().min(1).max(100),
  department: z.string().trim().max(80).nullable().optional(),
  sampleType: z.string().trim().max(60).nullable().optional(),
  priceCents: z.number().int().min(0),
  isActive: z.boolean().optional(),
  printNewPage: z.boolean().optional(),
  parameters: z.array(parameterSchema).min(1).max(60),
});

const orderSchema = z.object({
  patientId: z.number().int(),
  testIds: z.array(z.number().int()).min(1).max(50),
  referringDoctorId: z.number().int().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const resultsSchema = z.object({
  values: z.array(z.object({ parameterId: z.number().int(), value: z.string().max(200) })).max(100),
  sampleCollectedAt: z.string().max(30).nullable().optional(),
});

const cancelSchema = z.object({ reason: z.string().trim().min(3).max(300) });

// Signature images arrive already shrunk by the app (a small PNG/JPEG data URL).
const signatureImage = z
  .string()
  .max(300_000)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Not an image')
  .nullable();

const reportSettingsSchema = z.object({
  signerName: z.string().trim().max(80),
  signerDegree: z.string().trim().max(80),
  signerImage: signatureImage.optional(),
});

function appSetting(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM app_setting WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

function setAppSetting(db: Database.Database, key: string, value: string | null) {
  if (value === null) {
    db.prepare('DELETE FROM app_setting WHERE key = ?').run(key);
    return;
  }
  db.prepare(
    `INSERT INTO app_setting (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'localtime')`,
  ).run(key, value);
}

const PATIENT_COLUMNS = `p.id, p.customer_code, p.current_name, p.gender, p.phone_number,
  CASE WHEN p.dob IS NOT NULL THEN CAST((julianday('now') - julianday(p.dob)) / 365.25 AS INTEGER)
       ELSE p.age_years_at_registration END as age`;

function blankToNull(v: string | null | undefined): string | null {
  return v && v.trim() ? v.trim() : null;
}

export function createLabRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  function testsWithParameters(includeInactive: boolean) {
    const tests = db
      .prepare(`SELECT * FROM lab_test ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY sort_order, name`)
      .all() as { id: number }[];
    const params = db
      .prepare('SELECT * FROM lab_test_parameter WHERE is_active = 1 ORDER BY sort_order, id')
      .all() as LabParameterRow[];
    return tests.map((t) => ({ ...t, parameters: params.filter((p) => p.lab_test_id === t.id) }));
  }

  // --- Test catalog ------------------------------------------------------
  app.get('/tests', requirePermission('lab.view'), (c) => {
    const includeInactive = c.req.query('all') === '1' && c.get('permissions').includes('lab.manageTests');
    return c.json({ tests: testsWithParameters(includeInactive) });
  });

  function writeParameters(testId: number, parameters: z.infer<typeof parameterSchema>[]) {
    const existing = db.prepare('SELECT id FROM lab_test_parameter WHERE lab_test_id = ?').all(testId) as { id: number }[];
    const keep = new Set<number>();
    parameters.forEach((p, index) => {
      const values = [
        p.name,
        blankToNull(p.method),
        blankToNull(p.unit),
        p.refLow ?? null,
        p.refHigh ?? null,
        p.refLowFemale ?? null,
        p.refHighFemale ?? null,
        blankToNull(p.refText),
        blankToNull(p.refDisplay),
        p.options && p.options.length ? JSON.stringify(p.options) : null,
        p.noFlag ? 1 : 0,
        index + 1,
      ];
      if (p.id && existing.some((e) => e.id === p.id)) {
        db.prepare(
          `UPDATE lab_test_parameter SET name = ?, method = ?, unit = ?, ref_low = ?, ref_high = ?, ref_low_female = ?, ref_high_female = ?,
             ref_text = ?, ref_display = ?, options = ?, no_flag = ?, sort_order = ?, is_active = 1 WHERE id = ?`,
        ).run(...values, p.id);
        keep.add(p.id);
      } else {
        db.prepare(
          `INSERT INTO lab_test_parameter (lab_test_id, name, method, unit, ref_low, ref_high, ref_low_female, ref_high_female,
             ref_text, ref_display, options, no_flag, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(testId, ...values);
      }
    });
    // Removed values are hidden, not deleted: old results still point at them.
    for (const e of existing) {
      if (!keep.has(e.id)) db.prepare('UPDATE lab_test_parameter SET is_active = 0 WHERE id = ?').run(e.id);
    }
  }

  app.post('/tests', requirePermission('lab.manageTests'), async (c) => {
    const parsed = testSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Check the test name, price and values', details: parsed.error.flatten() }, 400);
    const body = parsed.data;
    const user = c.get('user');
    if (db.prepare('SELECT id FROM lab_test WHERE name = ?').get(body.name)) {
      return c.json({ error: `A test named "${body.name}" already exists` }, 409);
    }
    const id = db.transaction(() => {
      const maxSort = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) m FROM lab_test').get() as { m: number }).m;
      const info = db
        .prepare(
          'INSERT INTO lab_test (name, department, sample_type, price_cents, is_active, sort_order, print_new_page) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          body.name,
          blankToNull(body.department),
          blankToNull(body.sampleType),
          body.priceCents,
          body.isActive === false ? 0 : 1,
          maxSort + 1,
          body.printNewPage ? 1 : 0,
        );
      const testId = Number(info.lastInsertRowid);
      writeParameters(testId, body.parameters);
      insertAuditLog(db, {
        entityType: 'lab_test',
        entityId: testId,
        action: 'create',
        performedByUserId: user.userId,
        performedByRole: user.role,
        detail: body,
      });
      return testId;
    })();
    return c.json({ id }, 201);
  });

  app.patch('/tests/:id', requirePermission('lab.manageTests'), async (c) => {
    const id = Number(c.req.param('id'));
    const parsed = testSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Check the test name, price and values', details: parsed.error.flatten() }, 400);
    const body = parsed.data;
    const user = c.get('user');
    if (!db.prepare('SELECT id FROM lab_test WHERE id = ?').get(id)) return c.json({ error: 'Lab test not found' }, 404);
    if (db.prepare('SELECT id FROM lab_test WHERE name = ? AND id != ?').get(body.name, id)) {
      return c.json({ error: `A test named "${body.name}" already exists` }, 409);
    }
    db.transaction(() => {
      db.prepare(
        `UPDATE lab_test SET name = ?, department = ?, sample_type = ?, price_cents = ?, is_active = ?, print_new_page = ?,
           updated_at = datetime('now', 'localtime') WHERE id = ?`,
      ).run(
        body.name,
        blankToNull(body.department),
        blankToNull(body.sampleType),
        body.priceCents,
        body.isActive === false ? 0 : 1,
        body.printNewPage ? 1 : 0,
        id,
      );
      writeParameters(id, body.parameters);
      insertAuditLog(db, {
        entityType: 'lab_test',
        entityId: id,
        action: 'update',
        performedByUserId: user.userId,
        performedByRole: user.role,
        detail: body,
      });
    })();
    return c.json({ ok: true });
  });

  // --- Orders --------------------------------------------------------------
  app.post('/orders', requirePermission('lab.order'), async (c) => {
    const parsed = orderSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Pick a patient and at least one test', details: parsed.error.flatten() }, 400);
    const user = c.get('user');
    try {
      const id = createLabOrder(db, parsed.data, { userId: user.userId, role: user.role });
      return c.json({ id }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  // status=pending: orders with a test still waiting, oldest first (the queue).
  // status=completed: orders with nothing waiting, newest first.
  app.get('/orders', requirePermission('lab.view'), (c) => {
    const status = c.req.query('status') === 'completed' ? 'completed' : 'pending';
    const q = (c.req.query('q') ?? '').trim();
    const page = Math.max(1, Number(c.req.query('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));

    const pendingExists = `EXISTS (SELECT 1 FROM lab_order_item i WHERE i.lab_order_id = o.id AND i.status = 'pending')`;
    const where = [
      status === 'pending'
        ? pendingExists
        : `NOT ${pendingExists} AND EXISTS (SELECT 1 FROM lab_order_item i WHERE i.lab_order_id = o.id AND i.status = 'completed')`,
    ];
    const params: unknown[] = [];
    if (q) {
      where.push('(p.current_name LIKE ? OR p.customer_code LIKE ? OR p.phone_number LIKE ? OR o.order_number LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const from = 'FROM lab_order o JOIN patient p ON p.id = o.patient_id';

    const total = (db.prepare(`SELECT COUNT(*) AS count ${from} ${whereSql}`).get(...params) as { count: number }).count;
    const rows = db
      .prepare(
        `SELECT o.id, o.order_number, o.created_at, o.sample_collected_at,
                p.id AS patient_id, p.customer_code, p.current_name, p.phone_number,
                (SELECT group_concat(i.test_name, ', ') FROM lab_order_item i WHERE i.lab_order_id = o.id AND i.status != 'cancelled') AS tests,
                (SELECT COUNT(*) FROM lab_order_item i WHERE i.lab_order_id = o.id AND i.status = 'pending') AS pending_count,
                (SELECT MAX(i.completed_at) FROM lab_order_item i WHERE i.lab_order_id = o.id) AS last_completed_at,
                d.full_name AS referring_doctor_name
         ${from}
         LEFT JOIN user d ON d.id = o.referring_doctor_id
         ${whereSql}
         ORDER BY ${status === 'pending' ? 'o.created_at ASC, o.id ASC' : 'last_completed_at DESC, o.id DESC'}
         LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, (page - 1) * pageSize);
    return c.json({ orders: rows, total, page, pageSize });
  });

  app.get('/summary', requirePermission('lab.view'), (c) => {
    const pending = (
      db.prepare(`SELECT COUNT(DISTINCT lab_order_id) AS c FROM lab_order_item WHERE status = 'pending'`).get() as { c: number }
    ).c;
    return c.json({ pendingOrders: pending });
  });

  const resultStmt = () => db.prepare('SELECT * FROM lab_result WHERE lab_order_item_id = ? ORDER BY sort_order, id');
  const paramStmt = () =>
    db.prepare('SELECT * FROM lab_test_parameter WHERE lab_test_id = ? AND is_active = 1 ORDER BY sort_order, id');

  /** One order with its patient and every test (pending ones carry what to fill in, finished ones their results). */
  function orderDetail(id: number) {
    const order = db
      .prepare(
        `SELECT o.*, d.full_name AS referring_doctor_name, ob.full_name AS ordered_by_name
         FROM lab_order o
         LEFT JOIN user d ON d.id = o.referring_doctor_id
         LEFT JOIN user ob ON ob.id = o.ordered_by_user_id
         WHERE o.id = ?`,
      )
      .get(id) as { patient_id: number } | undefined;
    if (!order) return null;

    const patient = db.prepare(`SELECT ${PATIENT_COLUMNS} FROM patient p WHERE p.id = ?`).get(order.patient_id) as {
      gender: string | null;
    };
    const items = db
      .prepare(
        `SELECT i.*, t.sample_type, t.department, t.sort_order AS test_sort, t.print_new_page,
                cu.full_name AS completed_by_name, xu.full_name AS cancelled_by_name
         FROM lab_order_item i
         JOIN lab_test t ON t.id = i.lab_test_id
         LEFT JOIN user cu ON cu.id = i.completed_by_user_id
         LEFT JOIN user xu ON xu.id = i.cancelled_by_user_id
         WHERE i.lab_order_id = ? ORDER BY i.id`,
      )
      .all(id) as { id: number; lab_test_id: number; status: string }[];

    const results = resultStmt();
    const params = paramStmt();
    const detailed = items.map((item) => {
      if (item.status === 'pending') {
        // What the technician fills in, with the range for THIS patient.
        const parameters = (params.all(item.lab_test_id) as LabParameterRow[]).map((p) => {
          const range = rangeFor(p, patient.gender);
          return {
            id: p.id,
            name: p.name,
            method: p.method,
            unit: p.unit,
            low: range.low,
            high: range.high,
            range: range.text,
            normalText: range.normalText,
            noFlag: range.noFlag,
            options: p.options ? (JSON.parse(p.options) as string[]) : [],
          };
        });
        return { ...item, parameters, results: [] };
      }
      return { ...item, parameters: [], results: results.all(item.id) };
    });
    // Paid status of the finished tests (the report prints only when paid).
    const doneIds = items.filter((i) => i.status === 'completed').map((i) => i.id);
    const payment = coverStatus(db, 'lab_order_item', doneIds, { type: 'lab_order', id });
    return { order, patient, items: detailed, payment };
  }

  app.get('/orders/:id', requirePermission('lab.view'), (c) => {
    const detail = orderDetail(Number(c.req.param('id')));
    if (!detail) return c.json({ error: 'Lab order not found' }, 404);
    return c.json(detail);
  });

  // Everything the printed report needs in one go: letterhead, the order,
  // and who signs (the technician who saved the results, plus the doctor set
  // in Settings > Lab report).
  app.get('/orders/:id/report', requirePermission('lab.view'), (c) => {
    const detail = orderDetail(Number(c.req.param('id')));
    if (!detail) return c.json({ error: 'Lab order not found' }, 404);
    const done = detail.items.filter((i) => i.status === 'completed') as unknown as {
      completed_at: string;
      completed_by_name: string | null;
      completed_by_user_id: number;
    }[];
    const lastDone = [...done].sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))[0];
    // Bill No. / Bill Date on the report: the bill these tests are on, if any.
    const bill = detail.payment.invoiceIds.length
      ? (db
          .prepare('SELECT invoice_number, invoice_date FROM invoice WHERE id = ?')
          .get(Math.min(...detail.payment.invoiceIds)) as { invoice_number: string; invoice_date: string })
      : null;
    return c.json({
      ...detail,
      bill,
      header: getPrintHeader(db),
      reportDate: lastDone?.completed_at ?? null,
      signatures: {
        left: {
          name: lastDone?.completed_by_name ?? null,
          title: 'Lab Technician',
          image: lastDone ? appSetting(db, `lab.signature.user.${lastDone.completed_by_user_id}`) : null,
        },
        right: {
          name: appSetting(db, 'lab.signer.name'),
          title: appSetting(db, 'lab.signer.degree'),
          image: appSetting(db, 'lab.signer.image'),
        },
      },
    });
  });

  // Emergency: release the report before the bill is paid (reason required).
  app.post('/orders/:id/release', requirePermission('payment.override'), async (c) => {
    const parsed = z.object({ reason: z.string().trim().min(3).max(300) }).safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Write why the report is released before payment' }, 400);
    const id = Number(c.req.param('id'));
    if (!db.prepare('SELECT id FROM lab_order WHERE id = ?').get(id)) return c.json({ error: 'Lab order not found' }, 404);
    const user = c.get('user');
    recordOverride(db, { type: 'lab_order', id }, parsed.data.reason, { userId: user.userId, role: user.role });
    return c.json({ ok: true });
  });

  // Lab history for the patient page, newest first (includes records of any
  // patient merged into this one).
  app.get('/patients/:patientId', requirePermission('lab.view'), (c) => {
    const ids = resolvePatientIds(db, Number(c.req.param('patientId')));
    const placeholders = ids.map(() => '?').join(',');
    const orderIds = db
      .prepare(`SELECT id FROM lab_order WHERE patient_id IN (${placeholders}) ORDER BY created_at DESC, id DESC LIMIT 50`)
      .all(...ids) as { id: number }[];
    return c.json({ orders: orderIds.map((o) => orderDetail(o.id)) });
  });

  // --- Report signatures (Settings > Lab report) ---------------------------
  app.get('/report-settings', requirePermission('lab.manageTests'), (c) => {
    const technicians = db
      .prepare(
        `SELECT u.id, u.full_name FROM user u JOIN role r ON r.id = u.role_id
         WHERE u.is_active = 1 AND r.name IN ('lab_technician', 'admin', 'manager') ORDER BY u.full_name`,
      )
      .all() as { id: number; full_name: string }[];
    return c.json({
      signerName: appSetting(db, 'lab.signer.name') ?? '',
      signerDegree: appSetting(db, 'lab.signer.degree') ?? '',
      signerImage: appSetting(db, 'lab.signer.image'),
      technicians: technicians.map((t) => ({ ...t, signature: appSetting(db, `lab.signature.user.${t.id}`) })),
    });
  });

  app.post('/report-settings', requirePermission('lab.manageTests'), async (c) => {
    const parsed = reportSettingsSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Check the doctor name, degree and signature image' }, 400);
    const body = parsed.data;
    db.transaction(() => {
      setAppSetting(db, 'lab.signer.name', body.signerName);
      setAppSetting(db, 'lab.signer.degree', body.signerDegree);
      if (body.signerImage !== undefined) setAppSetting(db, 'lab.signer.image', body.signerImage);
    })();
    return c.json({ ok: true });
  });

  app.post('/signatures/:userId', requirePermission('lab.manageTests'), async (c) => {
    const parsed = z.object({ image: signatureImage }).safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Not a usable signature image' }, 400);
    const userId = Number(c.req.param('userId'));
    if (!db.prepare('SELECT id FROM user WHERE id = ?').get(userId)) return c.json({ error: 'Staff member not found' }, 404);
    setAppSetting(db, `lab.signature.user.${userId}`, parsed.data.image);
    return c.json({ ok: true });
  });

  // --- Results -------------------------------------------------------------
  app.post('/items/:id/results', requirePermission('lab.enterResults'), async (c) => {
    const parsed = resultsSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Invalid results', details: parsed.error.flatten() }, 400);
    const user = c.get('user');
    try {
      saveLabResults(db, Number(c.req.param('id')), parsed.data, { userId: user.userId, role: user.role });
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  app.post('/orders/:id/items', requirePermission('lab.order'), async (c) => {
    const parsed = z.object({ testIds: z.array(z.number().int()).min(1).max(50) }).safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Tick at least one test' }, 400);
    const user = c.get('user');
    try {
      const added = addTestsToOrder(db, Number(c.req.param('id')), parsed.data.testIds, { userId: user.userId, role: user.role });
      return c.json({ ok: true, added });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  // Removing a WAITING test (no results yet) is open to whoever can order
  // tests -- e.g. the doctor who ticked the wrong one. Cancelling a SAVED
  // result stays with the lab (lab.enterResults).
  app.post('/items/:id/cancel', async (c) => {
    const parsed = cancelSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Write a reason (at least 3 characters)' }, 400);
    const user = c.get('user');
    const granted = c.get('permissions');
    const item = db.prepare('SELECT status FROM lab_order_item WHERE id = ?').get(Number(c.req.param('id'))) as
      | { status: string }
      | undefined;
    if (!item) return c.json({ error: 'Lab test not found' }, 404);
    const allowed =
      granted.includes('lab.enterResults') || (item.status === 'pending' && granted.includes('lab.order'));
    if (!allowed) return c.json({ error: 'Only the lab can cancel a saved result' }, 403);
    try {
      const replacementId = cancelLabItem(db, Number(c.req.param('id')), parsed.data.reason, {
        userId: user.userId,
        role: user.role,
      });
      return c.json({ ok: true, replacementId });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  return app;
}
