// Bookmarks: ready-made treatments ("Dengue") applied to a visit in one go -- the medicines go onto the
// prescription, the instructions onto the visit's checklist, where each is ticked when carried out.
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import { bookmarkApplySchema, bookmarkInputSchema, suggestedQuantity, type Bookmark, type BookmarkLine, type VisitInstruction } from '@platform/shared';
import { AppError, notFound, requireAnyPermission, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { medicine, prescriptionItem, treatmentBookmark, treatmentBookmarkLine, user, visitInstruction } from '../db/schema.js';
import { localToday, visitOfBranch } from '../lib/clinic.js';
import { medicinesWithStock } from './pharmacy.js';
import { createDoses } from './treatments.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type LineInput = ReturnType<typeof bookmarkInputSchema.parse>['lines'][number];
const doer = alias(user, 'doer');

export function createBookmarkRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  // Whoever writes prescriptions makes and uses bookmarks; whoever manages settings can keep the list tidy too.
  const manage = requireAnyPermission('prescription.write', 'settings.manage');
  const prescribe = requirePermission('prescription.write');
  // Carrying an instruction out is the doctor's or the nurse's.
  const carryOut = requireAnyPermission('prescription.write', 'treatment.give');

  const inBranch = (branchId: number) => and(eq(treatmentBookmark.branchId, branchId), isNull(treatmentBookmark.deletedAt));

  /** The bookmarks of this branch (or one of them) with their lines; medicines carry today's stock. */
  async function bookmarksOf(branchId: number, id?: number): Promise<Bookmark[]> {
    const heads = await db
      .select({ id: treatmentBookmark.id, name: treatmentBookmark.name })
      .from(treatmentBookmark)
      .where(and(inBranch(branchId), id == null ? undefined : eq(treatmentBookmark.id, id)))
      .orderBy(asc(treatmentBookmark.name));
    if (!heads.length) return [];
    const rows = await db
      .select()
      .from(treatmentBookmarkLine)
      .where(and(eq(treatmentBookmarkLine.branchId, branchId), inArray(treatmentBookmarkLine.bookmarkId, heads.map((h) => h.id))))
      .orderBy(asc(treatmentBookmarkLine.sortOrder), asc(treatmentBookmarkLine.id));
    const stock = new Map((await medicinesWithStock(db, branchId, await localToday(db))).map((m) => [m.id, m]));
    const medIds = [...new Set(rows.flatMap((r) => (r.medicineId == null ? [] : [r.medicineId])))];
    // A medicine deleted since: its name still shows, marked as gone.
    const names = medIds.length ? await db.select({ id: medicine.id, name: medicine.name, strength: medicine.strength, form: medicine.form, pricePaise: medicine.pricePaise }).from(medicine).where(and(eq(medicine.branchId, branchId), inArray(medicine.id, medIds))) : [];
    const line = (r: (typeof rows)[number]): BookmarkLine => {
      if (r.kind === 'instruction') return { id: r.id, kind: 'instruction', text: r.text ?? '' };
      const m = names.find((x) => x.id === r.medicineId)!;
      const now = stock.get(r.medicineId!);
      return { id: r.id, kind: 'medicine', medicineId: m.id, medicineName: m.name, strength: m.strength, form: m.form, dose: r.dose ?? '', days: r.days ?? 1, quantity: r.quantity, instructions: r.instructions, givenHere: r.givenHere, pricePaise: m.pricePaise, stock: now?.stock ?? 0, available: !!now };
    };
    return heads.map((h) => ({ ...h, lines: rows.filter((r) => r.bookmarkId === h.id).map(line) }));
  }

  async function bookmarkOf(branchId: number, id: number): Promise<Bookmark> {
    if (!Number.isInteger(id)) throw notFound('Bookmark not found');
    const [b] = await bookmarksOf(branchId, id);
    if (!b) throw notFound('Bookmark not found');
    return b;
  }

  /** The lines of a bookmark as rows; every medicine must be one of this branch. */
  async function lineRows(tx: Tx, branchId: number, bookmarkId: number, lines: LineInput[]) {
    const medIds = [...new Set(lines.flatMap((l) => (l.kind === 'medicine' ? [l.medicineId] : [])))];
    if (medIds.length) {
      const found = await tx.select({ id: medicine.id }).from(medicine).where(and(eq(medicine.branchId, branchId), isNull(medicine.deletedAt), inArray(medicine.id, medIds)));
      if (found.length !== medIds.length) throw new AppError(400, 'validation', 'Choose medicines from this branch');
    }
    return lines.map((l, i) =>
      l.kind === 'medicine'
        ? { branchId, bookmarkId, kind: 'medicine' as const, medicineId: l.medicineId, dose: l.dose, days: l.days, quantity: l.quantity ?? null, instructions: l.instructions ?? null, givenHere: !!l.givenHere, sortOrder: i }
        : { branchId, bookmarkId, kind: 'instruction' as const, text: l.text, sortOrder: i },
    );
  }

  // ---------------------------------------------------------------- the bookmarks

  app.get('/bookmarks', manage, async (c) => c.json({ bookmarks: await bookmarksOf(c.get('branch').id) }));

  app.post('/bookmarks', manage, async (c) => {
    const parsed = bookmarkInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const id = await db.transaction(async (tx) => {
      const [row] = await tx.insert(treatmentBookmark).values({ branchId: b.id, name: parsed.data.name, createdBy: u.id }).returning({ id: treatmentBookmark.id });
      await tx.insert(treatmentBookmarkLine).values(await lineRows(tx, b.id, row.id, parsed.data.lines));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'treatment_bookmark', entityId: row.id, detail: { name: parsed.data.name, lines: parsed.data.lines.length } });
      return row.id;
    });
    return c.json({ bookmark: await bookmarkOf(b.id, id) }, 201);
  });

  /** The name and the whole list of lines. Visits it was already applied to keep what they got. */
  app.put('/bookmarks/:id', manage, async (c) => {
    const parsed = bookmarkInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const existing = await bookmarkOf(b.id, Number(c.req.param('id')));
    await db.transaction(async (tx) => {
      await tx.update(treatmentBookmark).set({ name: parsed.data.name, updatedAt: new Date().toISOString() }).where(eq(treatmentBookmark.id, existing.id));
      // Nothing points at a bookmark's lines (applying copies them), so the list is simply replaced.
      await tx.delete(treatmentBookmarkLine).where(and(eq(treatmentBookmarkLine.branchId, b.id), eq(treatmentBookmarkLine.bookmarkId, existing.id)));
      await tx.insert(treatmentBookmarkLine).values(await lineRows(tx, b.id, existing.id, parsed.data.lines));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'treatment_bookmark', entityId: existing.id, detail: { name: parsed.data.name, lines: parsed.data.lines.length } });
    });
    return c.json({ bookmark: await bookmarkOf(b.id, existing.id) });
  });

  app.delete('/bookmarks/:id', manage, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const existing = await bookmarkOf(b.id, Number(c.req.param('id')));
    await db.update(treatmentBookmark).set({ deletedAt: new Date().toISOString() }).where(eq(treatmentBookmark.id, existing.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'treatment_bookmark', entityId: existing.id, detail: { name: existing.name } });
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------- applying one to a visit

  /**
   * The ticked lines go onto the visit: medicines onto the prescription (exactly as if added one by one),
   * instructions onto the visit's checklist. All or nothing: a medicine with no stock refuses the whole lot.
   */
  app.post('/visits/:visitId/bookmarks/:id/apply', prescribe, async (c) => {
    const parsed = bookmarkApplySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    if (v.status === 'cancelled') throw new AppError(400, 'visit_cancelled', 'This visit was cancelled');
    if (v.status === 'completed') throw new AppError(409, 'bad_state', 'This visit is already completed');
    const bookmark = await bookmarkOf(b.id, Number(c.req.param('id')));
    // Each chosen line as the bookmark has it, with what the doctor changed for this patient on top.
    const asked = new Map(parsed.data.lines.map((l) => [l.id, l]));
    const chosen = bookmark.lines
      .filter((l) => asked.has(l.id))
      .map((l): typeof l => {
        const mine = asked.get(l.id)!;
        if (l.kind === 'instruction') return { ...l, text: mine.text ?? l.text };
        const dose = mine.dose ?? l.dose;
        const days = mine.days ?? l.days;
        // A changed dose or days without a quantity: the quantity follows them again.
        const quantity = mine.quantity !== undefined ? mine.quantity : dose === l.dose && days === l.days ? l.quantity : null;
        return { ...l, dose, days, quantity, instructions: mine.instructions !== undefined ? mine.instructions : l.instructions };
      });
    if (chosen.length !== asked.size) throw new AppError(409, 'changed', 'This bookmark was changed just now. Open it again.');
    const short = chosen.flatMap((l) => (l.kind === 'medicine' && (!l.available || l.stock === 0) ? [l.medicineName] : []));
    if (short.length) throw new AppError(409, 'out_of_stock', `Out of stock: ${short.join(', ')}. Untick it, or add stock in Inventory first.`);
    const medicines = chosen.flatMap((l) => (l.kind === 'medicine' ? [{ ...l, quantity: l.quantity ?? suggestedQuantity(l.dose, l.days) }] : []));
    const noQty = medicines.find((m) => !m.quantity);
    if (noQty) throw new AppError(400, 'validation', `${noQty.medicineName}: enter the quantity for the dose "${noQty.dose}".`);
    const today = await localToday(db);

    const added = await db.transaction(async (tx) => {
      for (const m of medicines) {
        const [item] = await tx
          .insert(prescriptionItem)
          .values({ branchId: b.id, visitId: v.id, medicineId: m.medicineId, dose: m.dose, days: m.days, quantity: m.quantity!, instructions: m.instructions, givenHere: m.givenHere, createdBy: u.id })
          .returning({ id: prescriptionItem.id });
        // Given in the hospital: one dose per time of day per day, from today, for the nurse to tick.
        if (m.givenHere) await createDoses(tx, b.id, { id: item.id, visitId: v.id, patientId: v.patientId, dose: m.dose, days: m.days }, today);
      }
      const instructions = chosen.flatMap((l) => (l.kind === 'instruction' ? [{ branchId: b.id, visitId: v.id, text: l.text, bookmarkName: bookmark.name, createdBy: u.id }] : []));
      if (instructions.length) await tx.insert(visitInstruction).values(instructions);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'apply', entity: 'treatment_bookmark', entityId: bookmark.id, detail: { visitId: v.id, name: bookmark.name, medicines: medicines.length, instructions: instructions.length } });
      return { medicines: medicines.length, instructions: instructions.length };
    });
    return c.json({ ok: true, name: bookmark.name, ...added }, 201);
  });

  // ---------------------------------------------------------------- the instructions of a visit

  async function instructionsOf(branchId: number, where: ReturnType<typeof and>): Promise<VisitInstruction[]> {
    return db
      .select({ id: visitInstruction.id, visitId: visitInstruction.visitId, text: visitInstruction.text, bookmarkName: visitInstruction.bookmarkName, doneAt: visitInstruction.doneAt, doneByName: doer.name })
      .from(visitInstruction)
      .leftJoin(doer, eq(doer.id, visitInstruction.doneBy))
      .where(and(eq(visitInstruction.branchId, branchId), isNull(visitInstruction.deletedAt), where))
      .orderBy(asc(visitInstruction.id));
  }
  async function instructionOf(branchId: number, id: number) {
    if (!Number.isInteger(id)) throw notFound('Instruction not found');
    const [i] = await instructionsOf(branchId, and(eq(visitInstruction.id, id)));
    if (!i) throw notFound('Instruction not found');
    return i;
  }

  app.get('/visits/:visitId/instructions', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    return c.json({ instructions: await instructionsOf(b.id, and(eq(visitInstruction.visitId, v.id))) });
  });

  /** Tick an instruction as carried out (who and when), or take the tick back. */
  for (const action of ['done', 'undo'] as const) {
    app.post(`/visit-instructions/:id/${action}`, carryOut, async (c) => {
      const b = c.get('branch');
      const u = c.get('user');
      const i = await instructionOf(b.id, Number(c.req.param('id')));
      if (action === 'done' && i.doneAt) throw new AppError(409, 'bad_state', `Already confirmed by ${i.doneByName ?? 'someone'}`);
      const now = new Date().toISOString();
      await db
        .update(visitInstruction)
        .set(action === 'done' ? { doneAt: now, doneBy: u.id, updatedAt: now } : { doneAt: null, doneBy: null, updatedAt: now })
        .where(eq(visitInstruction.id, i.id));
      await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action, entity: 'visit_instruction', entityId: i.id, detail: { visitId: i.visitId, text: i.text } });
      return c.json({ instruction: await instructionOf(b.id, i.id) });
    });
  }

  /** Take an instruction off the visit: only one not carried out yet. */
  app.delete('/visit-instructions/:id', prescribe, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const i = await instructionOf(b.id, Number(c.req.param('id')));
    if (i.doneAt) throw new AppError(409, 'bad_state', 'This instruction is already confirmed as done; it stays on record.');
    await db.update(visitInstruction).set({ deletedAt: new Date().toISOString() }).where(eq(visitInstruction.id, i.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'visit_instruction', entityId: i.id, detail: { visitId: i.visitId, text: i.text } });
    return c.json({ ok: true });
  });

  return app;
}
