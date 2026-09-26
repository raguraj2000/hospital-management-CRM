import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createLabRoutes } from '../src/routes/lab.js';
import { rangeFor, flagFor, type LabParameterRow } from '../src/services/lab-service.js';
import { createTempDbPath, setupTestDb, cleanupDb } from './helpers.js';

describe('lab: orders, results and the no-edit rule', () => {
  let db: Database.Database;
  let dbPath: string;
  let lab: ReturnType<typeof createLabRoutes>;
  let femalePatientId: number;
  let doctorId: number;

  function call(path: string, token: string, method = 'GET', body?: unknown) {
    return lab.request(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
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

  async function orderCbc(token = 'doc'): Promise<{ orderId: number; itemId: number }> {
    const res = await call('/orders', token, 'POST', { patientId: femalePatientId, testIds: [1], referringDoctorId: doctorId });
    expect(res.status).toBe(201);
    const orderId = (await res.json()).id;
    const itemId = (db.prepare('SELECT id FROM lab_order_item WHERE lab_order_id = ?').get(orderId) as any).id;
    return { orderId, itemId };
  }

  function paramId(name: string): number {
    return (db.prepare(`SELECT id FROM lab_test_parameter WHERE lab_test_id = 1 AND name = ?`).get(name) as any).id;
  }

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    lab = createLabRoutes(db);
    // Migration 0016 already added lab_technician; add the rest.
    db.prepare(`INSERT INTO role (name) VALUES ('admin'), ('manager'), ('doctor'), ('pharmacist'), ('front_desk')`).run();
    doctorId = addUser('Dr. A', 'doctor', 'doc');
    addUser('Lab Tech', 'lab_technician', 'tech');
    addUser('Front', 'front_desk', 'desk');
    femalePatientId = Number(
      db.prepare(`INSERT INTO patient (customer_code, current_name, gender) VALUES ('PT-0001', 'Priya', 'female')`).run()
        .lastInsertRowid,
    );
  });

  afterEach(() => cleanupDb(db, dbPath));

  it('ships the lab technician role and a starter test list', async () => {
    expect(db.prepare(`SELECT id FROM role WHERE name = 'lab_technician'`).get()).toBeTruthy();
    const res = await call('/tests', 'tech');
    const { tests } = await res.json();
    expect(tests.length).toBeGreaterThanOrEqual(10);
    expect(tests.length).toBe(18);
    const cbc = tests.find((t: any) => t.name === 'Complete Blood Count');
    expect(cbc).toMatchObject({ department: 'DEPARTMENT OF HEMATOLOGY' });
    expect(cbc.parameters.length).toBe(10);
    expect(cbc.parameters[0]).toMatchObject({ name: 'Haemoglobin', method: '(WB-EDTA) Automated', ref_low: 12, ref_high: 15 });
    const urine = tests.find((t: any) => t.name === 'Urine Routine Analysis');
    expect(JSON.parse(urine.parameters.find((p: any) => p.name === 'Sugar').options)).toEqual(['Nil', 'Trace', '+', '++', '+++']);
  });

  it('doctor and lab tech can order; front desk cannot', async () => {
    await orderCbc('doc');
    await orderCbc('tech');
    const res = await call('/orders', 'desk', 'POST', { patientId: femalePatientId, testIds: [1] });
    expect(res.status).toBe(403);
  });

  it('only the lab can enter results', async () => {
    const { itemId } = await orderCbc();
    const res = await call(`/items/${itemId}/results`, 'doc', 'POST', { values: [{ parameterId: paramId('Haemoglobin'), value: '13' }] });
    expect(res.status).toBe(403);
  });

  it('saves results with flags using the female range, and the order leaves the queue', async () => {
    const { orderId, itemId } = await orderCbc();
    expect((await (await call('/orders?status=pending', 'tech')).json()).total).toBe(1);

    const res = await call(`/items/${itemId}/results`, 'tech', 'POST', {
      values: [
        { parameterId: paramId('Haemoglobin'), value: '16' }, // 12-15 -> H
        { parameterId: paramId('Platelet Count'), value: '1.2' }, // 1.5-4.5 -> L
        { parameterId: paramId('Total WBC Count'), value: '7,000' }, // normal (commas allowed)
      ],
    });
    expect(res.status).toBe(200);

    const detail = await (await call(`/orders/${orderId}`, 'doc')).json();
    const results = detail.items[0].results;
    expect(results.find((r: any) => r.parameter_name === 'Haemoglobin')).toMatchObject({
      flag: 'H',
      reference_range: '12 - 15',
      method: '(WB-EDTA) Automated',
      unit: 'gm/dl',
    });
    expect(results.find((r: any) => r.parameter_name === 'Platelet Count').flag).toBe('L');
    expect(results.find((r: any) => r.parameter_name === 'Total WBC Count').flag).toBeNull();
    expect(detail.order.sample_collected_at).toBeTruthy();

    expect((await (await call('/orders?status=pending', 'tech')).json()).total).toBe(0);
    expect((await (await call('/orders?status=completed', 'tech')).json()).total).toBe(1);
  });

  it('refuses to save results a second time', async () => {
    const { itemId } = await orderCbc();
    const body = { values: [{ parameterId: paramId('Haemoglobin'), value: '13' }] };
    expect((await call(`/items/${itemId}/results`, 'tech', 'POST', body)).status).toBe(200);
    expect((await call(`/items/${itemId}/results`, 'tech', 'POST', body)).status).toBe(409);
  });

  it('the database itself blocks changing or deleting a saved result', async () => {
    const { itemId } = await orderCbc();
    await call(`/items/${itemId}/results`, 'tech', 'POST', { values: [{ parameterId: paramId('Haemoglobin'), value: '13' }] });
    expect(() => db.prepare(`UPDATE lab_result SET value = '99'`).run()).toThrow(/cannot be changed/);
    expect(() => db.prepare(`DELETE FROM lab_result`).run()).toThrow(/cannot be deleted/);
    expect(() => db.prepare(`UPDATE lab_order_item SET status = 'pending' WHERE id = ?`).run(itemId)).toThrow(/only be cancelled/);
    expect(() =>
      db
        .prepare(`INSERT INTO lab_result (lab_order_item_id, parameter_name, value, entered_by_user_id) VALUES (?, 'x', '1', 1)`)
        .run(itemId),
    ).toThrow(/pending test/);
  });

  it('a wrong result is cancelled with a reason and a fresh copy goes back to the queue', async () => {
    const { orderId, itemId } = await orderCbc();
    await call(`/items/${itemId}/results`, 'tech', 'POST', { values: [{ parameterId: paramId('Haemoglobin'), value: '1.3' }] });

    expect((await call(`/items/${itemId}/cancel`, 'tech', 'POST', { reason: '' })).status).toBe(400);
    const res = await call(`/items/${itemId}/cancel`, 'tech', 'POST', { reason: 'Typed 1.3 instead of 13' });
    expect(res.status).toBe(200);
    const { replacementId } = await res.json();
    expect(replacementId).toBeTruthy();

    const detail = await (await call(`/orders/${orderId}`, 'tech')).json();
    const old = detail.items.find((i: any) => i.id === itemId);
    expect(old).toMatchObject({ status: 'cancelled', cancel_reason: 'Typed 1.3 instead of 13' });
    expect(old.results[0].value).toBe('1.3'); // original stays visible
    expect(detail.items.find((i: any) => i.id === replacementId)).toMatchObject({ status: 'pending', replaces_item_id: itemId });

    // Cancelled is final.
    expect((await call(`/items/${itemId}/cancel`, 'tech', 'POST', { reason: 'again please' })).status).toBe(409);
  });

  it('doctor can remove a waiting test, but only the lab can cancel a saved result', async () => {
    const first = await orderCbc();
    expect((await call(`/items/${first.itemId}/cancel`, 'doc', 'POST', { reason: 'Ordered by mistake' })).status).toBe(200);
    const second = await orderCbc();
    await call(`/items/${second.itemId}/results`, 'tech', 'POST', { values: [{ parameterId: paramId('Haemoglobin'), value: '13' }] });
    expect((await call(`/items/${second.itemId}/cancel`, 'doc', 'POST', { reason: 'Looks wrong' })).status).toBe(403);
    expect((await call(`/items/${second.itemId}/cancel`, 'desk', 'POST', { reason: 'Looks wrong' })).status).toBe(403);
  });

  it('tests can be added to an order until results are saved, without duplicates', async () => {
    const { orderId, itemId } = await orderCbc();
    const res = await call(`/orders/${orderId}/items`, 'doc', 'POST', { testIds: [1, 5] }); // CBC already there
    expect(await res.json()).toMatchObject({ ok: true, added: 1 });
    const names = (db.prepare('SELECT test_name FROM lab_order_item WHERE lab_order_id = ?').all(orderId) as any[]).map((r) => r.test_name);
    expect(names).toEqual(['Complete Blood Count', 'Blood Sugar']);
    expect((await call(`/orders/${orderId}/items`, 'desk', 'POST', { testIds: [2] })).status).toBe(403);

    await call(`/items/${itemId}/results`, 'tech', 'POST', { values: [{ parameterId: paramId('Haemoglobin'), value: '13' }] });
    expect((await call(`/orders/${orderId}/items`, 'doc', 'POST', { testIds: [2] })).status).toBe(409);
  });

  it('cancelling a pending test (ordered by mistake) does not create a copy', async () => {
    const { itemId } = await orderCbc();
    const res = await call(`/items/${itemId}/cancel`, 'tech', 'POST', { reason: 'Ordered by mistake' });
    expect((await res.json()).replacementId).toBeNull();
  });

  it('editing the catalog keeps old results unchanged', async () => {
    const manager = addUser('Mgr', 'manager', 'mgr');
    expect(manager).toBeTruthy();
    const { orderId, itemId } = await orderCbc();
    await call(`/items/${itemId}/results`, 'tech', 'POST', { values: [{ parameterId: paramId('Haemoglobin'), value: '13' }] });

    const res = await call('/tests/1', 'mgr', 'PATCH', {
      name: 'CBC (new name)',
      priceCents: 30000,
      parameters: [{ id: paramId('Haemoglobin'), name: 'Hb', unit: 'g/dL', refLow: 11, refHigh: 16 }],
    });
    expect(res.status).toBe(200);
    const detail = await (await call(`/orders/${orderId}`, 'tech')).json();
    expect(detail.items[0].test_name).toBe('Complete Blood Count');
    expect(detail.items[0].results[0]).toMatchObject({ parameter_name: 'Haemoglobin', reference_range: '12 - 15' });
    // Lab tech can't edit the catalog.
    expect((await call('/tests/1', 'tech', 'PATCH', { name: 'x', priceCents: 0, parameters: [{ name: 'y' }] })).status).toBe(403);
  });
});

describe('lab: normal ranges and marks', () => {
  const base: LabParameterRow = {
    id: 1, lab_test_id: 1, name: 'Hb', method: null, unit: 'g/dL',
    ref_low: 13, ref_high: 17, ref_low_female: 12, ref_high_female: 15,
    ref_text: null, ref_display: null, options: null, no_flag: 0, sort_order: 1,
  };

  it('uses the male/general range for men', () => {
    expect(rangeFor(base, 'male')).toMatchObject({ low: 13, high: 17, text: '13 - 17' });
  });

  it('shows both ranges and flags only outside both when gender is unknown', () => {
    const r = rangeFor(base, null);
    expect(r.text).toBe('M: 13 - 17, F: 12 - 15');
    expect(flagFor('12.5', r)).toBeNull();
    expect(flagFor('18', r)).toBe('H');
  });

  it('reads the number at the start, like the paper template (8-10 pus cells is high)', () => {
    const pus = rangeFor({ ...base, ref_low: 0, ref_high: 5, ref_low_female: null, ref_high_female: null }, 'male');
    expect(flagFor('8-10', pus)).toBe('H');
    expect(flagFor('2-4', pus)).toBeNull();
    expect(flagFor('Nil', pus)).toBeNull();
  });

  it('marks a word answer that is not the normal one with !', () => {
    const sugar = rangeFor({ ...base, ref_low: null, ref_high: null, ref_low_female: null, ref_high_female: null, ref_text: 'Nil' }, 'male');
    expect(flagFor('Nil', sugar)).toBeNull();
    expect(flagFor('Absent', sugar)).toBeNull(); // also a "normal" word
    expect(flagFor('++', sugar)).toBe('!');
    const widal = rangeFor({ ...base, ref_low: null, ref_high: null, ref_low_female: null, ref_high_female: null, ref_text: 'Negative' }, null);
    expect(flagFor('POSITIVE', widal)).toBe('!');
    expect(flagFor('NEGATIVE', widal)).toBeNull();
  });

  it('never marks a no-flag row, and prints the display text instead of the numbers', () => {
    const hcg = rangeFor({ ...base, ref_low: null, ref_high: null, ref_low_female: null, ref_high_female: null, ref_display: 'Non-pregnant: < 5', no_flag: 1 }, 'female');
    expect(hcg.text).toBe('Non-pregnant: < 5');
    expect(flagFor('5000', hcg)).toBeNull();
  });
});
