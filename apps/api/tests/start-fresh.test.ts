// "Start fresh" after a trial: the test data goes, the setup stays, numbers start again.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { SETUP_TABLES, startFresh, STOCK_TABLES, TRIAL_TABLES } from '../src/lib/start-fresh.js';
import { setup } from './helpers.js';

type Caller = Awaited<ReturnType<Awaited<ReturnType<typeof setup>>['as']>>;
let t: Awaited<ReturnType<typeof setup>>;
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;
const post = (c: Caller, url: string, body?: unknown) => c(url, { method: 'POST', body: body ?? {} });
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const rows = async (table: string) => (await t.db.all<{ n: number }>(sql.raw(`select count(*) as n from "${table}"`)))[0]!.n;

beforeEach(async () => {
  t = await setup();
});
afterEach(() => t.cleanup());

/** A few days of testing: a patient through the doctor, the lab, the pharmacy and the counter; stock from a vendor. */
async function trial() {
  const [owner, doc, desk, pharm, lab] = await Promise.all(['owner', 'doc', 'desk', 'pharm', 'labtech'].map((n) => t.as(n)));
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: cbc } = await json(post(owner, '/api/b/main/lab/tests', { name: 'CBC', pricePaise: 30000 }));
  const { id: med } = await json(post(pharm, '/api/b/main/medicines', { name: 'Paracetamol', form: 'tablet', pricePaise: 200 }));
  const vendor = await json(post(owner, '/api/b/main/vendors', { name: 'City Pharma' }));
  expect((await post(pharm, '/api/b/main/purchases', { vendorId: vendor.id, vendorBillNo: 'INV-1', billDate: inDays(0), lines: [{ medicineId: med, batchNo: 'B1', expiryDate: inDays(300), quantity: 100, unitCostPaise: 100 }] })).status).toBe(201);
  const { bookmark } = await json(post(doc, '/api/b/main/bookmarks', { name: 'Fever', lines: [{ kind: 'medicine', medicineId: med, dose: '1-0-1', days: 2 }, { kind: 'instruction', text: 'Rest' }] }));

  const { patient } = await json(post(desk, '/api/b/main/patients', { name: 'Trial Patient' }));
  expect(patient.uhid).toBe('AH000001');
  const { visit } = await json(post(desk, `/api/b/main/patients/${patient.id}/visits`));
  await post(doc, `/api/b/main/visits/${visit.id}/bookmarks/${bookmark.id}/apply`, { lines: bookmark.lines.map((l: any) => ({ id: l.id })) });
  await post(doc, `/api/b/main/visits/${visit.id}/lab-orders`, { testIds: [cbc] });
  const report = (await json(lab(`/api/b/main/visits/${visit.id}/lab-report`))).tests[0];
  await lab(`/api/b/main/lab/orders/${report.orderId}/results`, { method: 'PUT', body: { results: [{ parameterId: report.parameters[0].id, value: 'NEGATIVE' }], complete: true } });
  await post(doc, `/api/b/main/visits/${visit.id}/send`, { to: 'counter' });
  const co = await json(owner(`/api/b/main/visits/${visit.id}/checkout`));
  expect((await post(owner, `/api/b/main/visits/${visit.id}/checkout`, { paymentMode: 'cash', amountPaise: co.totals.grandTotalPaise, itemIds: co.medicines.items.map((i: any) => i.id) })).status).toBe(201);
  return { owner, desk, pharm, med };
}

describe('start fresh', () => {
  it('every table is either trial data, stock or setup (a new table must be put in one of the lists)', async () => {
    const all = (await t.db.all<{ name: string }>(sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name <> '__drizzle_migrations'`)).map((r) => r.name).sort();
    expect([...TRIAL_TABLES, ...STOCK_TABLES, ...SETUP_TABLES].sort()).toEqual(all);
  });

  it('removes the trial data and the stock, keeps the setup, and numbering starts again', async () => {
    const { med } = await trial();
    for (const table of ['patient', 'op_visit', 'op_bill', 'bill_payment', 'pharmacy_sale', 'lab_result', 'visit_instruction', 'medicine_batch', 'purchase_bill', 'audit_log']) expect(await rows(table), table).toBeGreaterThan(0);
    const before = Object.fromEntries(await Promise.all(SETUP_TABLES.map(async (x) => [x, await rows(x)])));

    const result = await startFresh(t.db, { keepStock: false });
    expect(result.removed).toMatchObject({ patient: 1, op_visit: 1, op_bill: 1, pharmacy_sale: 1, medicine_batch: 1, purchase_bill: 1 });
    for (const table of [...TRIAL_TABLES, ...STOCK_TABLES]) expect(await rows(table), table).toBe(0);
    // The setup is exactly as it was.
    expect(Object.fromEntries(await Promise.all(SETUP_TABLES.map(async (x) => [x, await rows(x)])))).toEqual(before);
    expect(result.kept).toEqual(before);

    // Everyone signs in again with the same password; the lists are there; a new patient is the first again.
    const desk = await t.as('desk');
    const owner = await t.as('owner');
    expect((await json(owner('/api/b/main/lab/tests'))).tests.map((x: any) => x.name)).toEqual(['CBC']);
    expect((await json(owner('/api/b/main/bookmarks'))).bookmarks.map((b: any) => b.name)).toEqual(['Fever']);
    expect((await json(owner('/api/b/main/medicines'))).medicines.find((m: any) => m.id === med)).toMatchObject({ name: 'Paracetamol', pricePaise: 200, stock: 0 });
    expect((await json(owner('/api/b/main/billing/settings'))).consultationFeePaise).toBe(20000);
    expect((await json(owner('/api/b/main/patients'))).total).toBe(0);
    const { patient } = await json(post(desk, '/api/b/main/patients', { name: 'First Real Patient' }));
    expect(patient.uhid).toBe('AH000001');
    const { visit } = await json(post(desk, `/api/b/main/patients/${patient.id}/visits`));
    expect(visit.token).toBe(1);
    expect((await json(owner('/api/b/main/billing/day-report'))).totalPaise).toBe(0);
  });

  it('keeping the stock leaves the batches, purchase bills and vendor dues as they are now', async () => {
    const { med } = await trial();
    const stockBefore = (await json((await t.as('owner'))('/api/b/main/medicines'))).medicines.find((m: any) => m.id === med).stock;
    expect(stockBefore).toBe(96); // 100 received, 4 sold in the trial

    const result = await startFresh(t.db, { keepStock: true });
    expect(result.removed.medicine_batch).toBeUndefined();
    expect(result.kept).toMatchObject({ medicine_batch: 1, purchase_bill: 1, purchase_line: 1 });
    for (const table of TRIAL_TABLES) expect(await rows(table), table).toBe(0);
    const owner = await t.as('owner');
    expect((await json(owner('/api/b/main/medicines'))).medicines.find((m: any) => m.id === med).stock).toBe(96);
    expect((await json(owner('/api/b/main/purchases'))).bills).toHaveLength(1);
  });

  it('keep patients: the patients and their UHIDs stay, the next patient gets a new number; visits and bills go', async () => {
    await trial();
    const owner = await t.as('owner');
    const before = (await json(owner('/api/b/main/patients'))).patients.map((p: any) => p.uhid).sort();
    expect(before.length).toBeGreaterThan(0);
    const result = await startFresh(t.db, { keepStock: true, keepPatients: true });
    expect(result.removed.patient).toBeUndefined();
    expect(result.kept.patient).toBe(before.length);
    expect(await rows('op_visit')).toBe(0);
    expect(await rows('op_bill')).toBe(0);
    const owner2 = await t.as('owner');
    expect((await json(owner2('/api/b/main/patients'))).patients.map((p: any) => p.uhid).sort()).toEqual(before);
    const made = await owner2('/api/b/main/patients', { method: 'POST', body: { name: 'After Fresh' } });
    expect(made.status).toBe(201);
    expect(before).not.toContain((await made.json()).patient.uhid);
  });
});
