import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { patientInputSchema, type Patient } from '@platform/shared';
import { AppError, idPrefixFor, notFound, nextOrgNumber, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { organization, patient } from '../db/schema.js';

const columns = {
  id: patient.id,
  uhid: patient.uhid,
  name: patient.name,
  phone: patient.phone,
  email: patient.email,
  gender: patient.gender,
  dob: patient.dob,
  ageYears: patient.ageYears,
  bloodGroup: patient.bloodGroup,
  weightKg: patient.weightKg,
  address: patient.address,
  conditions: patient.conditions,
  emergencyContactName: patient.emergencyContactName,
  emergencyContactPhone: patient.emergencyContactPhone,
  createdAt: patient.createdAt,
  updatedAt: patient.updatedAt,
};

export function createPatientRoutes(db: Db) {
  const app = new Hono<BranchEnv>();

  // Every query below starts from this: this branch's patients that aren't deleted.
  const inBranch = (branchId: number) => and(eq(patient.branchId, branchId), isNull(patient.deletedAt));

  async function findOne(branchId: number, id: number): Promise<Patient> {
    if (!Number.isInteger(id)) throw notFound('Patient not found');
    const [row] = await db.select(columns).from(patient).where(and(inBranch(branchId), eq(patient.id, id))).limit(1);
    if (!row) throw notFound('Patient not found');
    return row;
  }

  app.get('/', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const q = (c.req.query('q') ?? '').trim().toLowerCase();
    const limit = Math.min(Math.max(Number(c.req.query('limit')) || 50, 1), 200);
    const offset = Math.max(Number(c.req.query('offset')) || 0, 0);
    // instr() instead of LIKE so typed % or _ are just characters.
    const match = q
      ? sql`(instr(lower(${patient.name}), ${q}) > 0 OR instr(lower(${patient.uhid}), ${q}) > 0 OR instr(coalesce(${patient.phone}, ''), ${q.replace(/\D/g, '') || q}) > 0)`
      : undefined;
    const gender = c.req.query('gender');
    const genderMatch = gender === 'female' || gender === 'male' || gender === 'other' ? eq(patient.gender, gender) : undefined;
    const where = and(inBranch(b.id), match, genderMatch);
    const rows = await db.select(columns).from(patient).where(where).orderBy(desc(patient.id)).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(patient).where(where);
    return c.json({ patients: rows, total });
  });

  app.get('/:id', requirePermission('patient.view'), async (c) => {
    return c.json({ patient: await findOne(c.get('branch').id, Number(c.req.param('id'))) });
  });

  app.post('/', requirePermission('patient.create'), async (c) => {
    const parsed = patientInputSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');

    const created = await db.transaction(async (tx) => {
      // UHID: organization prefix + a number that never repeats in any branch, e.g. AH000001.
      const [org] = await tx.select({ name: organization.name, idPrefix: organization.idPrefix }).from(organization).where(eq(organization.id, u.organizationId));
      const n = await nextOrgNumber(tx, u.organizationId, 'uhid');
      const uhid = `${idPrefixFor(org)}${String(n).padStart(6, '0')}`;
      const [row] = await tx
        .insert(patient)
        .values({ ...parsed.data, branchId: b.id, uhid, createdBy: u.id })
        .returning(columns);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'patient', entityId: row.id, detail: parsed.data });
      return row;
    });
    return c.json({ patient: created }, 201);
  });

  app.patch('/:id', requirePermission('patient.edit'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const id = Number(c.req.param('id'));
    await findOne(b.id, id);
    const parsed = patientInputSchema.partial().safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw validationError(parsed.error);
    if (Object.keys(parsed.data).length === 0) throw new AppError(400, 'validation', 'Nothing to change');

    const [row] = await db
      .update(patient)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(and(inBranch(b.id), eq(patient.id, id)))
      .returning(columns);
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'patient', entityId: id, detail: parsed.data });
    return c.json({ patient: row });
  });

  // Soft delete: the record stays in the database for the audit trail.
  app.delete('/:id', requirePermission('patient.delete'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const id = Number(c.req.param('id'));
    await findOne(b.id, id);
    await db.update(patient).set({ deletedAt: new Date().toISOString() }).where(and(inBranch(b.id), eq(patient.id, id)));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'patient', entityId: id });
    return c.json({ ok: true });
  });

  return app;
}
