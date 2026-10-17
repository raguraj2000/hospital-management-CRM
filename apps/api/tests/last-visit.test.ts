// The patients list says when each patient last came and why; a visit says who started it.
import { afterEach, beforeEach, expect, it } from 'vitest';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;

it('last visit = the newest visit that was not cancelled, of this branch; none = null', async () => {
  const desk = await t.as('desk');
  const owner = await t.as('owner');
  const add = async (name: string) => (await json(desk('/api/b/main/patients', { method: 'POST', body: { name } }))).patient;
  const visit = async (id: number, complaint: string) => (await json(desk(`/api/b/main/patients/${id}/visits`, { method: 'POST', body: { complaint } }))).visit;
  const never = await add('Never Came');
  const twice = await add('Came Twice');
  await visit(twice.id, 'Fever');
  const second = await visit(twice.id, 'Review');
  const third = await visit(twice.id, 'Typed by mistake');
  expect((await desk(`/api/b/main/visits/${third.id}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
  // The same person registered in the other branch is another record: its visit does not show here.
  const east = (await json(owner('/api/b/east/patients', { method: 'POST', body: { name: 'East Patient' } }))).patient;
  await owner(`/api/b/east/patients/${east.id}/visits`, { method: 'POST', body: { complaint: 'East only' } });

  const list = (await json(desk('/api/b/main/patients'))).patients;
  expect(list.find((p: any) => p.id === never.id).lastVisit).toBeNull();
  expect(list.find((p: any) => p.id === twice.id).lastVisit).toMatchObject({ date: second.visitDate, complaint: 'Review' });
  expect(list.some((p: any) => p.name === 'East Patient')).toBe(false);

  // Who started the visit.
  const one = await json(desk(`/api/b/main/visits/${second.id}`));
  expect(one.visit.createdByName).toBeTruthy();
  expect((await json(owner('/api/b/main/visits'))).visits.find((v: any) => v.id === second.id).createdByName).toBe(one.visit.createdByName);
});
