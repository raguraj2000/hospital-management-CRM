import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createLabRoutes } from '../src/routes/lab.js';
import { createPatientRoutes } from '../src/routes/patients.js';
import { createAdminRoutes } from '../src/routes/admin.js';
import { getClinicHeader } from '../src/services/invoice-service.js';
import { createTempDbPath, setupTestDb, cleanupDb } from './helpers.js';

// A 1x1 PNG, the smallest valid "signature image".
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('printed lab report, patient lab history, BP history, letterhead', () => {
  let db: Database.Database;
  let dbPath: string;
  let lab: ReturnType<typeof createLabRoutes>;
  let patients: ReturnType<typeof createPatientRoutes>;
  let admin: ReturnType<typeof createAdminRoutes>;
  let patientId: number;
  let techId: number;

  function call(app: any, path: string, token: string, method = 'GET', body?: unknown) {
    return app.request(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }) as Promise<Response>;
  }

  function addUser(name: string, role: string, token: string): number {
    const roleId = (db.prepare(`SELECT id FROM role WHERE name = ?`).get(role) as any).id;
    const id = Number(
      db.prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES (?, ?, 'x', ?)`).run(name, token, roleId)
        .lastInsertRowid,
    );
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, id, expiresAt);
    return id;
  }

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    lab = createLabRoutes(db);
    patients = createPatientRoutes(db);
    admin = createAdminRoutes(db);
    db.prepare(`INSERT INTO role (name) VALUES ('admin'), ('manager'), ('doctor'), ('pharmacist'), ('front_desk')`).run();
    addUser('Boss', 'admin', 'admin');
    addUser('Dr. A', 'doctor', 'doc');
    techId = addUser('Kavya', 'lab_technician', 'tech');
    addUser('Desk', 'front_desk', 'desk');
    patientId = Number(
      db.prepare(`INSERT INTO patient (customer_code, current_name, gender) VALUES ('PT-0001', 'Priya', 'female')`).run().lastInsertRowid,
    );
  });

  afterEach(() => cleanupDb(db, dbPath));

  async function completedOrder(): Promise<number> {
    const res = await call(lab, '/orders', 'doc', 'POST', { patientId, testIds: [1, 17] });
    const orderId = (await res.json()).id;
    const items = db.prepare('SELECT id, lab_test_id FROM lab_order_item WHERE lab_order_id = ?').all(orderId) as any[];
    const param = (testId: number, name: string) =>
      (db.prepare('SELECT id FROM lab_test_parameter WHERE lab_test_id = ? AND name = ?').get(testId, name) as any).id;
    await call(lab, `/items/${items[0].id}/results`, 'tech', 'POST', { values: [{ parameterId: param(1, 'Haemoglobin'), value: '13' }] });
    await call(lab, `/items/${items[1].id}/results`, 'tech', 'POST', { values: [{ parameterId: param(17, 'Sugar'), value: '++' }] });
    return orderId;
  }

  it('report has the letterhead, the technician who saved it, and the doctor signer', async () => {
    await call(lab, `/signatures/${techId}`, 'admin', 'POST', { image: TINY_PNG });
    const orderId = await completedOrder();
    const report = await (await call(lab, `/orders/${orderId}/report`, 'doc')).json();

    expect(report.header.name).toBe('அதி மருத்துவமனை');
    expect(report.header.doctors.map((d: any) => d.degree)).toEqual(['MBBS MD.,', 'MBBS DNB OG']);
    expect(report.signatures.left).toMatchObject({ name: 'Kavya', title: 'Lab Technician', image: TINY_PNG });
    expect(report.signatures.right).toMatchObject({ name: 'Dr. Lakshmi Devi', title: 'MBBS, DNB (OG)' });
    expect(report.reportDate).toBeTruthy();
    const sugar = report.items.find((i: any) => i.test_name === 'Urine Routine Analysis').results[0];
    expect(sugar).toMatchObject({ value: '++', flag: '!', reference_range: 'Nil', method: 'Reagent Strip' });
  });

  it('only a lab-test manager can set signatures, and only real images are accepted', async () => {
    expect((await call(lab, `/signatures/${techId}`, 'tech', 'POST', { image: TINY_PNG })).status).toBe(403);
    expect((await call(lab, `/signatures/${techId}`, 'admin', 'POST', { image: 'javascript:alert(1)' })).status).toBe(400);
    expect((await call(lab, '/report-settings', 'admin', 'POST', { signerName: 'Dr. X', signerDegree: 'MD' })).status).toBe(200);
    const settings = await (await call(lab, '/report-settings', 'admin')).json();
    expect(settings).toMatchObject({ signerName: 'Dr. X', signerDegree: 'MD' });
  });

  it("patient page lab history lists the patient's orders with results", async () => {
    await completedOrder();
    const { orders } = await (await call(lab, `/patients/${patientId}`, 'doc')).json();
    expect(orders).toHaveLength(1);
    expect(orders[0].items.map((i: any) => i.status)).toEqual(['completed', 'completed']);
  });

  it('BP: each update is kept with time and who; doctors and front desk can record it', async () => {
    expect((await call(patients, `/${patientId}/bp`, 'desk', 'POST', { bloodPressure: '130/85' })).status).toBe(201);
    expect((await call(patients, `/${patientId}/bp`, 'doc', 'POST', { bloodPressure: '120 / 80' })).status).toBe(201);
    expect((await call(patients, `/${patientId}/bp`, 'tech', 'POST', { bloodPressure: '120/80' })).status).toBe(403);
    expect((await call(patients, `/${patientId}/bp`, 'desk', 'POST', { bloodPressure: 'high' })).status).toBe(400);

    const { readings } = await (await call(patients, `/${patientId}/bp`, 'tech')).json();
    expect(readings.map((r: any) => r.blood_pressure)).toEqual(['120/80', '130/85']);
    expect(readings[0].recorded_by_name).toBe('Dr. A');
    expect(readings[0].recorded_at).toBeTruthy();
    expect((db.prepare('SELECT blood_pressure FROM patient WHERE id = ?').get(patientId) as any).blood_pressure).toBe('120/80');
  });

  it('BP typed on the edit form or at registration also lands in the history', async () => {
    const created = await (
      await call(patients, '/', 'desk', 'POST', { currentName: 'Ravi', bloodPressure: '140/90', confirmDuplicate: true })
    ).json();
    await call(patients, `/${created.id}`, 'desk', 'PATCH', { bloodPressure: '140/90' }); // unchanged: no new reading
    await call(patients, `/${created.id}`, 'desk', 'PATCH', { bloodPressure: '135/88' });
    const { readings } = await (await call(patients, `/${created.id}/bp`, 'desk')).json();
    expect(readings.map((r: any) => r.blood_pressure)).toEqual(['135/88', '140/90']);
  });

  it('bills say "Aadhi Hospital" and the letterhead is editable by the admin', async () => {
    expect(getClinicHeader(db).name).toBe('Aadhi Hospital');
    const res = await call(admin, '/print-header', 'admin', 'POST', { values: { 'print.phone': '9655125145' }, clinicName: 'Aadhi Hospital' });
    expect(res.status).toBe(200);
    expect(getClinicHeader(db).print.phone).toBe('9655125145');
    expect((await call(admin, '/print-header', 'desk', 'POST', { values: {} })).status).toBe(403);
  });
});
