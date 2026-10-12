// Extra charges of a visit (dressing, IV...): added by the doctor before the bill exists, or by the counter;
// saved at once; on the bill when it is made; closed once the bill has a payment.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

type Caller = Awaited<ReturnType<Awaited<ReturnType<typeof setup>>['as']>>;
let t: Awaited<ReturnType<typeof setup>>;
let owner: Caller, doc: Caller, lab: Caller;
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;
const post = (c: Caller, url: string, body?: unknown) => c(url, { method: 'POST', body: body ?? {} });

beforeEach(async () => {
  t = await setup();
  [owner, doc, lab] = await Promise.all(['owner', 'doc', 'labtech'].map((n) => t.as(n)));
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000, chargePresets: [{ name: 'Dressing', amountPaise: 15000 }] } });
});
afterEach(() => t.cleanup());

async function visit(branch = 'main') {
  const { patient } = await json(post(owner, `/api/b/${branch}/patients`, { name: 'Ravi Kumar' }));
  return (await json(post(owner, `/api/b/${branch}/patients/${patient.id}/visits`))).visit as { id: number };
}

describe('visit charges', () => {
  it('the doctor adds one before the bill exists: it waits on the visit, shows at the counter, and is on the bill', async () => {
    const v = await visit();
    const added = await post(doc, `/api/b/main/visits/${v.id}/charges`, { description: 'Dressing', amountPaise: 15000 });
    expect(added.status).toBe(201);
    await post(doc, `/api/b/main/visits/${v.id}/charges`, { description: 'IV fluids', amountPaise: 30000 });
    const now = await json(doc(`/api/b/main/visits/${v.id}/charges`));
    expect(now).toMatchObject({ locked: null, presets: [{ name: 'Dressing', amountPaise: 15000 }] });
    expect(now.charges.map((c: any) => [c.description, c.amountPaise, c.pending])).toEqual([['Dressing', 15000, true], ['IV fluids', 30000, true]]);

    // Removing one before the bill.
    expect((await doc(`/api/b/main/visits/${v.id}/charges/${now.charges[1].key}`, { method: 'DELETE' })).status).toBe(200);
    await post(doc, `/api/b/main/visits/${v.id}/send`, { to: 'counter' });

    const co = await json(owner(`/api/b/main/visits/${v.id}/checkout`));
    expect(co.bill.charges).toEqual([{ description: 'Dressing', amountPaise: 15000 }]);
    expect(co.totals.grandTotalPaise).toBe(35000);
    const entry = (await json(owner('/api/b/main/checkout-queue'))).queue.find((q: any) => q.visitId === v.id);
    expect(entry.grandTotalPaise).toBe(35000);
    expect(entry.visitAt).toBeTruthy();

    // Collected without the screen sending the charges: the bill has the charge once.
    const paid = await json(post(owner, `/api/b/main/visits/${v.id}/checkout`, { paymentMode: 'cash', amountPaise: 35000, itemIds: [], consultationFeePaise: 20000, discountPaise: 0 }));
    expect(paid.bill.totalPaise).toBe(35000);
    expect(paid.bill.lines.filter((l: any) => l.labOrderId == null).map((l: any) => [l.description, l.amountPaise])).toEqual([['Dressing', 15000]]);

    // A charge added after the bill was paid waits on the visit, brings the patient back onto the counter's
    // list, and is collected on a second bill that carries no consultation fee.
    expect((await json(owner('/api/b/main/checkout-queue'))).queue.some((q: any) => q.visitId === v.id)).toBe(false);
    expect((await post(doc, `/api/b/main/visits/${v.id}/charges`, { description: 'Second dressing', amountPaise: 10000 })).status).toBe(201);
    expect((await json(doc(`/api/b/main/visits/${v.id}/charges`))).charges).toMatchObject([{ description: 'Second dressing', pending: true }]);
    const again = (await json(owner('/api/b/main/checkout-queue'))).queue.find((q: any) => q.visitId === v.id);
    expect(again.grandTotalPaise).toBe(10000);
    const co2 = await json(owner(`/api/b/main/visits/${v.id}/checkout`));
    expect(co2.bill).toMatchObject({ editable: true, consultationFeePaise: 0, charges: [{ description: 'Second dressing', amountPaise: 10000 }] });
    expect(co2.totals.grandTotalPaise).toBe(10000);
    const paid2 = await json(post(owner, `/api/b/main/visits/${v.id}/checkout`, { paymentMode: 'upi', amountPaise: 10000, itemIds: [], consultationFeePaise: 0, discountPaise: 0 }));
    expect(paid2.bill).toMatchObject({ totalPaise: 10000, consultationFeePaise: 0, status: 'paid' });
    expect(paid2.bill.id).not.toBe(paid.bill.id);
    expect((await json(owner(`/api/b/main/visits/${v.id}/bills`))).bills).toHaveLength(2);
    expect((await json(owner('/api/b/main/checkout-queue'))).queue.some((q: any) => q.visitId === v.id)).toBe(false);
  });

  it('only who prescribes changes the note to the pharmacy: not the counter, not the lab, not through another branch', async () => {
    const v = await visit();
    const pharm = await t.as('pharm');
    expect((await doc(`/api/b/main/visits/${v.id}/pharmacy-note`, { method: 'PUT', body: { note: 'Give the generic brand' } })).status).toBe(200);
    expect((await json(owner(`/api/b/main/visits/${v.id}`))).visit.pharmacyNote).toBe('Give the generic brand');
    expect((await pharm(`/api/b/main/visits/${v.id}/pharmacy-note`, { method: 'PUT', body: { note: 'x' } })).status).toBe(403);
    expect((await lab(`/api/b/main/visits/${v.id}/pharmacy-note`, { method: 'PUT', body: { note: 'x' } })).status).toBe(403);
    expect((await owner(`/api/b/east/visits/${v.id}/pharmacy-note`, { method: 'PUT', body: { note: 'x' } })).status).toBe(404);
    expect((await doc(`/api/b/main/visits/${v.id}/pharmacy-note`, { method: 'PUT', body: { note: 'x'.repeat(501) } })).status).toBe(400);
    await doc(`/api/b/main/visits/${v.id}/pharmacy-note`, { method: 'PUT', body: { note: '  ' } });
    expect((await json(owner(`/api/b/main/visits/${v.id}`))).visit.pharmacyNote).toBeNull();
  });


  it('with an unpaid bill the charge goes straight onto that bill, and can be removed from it', async () => {
    const v = await visit();
    const { bill } = await json(post(owner, `/api/b/main/visits/${v.id}/bills`));
    expect(bill.totalPaise).toBe(20000);
    await post(owner, `/api/b/main/visits/${v.id}/charges`, { description: 'Injection', amountPaise: 5000 });
    expect((await json(owner(`/api/b/main/bills/${bill.id}`))).bill.totalPaise).toBe(25000);
    const now = await json(owner(`/api/b/main/visits/${v.id}/charges`));
    expect(now.charges).toMatchObject([{ description: 'Injection', amountPaise: 5000, pending: false }]);
    await owner(`/api/b/main/visits/${v.id}/charges/${now.charges[0].key}`, { method: 'DELETE' });
    expect((await json(owner(`/api/b/main/bills/${bill.id}`))).bill.totalPaise).toBe(20000);
  });

  it('round off: the paise up to the next rupee become one line of the bill, replaced when sent again', async () => {
    const v = await visit();
    await post(doc, `/api/b/main/visits/${v.id}/charges`, { description: 'Dressing', amountPaise: 15066 });
    // 200.00 fee + 150.66 dressing - 10.00 discount = 340.66 -> 341
    const paid = await json(post(owner, `/api/b/main/visits/${v.id}/checkout`, { paymentMode: 'cash', amountPaise: 10000, itemIds: [], consultationFeePaise: 20000, discountPaise: 1000, roundOffPaise: 34 }));
    expect(paid.bill.totalPaise).toBe(34100);
    expect(paid.bill.lines.filter((l: any) => l.labOrderId == null).map((l: any) => [l.description, l.amountPaise])).toEqual([['Dressing', 15066], ['Round off', 34]]);
    expect(paid.totals.balancePaise).toBe(24100);
    expect((await post(owner, `/api/b/main/visits/${v.id}/checkout`, { paymentMode: 'cash', amountPaise: 100, itemIds: [], roundOffPaise: 100 })).status).toBe(400);
  });

  it("refuses bad input, roles that neither prescribe nor bill, and another branch's visit", async () => {
    const v = await visit();
    expect((await post(doc, `/api/b/main/visits/${v.id}/charges`, { description: '', amountPaise: 100 })).status).toBe(400);
    expect((await post(lab, `/api/b/main/visits/${v.id}/charges`, { description: 'Dressing', amountPaise: 100 })).status).toBe(403);
    // The same visit id asked through the other branch answers like a missing one.
    expect((await owner(`/api/b/east/visits/${v.id}/charges`)).status).toBe(404);
    expect((await post(owner, `/api/b/east/visits/${v.id}/charges`, { description: 'Dressing', amountPaise: 100 })).status).toBe(404);
    expect((await owner(`/api/b/east/visits/${v.id}/charges/v1`, { method: 'DELETE' })).status).toBe(404);
    // The ready-made list is the branch's own.
    expect((await json(owner('/api/b/east/billing/settings'))).chargePresets).toEqual([]);
    // Saving only the fee leaves the list alone.
    await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 25000 } });
    expect(await json(owner('/api/b/main/billing/settings'))).toEqual({ consultationFeePaise: 25000, chargePresets: [{ name: 'Dressing', amountPaise: 15000 }] });
  });
});
