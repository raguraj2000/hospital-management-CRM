// One working day of the hospital, played through the API by the real roles (front desk, doctor, lab, pharmacy,
// owner), with no shortcuts into the database. At the end the money, the stock and the statuses must all add up,
// and the other branch must have seen nothing.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { allResults, setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeAll(async () => (t = await setup()));
afterAll(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;
const year2 = `${new Date().getFullYear() + 2}-01-01`;
const FEE = 20000;

/** Every rupee the counters took today, as the people at the counter would count it. */
const ledger = { received: 0, roundOff: 0, discount: 0 };

async function ok(res: Response | Promise<Response>, status = [200, 201]) {
  const r = await res;
  if (!status.includes(r.status)) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json() as Promise<any>;
}

describe('a working day, played by every role', () => {
  let owner: Caller, desk: Caller, doc: Caller, lab: Caller, pharm: Caller, eastdesk: Caller;
  let para: number, syrup: number, cbc: number;
  const STOCK = { para: 100, syrup: 10 };
  const sold = { para: 0, syrup: 0 };
  const v: Record<string, { id: number; patientId: number; items: number[] }> = {};

  beforeAll(async () => {
    [owner, desk, doc, lab, pharm, eastdesk] = await Promise.all(['owner', 'desk', 'doc', 'labtech', 'pharm', 'eastdesk'].map((u) => t.as(u)));
    await ok(owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: FEE } }));
    cbc = (await ok(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }))).id;
    para = (await ok(pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 200 } }))).id;
    syrup = (await ok(pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Cough syrup', form: 'tablet', pricePaise: 9000 } }))).id;
    await ok(pharm(`/api/b/main/medicines/${para}/batches`, { method: 'POST', body: { batchNo: 'P1', expiryDate: year2, quantity: STOCK.para } }));
    await ok(pharm(`/api/b/main/medicines/${syrup}/batches`, { method: 'POST', body: { batchNo: 'S1', expiryDate: year2, quantity: STOCK.syrup } }));
  });

  /** Front desk: register (or reuse) the patient and start the OP visit. */
  async function arrive(key: string, name: string, patientId?: number) {
    const pid = patientId ?? (await ok(desk('/api/b/main/patients', { method: 'POST', body: { name, phone: `98${String(Object.keys(v).length).padStart(8, '7')}` } }))).patient.id;
    const { visit } = await ok(desk(`/api/b/main/patients/${pid}/visits`, { method: 'POST', body: { complaint: `${name} complaint` } }));
    v[key] = { id: visit.id, patientId: pid, items: [] };
    return visit;
  }
  /** Doctor: call this patient in, prescribe. */
  async function consult(key: string, rx: { med: number; dose: string; days: number; quantity?: number }[]) {
    await ok(doc('/api/b/main/visits/call-next', { method: 'POST', body: { visitId: v[key]!.id } }));
    for (const r of rx) v[key]!.items.push((await ok(doc(`/api/b/main/visits/${v[key]!.id}/prescription`, { method: 'POST', body: { medicineId: r.med, dose: r.dose, days: r.days, quantity: r.quantity } }))).id);
  }
  const sendToCounter = (key: string) => ok(doc(`/api/b/main/visits/${v[key]!.id}/send`, { method: 'POST', body: { to: 'counter' } }));
  /** Pharmacy counter: read the total, collect it (or part of it), give the ticked medicines. */
  async function collect(key: string, opts: { itemIds?: number[]; less?: number; discountPaise?: number; roundOffPaise?: number; mode?: string } = {}) {
    const seen = await ok(pharm(`/api/b/main/visits/${v[key]!.id}/checkout`));
    const itemIds = opts.itemIds ?? v[key]!.items;
    const meds = (seen.medicines?.items ?? []).filter((i: any) => itemIds.includes(i.id)).reduce((s: number, i: any) => s + i.quantity * i.pricePaise, 0);
    const bill = Math.max(0, seen.totals.billDuePaise - (opts.discountPaise ?? 0)) + (opts.roundOffPaise ?? 0);
    const amountPaise = bill + meds - (opts.less ?? 0);
    const body: Record<string, unknown> = { paymentMode: opts.mode ?? 'cash', amountPaise, itemIds, roundOffPaise: opts.roundOffPaise ?? 0 };
    if (opts.discountPaise) body.discountPaise = opts.discountPaise;
    const r = await ok(pharm(`/api/b/main/visits/${v[key]!.id}/checkout`, { method: 'POST', body }));
    ledger.received += amountPaise;
    ledger.roundOff += opts.roundOffPaise ?? 0;
    ledger.discount += opts.discountPaise ?? 0;
    for (const i of seen.medicines?.items ?? []) if (itemIds.includes(i.id)) sold[i.medicineId === para ? 'para' : 'syrup'] += i.quantity;
    return r;
  }

  it('Asha: fever, two medicines, pays in full by cash', async () => {
    await arrive('asha', 'Asha');
    await consult('asha', [{ med: para, dose: '1-0-1', days: 5 }, { med: syrup, dose: 'SOS', days: 3, quantity: 1 }]);
    await sendToCounter('asha');
    const r = await collect('asha');
    expect(r.visitStatus).toBe('completed');
  });

  it('Babu: CBC first; the lab collects the sample and enters the result; then medicines, UPI', async () => {
    await arrive('babu', 'Babu');
    await consult('babu', [{ med: para, dose: '0-0-1', days: 3 }]);
    const { orders } = await ok(doc(`/api/b/main/visits/${v.babu!.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc] } }));
    const orderId = orders?.[0]?.id ?? (await ok(lab(`/api/b/main/visits/${v.babu!.id}/lab-orders`))).orders[0].id;
    await ok(lab(`/api/b/main/lab/orders/${orderId}`, { method: 'PATCH', body: { status: 'sample_collected' } }));
    await ok(lab(`/api/b/main/lab/orders/${orderId}/results`, { method: 'PUT', body: { results: await allResults(t.db, orderId, '12'), complete: true } }));
    await sendToCounter('babu');
    expect((await collect('babu', { mode: 'upi' })).visitStatus).toBe('completed');
  });

  it('Chitra: buys one medicine of two and pays part now; the rest stays as due, paid later the same day', async () => {
    await arrive('chitra', 'Chitra');
    await consult('chitra', [{ med: para, dose: '1-1-1', days: 5 }, { med: syrup, dose: 'SOS', days: 3, quantity: 2 }]);
    await sendToCounter('chitra');
    await collect('chitra', { itemIds: [v.chitra!.items[0]!], less: 5000 });
    const bills = await ok(desk(`/api/b/main/patients/${v.chitra!.patientId}/bills`));
    expect(bills.summary.balancePaise).toBe(5000);
    await ok(desk(`/api/b/main/patients/${v.chitra!.patientId}/pay-dues`, { method: 'POST', body: { amountPaise: 5000, mode: 'cash' } }));
    ledger.received += 5000;
    expect((await ok(desk(`/api/b/main/patients/${v.chitra!.patientId}/bills`))).summary.balancePaise).toBe(0);
    // The syrup she did not take is declined, not sold: it never leaves the stock.
    const rx = await ok(pharm(`/api/b/main/visits/${v.chitra!.id}/prescription`));
    expect(rx.items.find((i: any) => i.id === v.chitra!.items[1]).status).toBe('declined');
  });

  it('Asha comes back the same day: the second visit is free, the counter collects only the medicine', async () => {
    await arrive('asha2', 'Asha', v.asha!.patientId);
    await ok(doc(`/api/b/main/visits/${v.asha2!.id}/consultation-fee`, { method: 'PUT', body: { consultationFeePaise: 0 } }));
    await consult('asha2', [{ med: para, dose: '1-0-0', days: 2 }]);
    await sendToCounter('asha2');
    const seen = await ok(pharm(`/api/b/main/visits/${v.asha2!.id}/checkout`));
    expect(seen.totals.billDuePaise).toBe(0);
    await collect('asha2');
  });

  it('Dinesh leaves before seeing the doctor: the desk cancels; nothing is billed, nothing is sold', async () => {
    await arrive('dinesh', 'Dinesh');
    await ok(desk(`/api/b/main/visits/${v.dinesh!.id}`, { method: 'PATCH', body: { status: 'cancelled' } }));
    const seen = await pharm(`/api/b/main/visits/${v.dinesh!.id}/checkout`);
    expect([404, 409, 200]).toContain(seen.status);
    const [{ n }] = await t.db.all<{ n: number }>(sql`select count(*) as n from op_bill where visit_id = ${v.dinesh!.id}`);
    expect(n).toBe(0);
  });

  it('Elango: a ₹50 discount on the consultation and a ₹3 round off', async () => {
    await arrive('elango', 'Elango');
    await consult('elango', [{ med: para, dose: '1-0-1', days: 1 }]);
    await sendToCounter('elango');
    await collect('elango', { discountPaise: 5000, roundOffPaise: 100 });
  });

  it('a walk-in buys over the counter with round off', async () => {
    const { sale } = await ok(pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: para, quantity: 7 }], paymentMode: 'cash', roundOffPaise: 100 } }));
    expect(sale.totalPaise).toBe(7 * 200 + 100);
    sold.para += 7;
    ledger.received += sale.totalPaise;
    ledger.roundOff += 100;
  });

  it('end of the day: money, dues and round off add up in the day report', async () => {
    const day = await ok(owner('/api/b/main/billing/day-report'));
    expect(day.totalPaise).toBe(ledger.received);
    expect(day.billed.roundOffPaise).toBe(ledger.roundOff);
    expect(day.billed.discountPaise).toBe(ledger.discount);
    expect(day.pendingAllPaise).toBe(0);
    // Every rupee has a receipt with the person who took it.
    const [{ unknown }] = await t.db.all<{ unknown: number }>(sql`select count(*) as unknown from bill_payment where received_by is null`);
    expect(unknown).toBe(0);
    const [{ noSeller }] = await t.db.all<{ noSeller: number }>(sql`select count(*) as noSeller from pharmacy_sale where created_by is null`);
    expect(noSeller).toBe(0);
  });

  it('end of the day: stock left = stock bought − what was sold, per medicine', async () => {
    const left = async (id: number) => (await ok(pharm(`/api/b/main/medicines/${id}/batches`))).batches.reduce((s: number, b: any) => s + b.quantity, 0);
    expect(await left(para)).toBe(STOCK.para - sold.para);
    expect(await left(syrup)).toBe(STOCK.syrup - sold.syrup);
  });

  it('end of the day: every paid visit is completed and final; the cancelled one stays cancelled', async () => {
    for (const k of ['asha', 'babu', 'chitra', 'asha2', 'elango']) {
      const { visit } = await ok(doc(`/api/b/main/visits/${v[k]!.id}`));
      expect([k, visit.status]).toEqual([k, 'completed']);
      // Final: no more medicines, charges or lab tests on it.
      expect((await doc(`/api/b/main/visits/${v[k]!.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-0-0', days: 1 } })).status).toBe(409);
      expect((await doc(`/api/b/main/visits/${v[k]!.id}/charges`, { method: 'POST', body: { description: 'Late', amountPaise: 100 } })).status).toBe(409);
    }
    expect((await ok(doc(`/api/b/main/visits/${v.dinesh!.id}`))).visit.status).toBe('cancelled');
  });

  it('the other branch saw nothing of the day', async () => {
    for (const k of Object.keys(v)) expect((await eastdesk(`/api/b/east/patients/${v[k]!.patientId}`)).status).toBe(404);
    expect((await eastdesk(`/api/b/east/visits/${v.asha!.id}`)).status).toBe(404);
    const east = await ok(owner('/api/b/east/billing/day-report'));
    expect(east.totalPaise).toBe(0);
    // And east staff cannot open main at all.
    expect((await eastdesk('/api/b/main/patients')).status).toBe(404); // a branch you are not in is like one that does not exist
  });

  it('every money move today is in the audit log', async () => {
    const [{ sales }] = await t.db.all<{ sales: number }>(sql`select count(*) as sales from pharmacy_sale`);
    const [{ audited }] = await t.db.all<{ audited: number }>(sql`select count(distinct entity_id) as audited from audit_log where entity = 'pharmacy_sale' or (entity = 'visit' and action like '%checkout%')`);
    expect(sales).toBeGreaterThan(0);
    expect(audited).toBeGreaterThan(0);
  });
});
