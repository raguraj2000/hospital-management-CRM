// Bookmarks (ready-made treatments) and the instructions of a visit.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

type Caller = Awaited<ReturnType<Awaited<ReturnType<typeof setup>>['as']>>;
let t: Awaited<ReturnType<typeof setup>>;
let owner: Caller, doc: Caller, desk: Caller, pharm: Caller, nurse: Caller, eastdesk: Caller;
let para: number, ors: number, empty: number;
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const post = (c: Caller, url: string, body?: unknown) => c(url, { method: 'POST', body: body ?? {} });

beforeAll(async () => {
  t = await setup();
  [owner, doc, desk, pharm, nurse, eastdesk] = await Promise.all(['owner', 'doc', 'desk', 'pharm', 'nurse', 'eastdesk'].map((n) => t.as(n)));
  const med = async (name: string, stock: number) => {
    const { id } = await json(post(pharm, '/api/b/main/medicines', { name, form: 'tablet', pricePaise: 200 }));
    if (stock) await post(pharm, `/api/b/main/medicines/${id}/batches`, { batchNo: 'B1', expiryDate: inDays(200), quantity: stock });
    return id as number;
  };
  para = await med('Paracetamol 650', 500);
  ors = await med('ORS sachet', 500);
  empty = await med('Out Of Stock Tablet', 0);
});
afterAll(() => t.cleanup());

async function visit(name: string) {
  const { patient } = await json(post(desk, '/api/b/main/patients', { name }));
  const { visit: v } = await json(post(desk, `/api/b/main/patients/${patient.id}/visits`));
  return v.id as number;
}
const DENGUE = () => ({
  name: 'Dengue',
  lines: [
    { kind: 'medicine', medicineId: para, dose: '1-1-1', days: 5, instructions: 'After food' },
    { kind: 'medicine', medicineId: ors, dose: '1-0-1', days: 3, instructions: 'In 1 litre of water', givenHere: true },
    { kind: 'instruction', text: 'Check platelet count daily' },
    { kind: 'instruction', text: 'Plenty of fluids; no aspirin or ibuprofen' },
  ],
});

describe('bookmarks', () => {
  it('a doctor makes one; it is listed with its lines; front desk and pharmacy cannot make or see them', async () => {
    const made = await post(doc, '/api/b/main/bookmarks', DENGUE());
    expect(made.status).toBe(201);
    const { bookmark } = await made.json();
    expect(bookmark.name).toBe('Dengue');
    expect(bookmark.lines.map((l: any) => (l.kind === 'medicine' ? [l.medicineName, l.dose, l.days, l.instructions, l.givenHere, l.stock > 0] : l.text))).toEqual([
      ['Paracetamol 650', '1-1-1', 5, 'After food', false, true],
      ['ORS sachet', '1-0-1', 3, 'In 1 litre of water', true, true],
      'Check platelet count daily',
      'Plenty of fluids; no aspirin or ibuprofen',
    ]);
    expect((await json(owner('/api/b/main/bookmarks'))).bookmarks.map((b: any) => b.name)).toEqual(['Dengue']);
    for (const c of [desk, pharm]) {
      expect((await c('/api/b/main/bookmarks')).status).toBe(403);
      expect((await post(c, '/api/b/main/bookmarks', DENGUE())).status).toBe(403);
    }
    expect((await post(doc, '/api/b/main/bookmarks', { name: 'Empty', lines: [] })).status).toBe(400);
    expect((await post(doc, '/api/b/main/bookmarks', { name: 'Bad', lines: [{ kind: 'medicine', medicineId: 999999, dose: '1-0-1', days: 1 }] })).status).toBe(400);
  });

  it('applied to a visit: the ticked medicines go on the prescription, the ticked instructions on the checklist', async () => {
    const { bookmarks } = await json(doc('/api/b/main/bookmarks'));
    const dengue = bookmarks[0];
    const v = await visit('Ravi Kumar');
    // The doctor unticks the second instruction.
    const lines = dengue.lines.slice(0, 3).map((l: any) => ({ id: l.id }));
    const applied = await post(doc, `/api/b/main/visits/${v}/bookmarks/${dengue.id}/apply`, { lines });
    expect(applied.status).toBe(201);
    expect(await applied.json()).toMatchObject({ name: 'Dengue', medicines: 2, instructions: 1 });

    const rx = (await json(doc(`/api/b/main/visits/${v}/prescription`))).items;
    expect(rx.map((i: any) => [i.medicineName, i.dose, i.days, i.quantity, i.instructions, i.status, i.givenHere, i.dosesTotal])).toEqual([
      ['Paracetamol 650', '1-1-1', 5, 15, 'After food', 'pending', false, 0],
      ['ORS sachet', '1-0-1', 3, 6, 'In 1 litre of water', 'pending', true, 6], // given here: 2 doses a day for 3 days, for the nurse
    ]);
    const list = (await json(desk(`/api/b/main/visits/${v}/instructions`))).instructions;
    expect(list).toMatchObject([{ text: 'Check platelet count daily', bookmarkName: 'Dengue', doneAt: null, doneByName: null }]);
    // The pharmacy sees the medicines as on any prescription.
    expect((await json(pharm('/api/b/main/pharmacy/queue'))).queue.find((q: any) => q.visitId === v).items).toHaveLength(2);

    // The nurse confirms it: who and when are kept; twice is refused; it can be taken back; once done it cannot be removed.
    const done = await json(post(nurse, `/api/b/main/visit-instructions/${list[0].id}/done`));
    expect(done.instruction).toMatchObject({ doneByName: 'nurse' });
    expect(done.instruction.doneAt).toBeTruthy();
    expect((await post(doc, `/api/b/main/visit-instructions/${list[0].id}/done`)).status).toBe(409);
    expect((await doc(`/api/b/main/visit-instructions/${list[0].id}`, { method: 'DELETE' })).status).toBe(409);
    expect((await json(post(nurse, `/api/b/main/visit-instructions/${list[0].id}/undo`))).instruction).toMatchObject({ doneAt: null, doneByName: null });
    expect((await post(desk, `/api/b/main/visit-instructions/${list[0].id}/done`)).status).toBe(403);
    expect((await doc(`/api/b/main/visit-instructions/${list[0].id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await json(doc(`/api/b/main/visits/${v}/instructions`))).instructions).toEqual([]);
  });

  it('lines changed for this patient go onto the visit as changed; the bookmark stays the same', async () => {
    const dengue = (await json(doc('/api/b/main/bookmarks'))).bookmarks.find((b: any) => b.name === 'Dengue');
    const [p650, orsLine, platelets] = dengue.lines;
    const v = await visit('Child Patient');
    const applied = await post(doc, `/api/b/main/visits/${v}/bookmarks/${dengue.id}/apply`, {
      lines: [
        { id: p650.id, dose: '1-0-1', days: 3, instructions: 'Before food' }, // a lighter course: the quantity follows (2 a day x 3)
        { id: orsLine.id, quantity: 4, instructions: '' }, // only the quantity, and no instruction
        { id: platelets.id, text: 'Check platelet count on day 3' },
      ],
    });
    expect(applied.status).toBe(201);
    const rx = (await json(doc(`/api/b/main/visits/${v}/prescription`))).items;
    expect(rx.map((i: any) => [i.medicineName, i.dose, i.days, i.quantity, i.instructions])).toEqual([
      ['Paracetamol 650', '1-0-1', 3, 6, 'Before food'],
      ['ORS sachet', '1-0-1', 3, 4, null],
    ]);
    expect((await json(doc(`/api/b/main/visits/${v}/instructions`))).instructions.map((i: any) => i.text)).toEqual(['Check platelet count on day 3']);
    // The common bookmark is untouched.
    const after = (await json(doc('/api/b/main/bookmarks'))).bookmarks.find((b: any) => b.name === 'Dengue');
    expect(after).toEqual(dengue);
    // A dose the app cannot count needs its quantity.
    const bad = await post(doc, `/api/b/main/visits/${v}/bookmarks/${dengue.id}/apply`, { lines: [{ id: p650.id, dose: 'SOS' }] });
    expect(bad.status).toBe(400);
    expect((await post(doc, `/api/b/main/visits/${v}/bookmarks/${dengue.id}/apply`, { lines: [{ id: p650.id, dose: 'SOS', quantity: 5 }] })).status).toBe(201);
  });

  it('is refused whole when a ticked medicine has no stock, on a finished visit, or by someone who cannot prescribe', async () => {
    const { bookmark } = await json(post(doc, '/api/b/main/bookmarks', { name: 'With Missing Stock', lines: [{ kind: 'medicine', medicineId: empty, dose: '1-0-1', days: 2 }, { kind: 'medicine', medicineId: para, dose: '1-0-1', days: 2 }, { kind: 'instruction', text: 'Review in 2 days' }] }));
    expect(bookmark.lines[0]).toMatchObject({ medicineName: 'Out Of Stock Tablet', stock: 0 });
    const v = await visit('Stock Patient');
    const all = bookmark.lines.map((l: any) => l.id);
    const refused = await post(doc, `/api/b/main/visits/${v}/bookmarks/${bookmark.id}/apply`, { lines: all.map((id: number) => ({ id })) });
    expect([refused.status, (await refused.json()).code]).toEqual([409, 'out_of_stock']);
    expect((await json(doc(`/api/b/main/visits/${v}/prescription`))).items).toEqual([]); // nothing was added
    expect((await json(doc(`/api/b/main/visits/${v}/instructions`))).instructions).toEqual([]);
    // Without the one that is out of stock it goes through.
    expect((await post(doc, `/api/b/main/visits/${v}/bookmarks/${bookmark.id}/apply`, { lines: all.slice(1).map((id: number) => ({ id })) })).status).toBe(201);
    expect((await post(nurse, `/api/b/main/visits/${v}/bookmarks/${bookmark.id}/apply`, { lines: all.slice(1).map((id: number) => ({ id })) })).status).toBe(403);
    expect((await post(doc, `/api/b/main/visits/${v}/bookmarks/${bookmark.id}/apply`, { lines: [] })).status).toBe(400);
    await owner(`/api/b/main/visits/${v}`, { method: 'PATCH', body: { status: 'completed' } });
    expect((await post(doc, `/api/b/main/visits/${v}/bookmarks/${bookmark.id}/apply`, { lines: all.slice(1).map((id: number) => ({ id })) })).status).toBe(409);
  });

  it('is edited as a whole and deleted; visits it was applied to keep what they got', async () => {
    const { bookmark } = await json(post(doc, '/api/b/main/bookmarks', { name: 'Fever', lines: [{ kind: 'medicine', medicineId: para, dose: '1-0-1', days: 3 }, { kind: 'instruction', text: 'Tepid sponging' }] }));
    const v = await visit('Fever Patient');
    await post(doc, `/api/b/main/visits/${v}/bookmarks/${bookmark.id}/apply`, { lines: bookmark.lines.map((l: any) => ({ id: l.id })) });

    const edited = await json(doc(`/api/b/main/bookmarks/${bookmark.id}`, { method: 'PUT', body: { name: 'Viral fever', lines: [{ kind: 'instruction', text: 'Rest for 3 days' }] } }));
    expect(edited.bookmark).toMatchObject({ name: 'Viral fever', lines: [{ kind: 'instruction', text: 'Rest for 3 days' }] });
    expect((await doc(`/api/b/main/bookmarks/${bookmark.id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await json(doc('/api/b/main/bookmarks'))).bookmarks.map((b: any) => b.name)).not.toContain('Viral fever');
    expect((await doc(`/api/b/main/bookmarks/${bookmark.id}`, { method: 'PUT', body: { name: 'Back', lines: [{ kind: 'instruction', text: 'x again' }] } })).status).toBe(404);
    // The visit still has its medicine and its instruction.
    expect((await json(doc(`/api/b/main/visits/${v}/prescription`))).items).toHaveLength(1);
    expect((await json(doc(`/api/b/main/visits/${v}/instructions`))).instructions).toMatchObject([{ text: 'Tepid sponging', bookmarkName: 'Fever' }]);
  });

  it("another branch never sees, changes, applies or ticks this branch's bookmarks and instructions", async () => {
    const { bookmarks } = await json(doc('/api/b/main/bookmarks'));
    const dengue = bookmarks.find((b: any) => b.name === 'Dengue');
    const v = await visit('Branch Patient');
    await post(doc, `/api/b/main/visits/${v}/bookmarks/${dengue.id}/apply`, { lines: dengue.lines.map((l: any) => ({ id: l.id })) });
    const [instruction] = (await json(doc(`/api/b/main/visits/${v}/instructions`))).instructions;

    expect((await json(owner('/api/b/east/bookmarks'))).bookmarks).toEqual([]);
    expect((await owner(`/api/b/east/bookmarks/${dengue.id}`, { method: 'PUT', body: DENGUE() })).status).toBe(404); // like a missing one
    expect((await owner(`/api/b/east/bookmarks/${dengue.id}`, { method: 'PUT', body: { name: 'X1', lines: [{ kind: 'instruction', text: 'anything' }] } })).status).toBe(404);
    expect((await owner(`/api/b/east/bookmarks/${dengue.id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await post(owner, `/api/b/east/visits/${v}/bookmarks/${dengue.id}/apply`, { lines: [{ id: dengue.lines[0].id }] })).status).toBe(404);
    expect((await eastdesk(`/api/b/east/visits/${v}/instructions`)).status).toBe(404);
    expect((await post(owner, `/api/b/east/visit-instructions/${instruction.id}/done`)).status).toBe(404);
    expect((await owner(`/api/b/east/visit-instructions/${instruction.id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await json(doc(`/api/b/main/visits/${v}/instructions`))).instructions[0]).toMatchObject({ doneAt: null });
  });
});
