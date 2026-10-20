// Odd and broken input at the edges of the business rules. What must hold: a clear 4xx with { error, code },
// never a 500 or a stack trace, and nothing half-written.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeAll(async () => (t = await setup()));
afterAll(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;
const year2 = `${new Date().getFullYear() + 2}-01-01`;
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

let owner: Caller, desk: Caller, doc: Caller, pharm: Caller;
let med: number, patientId: number, visitId: number;
beforeAll(async () => {
  [owner, desk, doc, pharm] = await Promise.all(['owner', 'desk', 'doc', 'pharm'].map((u) => t.as(u)));
  med = (await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Edge Tab', form: 'tablet', pricePaise: 150 } }))).id;
  await pharm(`/api/b/main/medicines/${med}/batches`, { method: 'POST', body: { batchNo: 'E1', expiryDate: year2, quantity: 5 } });
  patientId = (await json(desk('/api/b/main/patients', { method: 'POST', body: { name: 'Edge Patient' } }))).patient.id;
  visitId = (await json(desk(`/api/b/main/patients/${patientId}/visits`, { method: 'POST', body: {} }))).visit.id;
});

/** Every error answer: a 4xx with a message and a code, and no stack trace. */
async function clean4xx(res: Response | Promise<Response>, status?: number) {
  const r = await res;
  const text = await r.text();
  expect(r.status, text).toBeGreaterThanOrEqual(400);
  expect(r.status, text).toBeLessThan(500);
  if (status) expect(r.status, text).toBe(status);
  const body = JSON.parse(text);
  expect(typeof body.error).toBe('string');
  expect(typeof body.code).toBe('string');
  expect(text).not.toMatch(/at \w+ \(|node_modules|\.ts:\d+/);
  return body;
}

describe('ids that are not ids', () => {
  for (const id of ['abc', '-1', '0', '1.5', '99999999999999999999', '%27%20or%201%3D1']) {
    it(`"${decodeURIComponent(id)}" answers 404 on patients, visits, bills, medicines, sales`, async () => {
      for (const path of [`/patients/${id}`, `/visits/${id}`, `/bills/${id}`, `/medicines/${id}/batches`, `/pharmacy/sales/${id}`]) {
        const r = await owner(`/api/b/main${path}`);
        expect([path, r.status]).toEqual([path, 404]);
      }
    });
  }
  it('a branch slug that does not exist is 404, never 500', async () => clean4xx(owner('/api/b/no-such-branch/patients'), 404));
});

describe('broken bodies', () => {
  it('broken JSON, an empty body or a JSON array is a clean 400, nothing written', async () => {
    const [{ before }] = await t.db.all<{ before: number }>(sql`select count(*) as before from patient`);
    for (const body of ['{"name": ', '', '[]', 'null', '"text"']) {
      const r = await t.app.request('/api/b/main/patients', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: await cookieOf('desk') }, body });
      expect(r.status, `body ${body}`).toBe(400);
    }
    const [{ after }] = await t.db.all<{ after: number }>(sql`select count(*) as after from patient`);
    expect(after).toBe(before);
  });
  it('fields of the wrong type are refused with the field named', async () => {
    const body = await clean4xx(desk('/api/b/main/patients', { method: 'POST', body: { name: 12345, phone: true } }), 400);
    expect(body.fields).toBeTruthy();
  });
  it('a name of only spaces is not a name', async () => clean4xx(desk('/api/b/main/patients', { method: 'POST', body: { name: '    ' } }), 400));
});

describe('stock at the edge', () => {
  it('a quantity of 0, a negative one or half a tablet cannot be sold', async () => {
    for (const quantity of [0, -3, 1.5]) await clean4xx(pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: med, quantity }], paymentMode: 'cash' } }), 400);
  });
  it('more than the stock is refused as a whole; the stock stays as it was', async () => {
    await clean4xx(pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: med, quantity: 6 }], paymentMode: 'cash' } }), 409);
    const batches = (await json(pharm(`/api/b/main/medicines/${med}/batches`))).batches;
    expect(batches.reduce((s: number, b: any) => s + b.quantity, 0)).toBe(5);
  });
  it('an expired batch is never sold', async () => {
    const old = (await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Old Stock', form: 'tablet', pricePaise: 100 } }))).id;
    const added = await pharm(`/api/b/main/medicines/${old}/batches`, { method: 'POST', body: { batchNo: 'X1', expiryDate: yesterday, quantity: 10 } });
    // Either the expired batch is refused at the door, or it is kept but never sold.
    if (added.status === 201) expect((await pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: old, quantity: 1 }], paymentMode: 'cash' } })).status).not.toBe(201);
    else expect(added.status).toBe(400);
  });
  it('the same medicine twice in one sale is refused', async () =>
    clean4xx(pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: med, quantity: 1 }, { medicineId: med, quantity: 1 }], paymentMode: 'cash' } }), 400));
  it('a payment mode that does not exist is refused', async () =>
    clean4xx(pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: med, quantity: 1 }], paymentMode: 'bitcoin' } }), 400));
});

describe('money at the edge', () => {
  it('round off: negative, more than ₹10 or paise fractions are refused', async () => {
    for (const roundOffPaise of [-100, 1001, 10.5]) await clean4xx(pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: med, quantity: 1 }], paymentMode: 'cash', roundOffPaise } }), 400);
  });
  it('paying dues when nothing is due is refused', async () => {
    const fresh = (await json(desk('/api/b/main/patients', { method: 'POST', body: { name: 'No Dues' } }))).patient.id;
    await clean4xx(desk(`/api/b/main/patients/${fresh}/pay-dues`, { method: 'POST', body: { amountPaise: 100, mode: 'cash' } }));
  });
  it('an amount of 100 crore or more is refused', async () =>
    clean4xx(desk(`/api/b/main/visits/${visitId}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 100_000_001, itemIds: [] } }), 400));
});

describe('visits at the edge', () => {
  it('a deactivated patient cannot start a visit', async () => {
    const p = (await json(desk('/api/b/main/patients', { method: 'POST', body: { name: 'Gone Away' } }))).patient.id;
    expect((await doc(`/api/b/main/patients/${p}/deactivate`, { method: 'POST', body: { reason: 'Moved to another city' } })).status).toBe(200);
    await clean4xx(desk(`/api/b/main/patients/${p}/visits`, { method: 'POST', body: {} }));
  });
  it('a cancelled visit takes no medicines, charges or lab tests', async () => {
    const p = (await json(desk('/api/b/main/patients', { method: 'POST', body: { name: 'Cancel Me' } }))).patient.id;
    const vid = (await json(desk(`/api/b/main/patients/${p}/visits`, { method: 'POST', body: {} }))).visit.id;
    expect((await desk(`/api/b/main/visits/${vid}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
    await clean4xx(doc(`/api/b/main/visits/${vid}/prescription`, { method: 'POST', body: { medicineId: med, dose: '1-0-1', days: 3 } }), 409);
    await clean4xx(doc(`/api/b/main/visits/${vid}/charges`, { method: 'POST', body: { description: 'Dressing', amountPaise: 100 } }), 409);
    await clean4xx(doc(`/api/b/main/visits/${vid}/prescription-notes`, { method: 'POST', body: { kind: 'note', text: 'late note' } }), 409);
  });
  it('a medicine of another branch cannot be prescribed (like a missing one)', async () => {
    const eastPharmMed = await t.db.all<{ id: number }>(sql`insert into medicine (branch_id, name, form, price_paise) values (${t.east.id}, 'East only', 'tablet', 100) returning id`);
    await clean4xx(doc(`/api/b/main/visits/${visitId}/prescription`, { method: 'POST', body: { medicineId: eastPharmMed[0]!.id, dose: '1-0-1', days: 3 } }), 404);
  });
  it('days of 0 or 1000 and a dose of 500 characters are refused', async () => {
    for (const body of [{ medicineId: med, dose: '1-0-1', days: 0 }, { medicineId: med, dose: '1-0-1', days: 1000 }, { medicineId: med, dose: 'x'.repeat(500), days: 3 }]) await clean4xx(doc(`/api/b/main/visits/${visitId}/prescription`, { method: 'POST', body }), 400);
  });
});

describe('sessions at the edge', () => {
  it('no cookie, a made-up cookie or a signed-out cookie: 401 everywhere', async () => {
    const out = await cookieOf('pharm');
    await t.app.request('/api/auth/logout', { method: 'POST', headers: { Cookie: out, Origin: 'http://localhost' } });
    for (const cookie of ['', 'hms_session=made-up-token', out]) {
      const r = await t.app.request('/api/b/main/patients', { headers: cookie ? { Cookie: cookie } : {} });
      expect([cookie.slice(0, 12), r.status]).toEqual([cookie.slice(0, 12), 401]);
    }
  });
});

/** A fresh session cookie for one staff member (for requests sent by hand). */
async function cookieOf(username: string) {
  const { M } = await import('./helpers.js');
  const res = await t.app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: M(username), password: `${username}-pass-123` }) });
  return res.headers.get('set-cookie')!.split(';')[0]!;
}
