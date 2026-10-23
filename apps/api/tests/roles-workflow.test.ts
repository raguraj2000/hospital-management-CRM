import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const json = async (r: Response | Promise<Response>) => (await r).json();

describe('who may start an OP, prescribe and send to the counter (default roles)', () => {
  it('each role gets exactly the OP steps its permissions allow', async () => {
    const owner = await t.as('owner');
    const { id: med } = await json(owner('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 200 } }));
    const expiry = new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10);
    await owner(`/api/b/main/medicines/${med}/batches`, { method: 'POST', body: { batchNo: 'B1', expiryDate: expiry, quantity: 500 } });
    const { id: test } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));

    const steps = async (who: string) => {
      const as = await t.as(who);
      const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: `For ${who}` } }));
      const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
      return {
        patient: (await as('/api/b/main/patients', { method: 'POST', body: { name: `By ${who}` } })).status,
        op: (await as(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} })).status,
        prescribe: (await as(`/api/b/main/visits/${visit.id}/prescription`, { method: 'POST', body: { medicineId: med, dose: '1-0-1', days: 3 } })).status,
        send: (await as(`/api/b/main/visits/${visit.id}/send`, { method: 'POST', body: { to: 'counter' } })).status,
        directBill: (await as(`/api/b/main/patients/${patient.id}/direct-bill`, { method: 'POST', body: {} })).status,
        directLab: (await as(`/api/b/main/patients/${patient.id}/direct-lab`, { method: 'POST', body: { testIds: [test] } })).status,
      };
    };
    expect(await steps('doc')).toEqual({ patient: 201, op: 201, prescribe: 201, send: 200, directBill: 403, directLab: 201 });
    // The front desk may start an OP and send it to the counter, but never prescribe.
    expect(await steps('desk')).toEqual({ patient: 201, op: 201, prescribe: 403, send: 200, directBill: 201, directLab: 201 });
    // The pharmacist: only a direct bill. No OP, no prescription, no sending.
    expect(await steps('pharm')).toEqual({ patient: 403, op: 403, prescribe: 403, send: 403, directBill: 201, directLab: 403 });
    expect(await steps('labtech')).toEqual({ patient: 403, op: 403, prescribe: 403, send: 403, directBill: 403, directLab: 201 });
    expect(await steps('nurse')).toEqual({ patient: 403, op: 403, prescribe: 403, send: 403, directBill: 403, directLab: 403 });
  });

  it('the counter shows who really sent the visit: a doctor, or the front desk by name', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const desk = await t.as('desk');
    const visitOf = async (name: string) => {
      const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name } }));
      return (await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }))).visit;
    };
    const byDoc = await visitOf('Seen By Doctor');
    const byDesk = await visitOf('No Doctor Saw');
    expect((await doc(`/api/b/main/visits/${byDoc.id}/send`, { method: 'POST', body: { to: 'counter' } })).status).toBe(200);
    expect((await desk(`/api/b/main/visits/${byDesk.id}/send`, { method: 'POST', body: { to: 'counter' } })).status).toBe(200);

    const { queue } = await json(desk('/api/b/main/checkout-queue'));
    expect(queue.find((e: any) => e.visitId === byDoc.id).sentBy).toEqual({ name: 'doc', doctor: true, role: 'Doctor' });
    expect(queue.find((e: any) => e.visitId === byDesk.id).sentBy).toEqual({ name: 'desk', doctor: false, role: 'Front desk' });

    // Another branch's counter never sees them (and cannot send them).
    const east = await t.as('eastdesk');
    expect((await json(east('/api/b/east/checkout-queue'))).queue.some((e: any) => e.visitId === byDoc.id)).toBe(false);
    expect((await east(`/api/b/east/visits/${byDesk.id}/send`, { method: 'POST', body: { to: 'counter' } })).status).toBe(404);
  });
});
