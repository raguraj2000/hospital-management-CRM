// The doctor had to leave / the day is over: many OP visits at once (BUSINESS-RULES.md, "Doctor absent").
// - Change doctor for all: only patients the doctor has not finished; a patient inside goes back to waiting.
// - Delete selected: only visits where nothing was done; a visit with work is skipped (move it instead).
import { and, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auditLog, branchDoctor, opVisit, user } from '../src/db/schema.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;

async function world() {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const desk = await t.as('desk');
  const eastdesk = await t.as('eastdesk');
  const [docRow] = await t.db.select({ id: user.id }).from(user).where(eq(user.name, 'doc'));
  const [ownerRow] = await t.db.select({ id: user.id }).from(user).where(eq(user.isOwner, true));
  // The owner also sees patients in main: the second doctor.
  await t.db.insert(branchDoctor).values({ branchId: t.main.id, userId: ownerRow!.id });
  const { id: med } = await json(owner('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 200 } }));
  await owner(`/api/b/main/medicines/${med}/batches`, { method: 'POST', body: { batchNo: 'B1', expiryDate: `${new Date().getFullYear() + 2}-01-01`, quantity: 50 } });
  return { owner, doc, desk, eastdesk, docId: docRow!.id, ownerId: ownerRow!.id, med };
}
type World = Awaited<ReturnType<typeof world>>;

async function visit(w: World, name: string, doctorUserId: number) {
  const { patient } = await json(w.desk('/api/b/main/patients', { method: 'POST', body: { name } }));
  const { visit: v } = await json(w.desk(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: { doctorUserId } }));
  return v.id as number;
}
const rowOf = async (id: number) => (await t.db.select().from(opVisit).where(eq(opVisit.id, id)))[0]!;
const changeDoctor = (caller: Caller, body: unknown, branch = 'main') => caller(`/api/b/${branch}/visits/change-doctor`, { method: 'POST', body });
const del = (caller: Caller, body: unknown, branch = 'main') => caller(`/api/b/${branch}/visits/delete`, { method: 'POST', body });

describe('change doctor for many visits', () => {
  it('moves waiting and inside patients to the new doctor; seen and finished ones are skipped with the reason', async () => {
    const w = await world();
    const waiting = await visit(w, 'Waiting One', w.docId);
    const inside = await visit(w, 'Inside One', w.docId);
    const seen = await visit(w, 'Seen One', w.docId);
    const already = await visit(w, 'Owner Patient', w.ownerId);
    await t.db.update(opVisit).set({ status: 'with_doctor' }).where(eq(opVisit.id, inside));
    await t.db.update(opVisit).set({ status: 'at_counter' }).where(eq(opVisit.id, seen));

    const res = await changeDoctor(w.desk, { visitIds: [waiting, inside, seen, already], doctorUserId: w.ownerId });
    expect(res.status).toBe(200);
    const r = await res.json();
    expect(r.done).toEqual([waiting, inside]);
    expect(r.skipped.map((s: any) => [s.id, s.reason])).toEqual([
      [seen, 'The doctor already saw this patient'],
      [already, 'Already with this doctor'],
    ]);
    expect(await rowOf(waiting)).toMatchObject({ doctorUserId: w.ownerId, status: 'waiting' });
    expect(await rowOf(inside)).toMatchObject({ doctorUserId: w.ownerId, status: 'waiting' }); // waits for the new doctor
    expect(await rowOf(seen)).toMatchObject({ doctorUserId: w.docId, status: 'at_counter' }); // keeps the doctor who saw them
    const audits = await t.db.select().from(auditLog).where(and(eq(auditLog.entity, 'op_visit'), eq(auditLog.action, 'update')));
    expect(audits.filter((a) => JSON.parse(a.detail ?? '{}').many).map((a) => Number(a.entityId)).sort()).toEqual([waiting, inside].sort());
  });

  it('refuses a doctor of no branch, a role without patient.edit, and another branch (404, nothing changes)', async () => {
    const w = await world();
    const v = await visit(w, 'Waiting One', w.docId);
    expect((await changeDoctor(w.desk, { visitIds: [v], doctorUserId: 999999 })).status).toBe(400);
    expect((await changeDoctor(w.desk, { visitIds: [], doctorUserId: w.ownerId })).status).toBe(400);
    const lab = await t.as('labtech');
    expect((await changeDoctor(lab, { visitIds: [v], doctorUserId: w.ownerId })).status).toBe(403);
    // East's front desk, through east, asking for main's visit: it does not exist there.
    expect((await changeDoctor(w.eastdesk, { visitIds: [v], doctorUserId: null }, 'east')).status).toBe(404);
    expect((await changeDoctor(w.eastdesk, { visitIds: [v], doctorUserId: null }, 'main')).status).toBe(404);
    expect(await rowOf(v)).toMatchObject({ doctorUserId: w.docId });
  });
});

describe('delete many visits', () => {
  it('deletes only visits where nothing was done; a visit with a medicine or a charge is skipped', async () => {
    const w = await world();
    const empty1 = await visit(w, 'Not Seen One', w.docId);
    const empty2 = await visit(w, 'Not Seen Two', w.docId);
    const withMed = await visit(w, 'Has Medicine', w.docId);
    const withCharge = await visit(w, 'Has Charge', w.docId);
    expect((await w.doc(`/api/b/main/visits/${withMed}/prescription`, { method: 'POST', body: { medicineId: w.med, dose: '1-0-1', days: 3 } })).status).toBe(201);
    expect((await w.owner(`/api/b/main/visits/${withCharge}/charges`, { method: 'POST', body: { description: 'Dressing', amountPaise: 5000 } })).status).toBe(201);

    // Front desk has no patient.delete by default.
    expect((await del(w.desk, { visitIds: [empty1] })).status).toBe(403);

    const res = await del(w.owner, { visitIds: [empty1, empty2, withMed, withCharge] });
    expect(res.status).toBe(200);
    const r = await res.json();
    expect(r.done).toEqual([empty1, empty2]);
    expect(r.skipped.map((s: any) => s.id)).toEqual([withMed, withCharge]);
    expect(r.skipped[0].reason).toContain('move it to another doctor instead');
    expect((await rowOf(empty1)).deletedAt).not.toBeNull();
    expect((await rowOf(withMed)).deletedAt).toBeNull();

    // Gone from the day's list; deleting again answers like a missing visit.
    const day = await json(w.owner('/api/b/main/visits'));
    expect(day.visits.map((v: any) => v.id)).not.toContain(empty1);
    expect((await del(w.owner, { visitIds: [empty1] })).status).toBe(404);
  });

  it('another branch cannot delete main\'s visits', async () => {
    const w = await world();
    const v = await visit(w, 'Not Seen One', w.docId);
    expect((await del(w.owner, { visitIds: [v] }, 'east')).status).toBe(404);
    expect((await rowOf(v)).deletedAt).toBeNull();
  });
});
