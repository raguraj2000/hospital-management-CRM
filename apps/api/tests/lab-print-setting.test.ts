// "Print lab reports before payment" (BUSINESS-RULES.md section 4): pay-at-the-end hospitals need the report for the
// doctor before the one final bill. Only the owner / branch admin (settings.manage) switch it, per branch.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;

describe('print lab reports before payment', () => {
  it('off by default; when the owner switches it on, any lab printer prints unpaid; only this branch', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const desk = await t.as('desk');
    const lab = await t.as('labtech');
    const { id: cbc } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));
    const { patient } = await json(doc('/api/b/main/patients', { method: 'POST', body: { name: 'Village Patient' } }));
    const { visit } = await json(doc(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
    expect((await doc(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc] } })).status).toBe(201);
    const print = () => lab(`/api/b/main/visits/${visit.id}/lab-report?print=1`);
    const settings = (caller: typeof owner, body: unknown, branch = 'main') => caller(`/api/b/${branch}/billing/settings`, { method: 'PUT', body });

    expect((await json(owner('/api/b/main/billing/settings'))).labPrintBeforePayment).toBe(false);
    expect((await print()).status).toBe(402);

    // The front desk (no settings.manage) cannot switch it on.
    expect((await settings(desk, { consultationFeePaise: 0, labPrintBeforePayment: true })).status).toBe(403);
    expect((await print()).status).toBe(402);

    // Switched on in the other branch: main is not affected.
    expect((await settings(owner, { consultationFeePaise: 0, labPrintBeforePayment: true }, 'east')).status).toBe(200);
    expect((await print()).status).toBe(402);

    expect((await settings(owner, { consultationFeePaise: 0, labPrintBeforePayment: true })).status).toBe(200);
    const res = await print();
    expect(res.status).toBe(200);
    expect((await res.json()).payment).toMatchObject({ paid: false, printAllowed: true });

    // Saving another setting without the switch leaves it as it is; switching off locks printing again.
    expect((await settings(owner, { consultationFeePaise: 25000 })).status).toBe(200);
    expect((await print()).status).toBe(200);
    expect((await settings(owner, { consultationFeePaise: 25000, labPrintBeforePayment: false })).status).toBe(200);
    expect((await print()).status).toBe(402);
  });
});
