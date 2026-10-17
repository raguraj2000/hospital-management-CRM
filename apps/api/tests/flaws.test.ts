// Hunting for flaws: two people pressing at the same moment, the last unit of stock, money that does not add up,
// odd input. Each test says what must never happen.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;
const year2 = `${new Date().getFullYear() + 2}-01-01`;

async function world() {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const desk = await t.as('desk');
  const pharm = await t.as('pharm');
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: med } = await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Last Unit', form: 'tablet', pricePaise: 500 } }));
  await pharm(`/api/b/main/medicines/${med}/batches`, { method: 'POST', body: { batchNo: 'L1', expiryDate: year2, quantity: 1 } });
  const patient = async (name: string) => (await json(desk('/api/b/main/patients', { method: 'POST', body: { name } }))).patient;
  return { owner, doc, desk, pharm, med, patient };
}

describe('two people at the same moment', () => {
  it('two counters collect the same visit at once: it is paid once, never twice', async () => {
    const w = await world();
    const p = await w.patient('Double Collect');
    const { visit } = await json(w.desk(`/api/b/main/patients/${p.id}/visits`, { method: 'POST', body: {} }));
    await t.db.run(sql`update op_visit set status = 'at_counter' where id = ${visit.id}`);
    const body = { paymentMode: 'cash', amountPaise: 20000, itemIds: [], roundOffPaise: 0 };
    const res = await Promise.all([1, 2].map(() => w.desk(`/api/b/main/visits/${visit.id}/checkout`, { method: 'POST', body })));
    const [{ paid }] = await t.db.all<{ paid: number }>(sql`select coalesce(sum(p.amount_paise), 0) as paid from bill_payment p join op_bill b on b.id = p.bill_id where b.visit_id = ${visit.id}`);
    expect(res.map((r) => r.status).sort()).toContain(201);
    expect(paid).toBe(20000);
  }, 30_000);

  it('the last tablet sold twice at once: one sale goes through, stock never goes below zero', async () => {
    const w = await world();
    const a = await w.patient('Buyer A');
    const b = await w.patient('Buyer B');
    const sale = (pid: number) => w.pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: w.med, quantity: 1 }], paymentMode: 'cash', patientId: pid } });
    const res = await Promise.all([sale(a.id), sale(b.id)]);
    expect(res.map((r) => r.status).sort()).toEqual([201, 409]);
    const [{ q }] = await t.db.all<{ q: number }>(sql`select sum(quantity) as q from medicine_batch where medicine_id = ${w.med}`);
    expect(q).toBe(0);
  }, 30_000);

  it('ten visits made at the same moment get ten different tokens', async () => {
    const w = await world();
    const ps = await Promise.all(Array.from({ length: 10 }, (_, i) => w.patient(`Token ${i}`)));
    const vs = await Promise.all(ps.map((p) => json(w.desk(`/api/b/main/patients/${p.id}/visits`, { method: 'POST', body: {} }))));
    const tokens = vs.map((v) => v.visit.token);
    expect(new Set(tokens).size).toBe(10);
    expect(new Set(vs.map((v) => v.visit.opNo)).size).toBe(10);
  }, 30_000);

  it('ten patients registered at the same moment get ten different UHIDs', async () => {
    const w = await world();
    const ps = await Promise.all(Array.from({ length: 10 }, (_, i) => w.patient(`Uhid ${i}`)));
    expect(new Set(ps.map((p) => p.uhid)).size).toBe(10);
  }, 30_000);
});

describe('money that must add up', () => {
  it('paying more than is due is refused; a zero or negative payment is refused; nothing is written', async () => {
    const w = await world();
    const p = await w.patient('Over Pay');
    const { visit } = await json(w.desk(`/api/b/main/patients/${p.id}/visits`, { method: 'POST', body: {} }));
    await t.db.run(sql`update op_visit set status = 'at_counter' where id = ${visit.id}`);
    for (const amountPaise of [999999, -100]) expect((await w.desk(`/api/b/main/visits/${visit.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise, itemIds: [], roundOffPaise: 0 } })).status).toBe(400);
    const done = await json(w.desk(`/api/b/main/visits/${visit.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 5000, itemIds: [], roundOffPaise: 0 } }));
    const bill = done.paidBills[0];
    expect((await w.desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 0, mode: 'cash' } })).status).toBe(400);
    expect((await w.desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 15001, mode: 'cash' } })).status).toBe(400);
    const [{ n }] = await t.db.all<{ n: number }>(sql`select count(*) as n from bill_payment`);
    expect(n).toBe(1);
  });

  it('a discount bigger than the bill, a negative fee or a negative charge is refused', async () => {
    const w = await world();
    const p = await w.patient('Odd Money');
    const { visit } = await json(w.desk(`/api/b/main/patients/${p.id}/visits`, { method: 'POST', body: {} }));
    expect((await w.doc(`/api/b/main/visits/${visit.id}/consultation-fee`, { method: 'PUT', body: { consultationFeePaise: -1 } })).status).toBe(400);
    expect((await w.doc(`/api/b/main/visits/${visit.id}/charges`, { method: 'POST', body: { description: 'Minus', amountPaise: -500 } })).status).toBe(400);
    await t.db.run(sql`update op_visit set status = 'at_counter' where id = ${visit.id}`);
    expect((await w.desk(`/api/b/main/visits/${visit.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 0, itemIds: [], discountPaise: 30000, roundOffPaise: 0 } })).status).toBe(400);
  });
});

describe('odd input', () => {
  it('a name with HTML is kept as text; very long text is refused, not cut silently', async () => {
    const w = await world();
    const { patient } = await json(w.desk('/api/b/main/patients', { method: 'POST', body: { name: '<img src=x onerror=alert(1)>' } }));
    expect(patient.name).toBe('<img src=x onerror=alert(1)>'); // stored as text; the screens escape it
    expect((await w.desk('/api/b/main/patients', { method: 'POST', body: { name: 'x'.repeat(500) } })).status).toBe(400);
  });

  it('a deactivated staff member is signed out at once; a wrong password many times locks the account', async () => {
    const w = await world();
    const roles = (await json(w.owner('/api/b/main/roles'))).roles;
    const { userId } = await json(w.owner('/api/b/main/staff', { method: 'POST', body: { name: 'Leaving', mobile: '9811177777', password: 'leave-pass-123', roleId: roles.find((r: any) => r.key === 'front_desk').id } }));
    const login = (password: string) => t.app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobile: '9811177777', password }) });
    const cookie = (await login('leave-pass-123')).headers.get('set-cookie')!.split(';')[0]!;
    const me = () => t.app.request('/api/auth/me', { headers: { cookie } });
    expect((await me()).status).toBe(200);
    expect((await w.owner(`/api/b/main/staff/${userId}/deactivate`, { method: 'POST' })).status).toBe(200);
    expect((await me()).status).toBe(401);
    expect((await login('leave-pass-123')).status).not.toBe(200);
    // Brute force on another account.
    await w.owner('/api/b/main/staff', { method: 'POST', body: { name: 'Target', mobile: '9811188888', password: 'target-pass-123', roleId: roles.find((r: any) => r.key === 'front_desk').id } });
    const tryLogin = (password: string) => t.app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobile: '9811188888', password }) });
    expect((await tryLogin('target-pass-123')).status).toBe(200); // the account works
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await tryLogin(`wrong-${i}`)).status);
    expect(codes.every((c) => c === 401 || c === 429 || c === 423)).toBe(true);
    expect((await tryLogin('target-pass-123')).status).not.toBe(200); // locked for a while after many wrong tries
  });

  it('a request from another web site (no matching Origin) cannot change anything', async () => {
    const w = await world();
    const roles = (await json(w.owner('/api/b/main/roles'))).roles;
    await w.owner('/api/b/main/staff', { method: 'POST', body: { name: 'Desk Two', mobile: '9811166666', password: 'desk-two-123', roleId: roles.find((x: any) => x.key === 'front_desk').id } });
    const r = await t.app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobile: '9811166666', password: 'desk-two-123' }) });
    const cookie = r.headers.get('set-cookie')!.split(';')[0]!;
    const evil = await t.app.request('/api/b/main/patients', { method: 'POST', headers: { cookie, host: 'localhost:4321', 'content-type': 'application/json', origin: 'https://evil.example' }, body: JSON.stringify({ name: 'From Elsewhere' }) });
    expect(evil.status).toBe(403);
    expect((await json(w.owner('/api/b/main/patients?q=elsewhere'))).patients).toEqual([]);
  });
});
