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

    // Paid in full, the visit is completed: it is final, nothing more goes on it (a new visit is made instead).
    expect((await json(owner('/api/b/main/checkout-queue'))).queue.some((q: any) => q.visitId === v.id)).toBe(false);
    const late = await post(doc, `/api/b/main/visits/${v.id}/charges`, { description: 'Second dressing', amountPaise: 10000 });
    expect(late.status).toBe(409);
    expect((await late.json()).code).toBe('visit_completed');
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

  it('round off: what the counter adds becomes one line of the bill, replaced when sent again', async () => {
    const v = await visit();
    await post(doc, `/api/b/main/visits/${v.id}/charges`, { description: 'Dressing', amountPaise: 15066 });
    // 200.00 fee + 150.66 dressing - 10.00 discount = 340.66 -> 341
    const paid = await json(post(owner, `/api/b/main/visits/${v.id}/checkout`, { paymentMode: 'cash', amountPaise: 10000, itemIds: [], consultationFeePaise: 20000, discountPaise: 1000, roundOffPaise: 34 }));
    expect(paid.bill.totalPaise).toBe(34100);
    expect(paid.bill.lines.filter((l: any) => l.labOrderId == null).map((l: any) => [l.description, l.amountPaise])).toEqual([['Dressing', 15066], ['Round off', 34]]);
    expect(paid.totals.balancePaise).toBe(24100);
    expect((await post(owner, `/api/b/main/visits/${v.id}/checkout`, { paymentMode: 'cash', amountPaise: 100, itemIds: [], roundOffPaise: 1001 })).status).toBe(400); // ₹10 at most
    const report = await json(owner('/api/b/main/reports/period?days=1'));
    expect(report.billed).toMatchObject({ roundOffPaise: 34, otherPaise: 15066 });
    expect((await json(owner('/api/b/main/billing/day-report'))).billed).toMatchObject({ roundOffPaise: 34, otherPaise: 15066 });
  });

  it('a visit with a bill cannot be cancelled (the bill would point at a cancelled visit); one without a bill can', async () => {
    const billed = await visit();
    await post(owner, `/api/b/main/visits/${billed.id}/checkout`, { paymentMode: 'cash', amountPaise: 0, itemIds: [], consultationFeePaise: 20000 });
    const no = await owner(`/api/b/main/visits/${billed.id}`, { method: 'PATCH', body: { status: 'cancelled' } });
    expect(no.status).toBe(409);
    expect((await no.json()).code).toBe('has_bills');
    const plain = await visit();
    expect((await owner(`/api/b/east/visits/${plain.id}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(404);
    expect((await owner(`/api/b/main/visits/${plain.id}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
  });

  it('a medicine a bookmark put on the prescription can be changed for this patient; the bookmark stays; not after the pharmacy gave it', async () => {
    const pharm = await t.as('pharm');
    const { id: med } = await json(post(pharm, '/api/b/main/medicines', { name: 'Paracetamol', form: 'tablet', pricePaise: 200 }));
    await post(pharm, `/api/b/main/medicines/${med}/batches`, { batchNo: 'B1', expiryDate: '2030-01-01', quantity: 100 });
    const { bookmark } = await json(post(doc, '/api/b/main/bookmarks', { name: 'Fever', lines: [{ kind: 'medicine', medicineId: med, dose: '1-0-1', days: 3, givenHere: true }] }));
    const v = await visit();
    await post(doc, `/api/b/main/visits/${v.id}/bookmarks/${bookmark.id}/apply`, { lines: bookmark.lines.map((l: any) => ({ id: l.id })) });
    const [item] = (await json(doc(`/api/b/main/visits/${v.id}/prescription`))).items;
    expect(item).toMatchObject({ dose: '1-0-1', days: 3, quantity: 6, dosesTotal: 6 });

    const changed = await doc(`/api/b/main/prescription-items/${item.id}`, { method: 'PATCH', body: { dose: '1-1-1', days: 2, instructions: 'After food' } });
    expect(changed.status).toBe(200);
    const [now] = (await json(doc(`/api/b/main/visits/${v.id}/prescription`))).items;
    expect(now).toMatchObject({ dose: '1-1-1', days: 2, quantity: 6, instructions: 'After food', dosesTotal: 6, dosesGiven: 0 });
    // A typed quantity is kept; the bookmark itself is as it was.
    await doc(`/api/b/main/prescription-items/${item.id}`, { method: 'PATCH', body: { dose: '1-1-1', days: 2, quantity: 4 } });
    expect((await json(doc(`/api/b/main/visits/${v.id}/prescription`))).items[0].quantity).toBe(4);
    expect((await json(doc('/api/b/main/bookmarks'))).bookmarks[0].lines[0]).toMatchObject({ dose: '1-0-1', days: 3 });

    expect((await lab(`/api/b/main/prescription-items/${item.id}`, { method: 'PATCH', body: { dose: '1-0-0', days: 1 } })).status).toBe(403);
    expect((await owner(`/api/b/east/prescription-items/${item.id}`, { method: 'PATCH', body: { dose: '1-0-0', days: 1 } })).status).toBe(404);
    expect((await doc(`/api/b/main/prescription-items/${item.id}`, { method: 'PATCH', body: { dose: 'SOS', days: 1 } })).status).toBe(400); // cannot be counted, no quantity typed
    // Given by the pharmacy: closed.
    expect((await post(pharm, '/api/b/main/pharmacy/dispense', { visitId: v.id, itemIds: [item.id], paymentMode: 'cash' })).status).toBe(201);
    expect((await doc(`/api/b/main/prescription-items/${item.id}`, { method: 'PATCH', body: { dose: '1-0-0', days: 1 } })).status).toBe(409);
  });

  it('a charge on the visit can be renamed and repriced: while it waits, and on the unpaid bill; not through another branch', async () => {
    const v = await visit();
    await post(doc, `/api/b/main/visits/${v.id}/charges`, { description: 'Dressing', amountPaise: 15000 });
    const [waiting] = (await json(doc(`/api/b/main/visits/${v.id}/charges`))).charges;
    expect((await doc(`/api/b/main/visits/${v.id}/charges/${waiting.key}`, { method: 'PUT', body: { description: 'Large dressing', amountPaise: 25000 } })).status).toBe(200);
    expect((await json(doc(`/api/b/main/visits/${v.id}/charges`))).charges).toMatchObject([{ description: 'Large dressing', amountPaise: 25000, pending: true }]);
    expect((await owner(`/api/b/east/visits/${v.id}/charges/${waiting.key}`, { method: 'PUT', body: { description: 'x', amountPaise: 1 } })).status).toBe(404);
    expect((await lab(`/api/b/main/visits/${v.id}/charges/${waiting.key}`, { method: 'PUT', body: { description: 'x', amountPaise: 1 } })).status).toBe(403);
    expect((await doc(`/api/b/main/visits/${v.id}/charges/v99999`, { method: 'PUT', body: { description: 'x', amountPaise: 1 } })).status).toBe(404);

    const { bill } = await json(post(owner, `/api/b/main/visits/${v.id}/bills`));
    expect(bill.totalPaise).toBe(45000);
    const [onBill] = (await json(owner(`/api/b/main/visits/${v.id}/charges`))).charges;
    await owner(`/api/b/main/visits/${v.id}/charges/${onBill.key}`, { method: 'PUT', body: { description: 'Large dressing', amountPaise: 20000 } });
    expect((await json(owner(`/api/b/main/bills/${bill.id}`))).bill.totalPaise).toBe(40000);
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
    // A branch that never saved a list starts with the usual ones, all at Rs 100.
    const start = (await json(owner('/api/b/east/billing/settings'))).chargePresets;
    expect(start.map((p: any) => p.name)).toEqual(['IM INJ', 'IVF', 'SV Set Inj', 'Dressing', 'Sutures', 'Venflon', 'Procedure (I & D)', 'Procedure (D & C)', 'USG', 'ECG']);
    expect(start.every((p: any) => p.amountPaise === 10000)).toBe(true);
    // Saved as an empty list, it stays empty.
    await owner('/api/b/east/billing/settings', { method: 'PUT', body: { consultationFeePaise: 0, chargePresets: [] } });
    expect((await json(owner('/api/b/east/billing/settings'))).chargePresets).toEqual([]);
    // Saving only the fee leaves the list alone.
    await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 25000 } });
    expect(await json(owner('/api/b/main/billing/settings'))).toEqual({ consultationFeePaise: 25000, feeSlots: [], chargePresets: [{ name: 'Dressing', amountPaise: 15000 }], navCounts: true });
  });
});
