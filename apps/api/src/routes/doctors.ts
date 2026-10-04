// Who sees patients in a branch. Role = what you may open; "is a doctor" = you see patients.
// A doctor is a staff member with the Doctor role, or anyone ticked in Settings → Doctors
// (the owner, a branch admin...). Each branch also has a default doctor for new OP visits.
import { and, eq, isNotNull, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { doctorSettingsSchema, type Doctor, type DoctorSettings, type DoctorSettingsPerson, type DoctorsResponse, type Permission } from '@platform/shared';
import { AppError, permissionsForRole, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { branch, branchDoctor, branchMember, clinicSetting, role, user } from '../db/schema.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * THE list of a branch's doctors, by name: active staff with the Doctor role, plus the people ticked in
 * Settings → Doctors (branch_doctor) who are active and can still open the branch (the organization's
 * owner, or an active member). Everything that lists or checks doctors uses this.
 */
export async function doctorsOf(db: Db | Tx, branchId: number): Promise<Doctor[]> {
  const byRole = await db
    .select({ userId: user.id, name: user.name })
    .from(branchMember)
    .innerJoin(user, eq(user.id, branchMember.userId))
    .innerJoin(role, eq(role.id, branchMember.roleId))
    .where(and(eq(branchMember.branchId, branchId), eq(branchMember.isActive, true), eq(user.isActive, true), eq(role.key, 'doctor')));
  const ticked = await db
    .select({ userId: user.id, name: user.name })
    .from(branchDoctor)
    .innerJoin(branch, eq(branch.id, branchDoctor.branchId))
    .innerJoin(user, and(eq(user.id, branchDoctor.userId), eq(user.organizationId, branch.organizationId)))
    .leftJoin(branchMember, and(eq(branchMember.branchId, branchDoctor.branchId), eq(branchMember.userId, branchDoctor.userId), eq(branchMember.isActive, true)))
    .where(and(eq(branchDoctor.branchId, branchId), eq(user.isActive, true), or(eq(user.isOwner, true), isNotNull(branchMember.id))));
  const all = new Map([...byRole, ...ticked].map((d) => [d.userId, d]));
  return [...all.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The doctor new OP visits go to. null when not set, or when that person is no longer a doctor of this branch. */
export async function defaultDoctorOf(db: Db | Tx, branchId: number, doctors?: Doctor[]): Promise<number | null> {
  const [s] = await db.select({ id: clinicSetting.defaultDoctorUserId }).from(clinicSetting).where(eq(clinicSetting.branchId, branchId));
  if (s?.id == null) return null;
  return (doctors ?? (await doctorsOf(db, branchId))).some((d) => d.userId === s.id) ? s.id : null;
}

export function createDoctorRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  const manage = requirePermission('settings.manage');

  /** Everyone who can open this branch (owner + active members), with what the tick boxes need. */
  async function settingsOf(organizationId: number, branchId: number): Promise<DoctorSettings> {
    const owners = await db
      .select({ userId: user.id, name: user.name })
      .from(user)
      .where(and(eq(user.organizationId, organizationId), eq(user.isOwner, true), eq(user.isActive, true)));
    const members = await db
      .select({ userId: user.id, name: user.name, roleId: role.id, roleKey: role.key, roleName: role.name })
      .from(branchMember)
      .innerJoin(user, eq(user.id, branchMember.userId))
      .innerJoin(role, eq(role.id, branchMember.roleId))
      .where(and(eq(branchMember.branchId, branchId), eq(branchMember.isActive, true), eq(user.isActive, true), eq(user.organizationId, organizationId), eq(user.isOwner, false)));
    const doctors = await doctorsOf(db, branchId);
    const isDoctor = (userId: number) => doctors.some((d) => d.userId === userId);
    const byRole = new Map<number, Permission[]>();
    for (const m of members) if (!byRole.has(m.roleId)) byRole.set(m.roleId, await permissionsForRole(db, m.roleId));

    const people: DoctorSettingsPerson[] = [
      ...owners.map((o) => ({ ...o, roleName: 'Owner', isOwner: true, isDoctorRole: false, isDoctor: isDoctor(o.userId), canPrescribe: true })),
      ...members.map((m) => ({
        userId: m.userId,
        name: m.name,
        roleName: m.roleName,
        isOwner: false,
        isDoctorRole: m.roleKey === 'doctor',
        isDoctor: isDoctor(m.userId),
        canPrescribe: byRole.get(m.roleId)!.includes('prescription.write'),
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
    return { people, defaultDoctorUserId: await defaultDoctorOf(db, branchId, doctors) };
  }

  app.get('/doctors', requirePermission('patient.view'), async (c) => {
    const doctors = await doctorsOf(db, c.get('branch').id);
    const res: DoctorsResponse = { doctors, defaultDoctorUserId: await defaultDoctorOf(db, c.get('branch').id, doctors) };
    return c.json(res);
  });

  app.get('/doctor-settings', manage, async (c) => c.json(await settingsOf(c.get('user').organizationId, c.get('branch').id)));

  /** Replace the ticks and the default doctor of this branch. */
  app.put('/doctor-settings', manage, async (c) => {
    const parsed = doctorSettingsSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const { people } = await settingsOf(u.organizationId, b.id);

    // Doctor-role staff are doctors anyway: no row for them.
    const ticked: number[] = [];
    for (const id of new Set(parsed.data.doctorUserIds)) {
      const p = people.find((x) => x.userId === id);
      // Another organization's user, or someone who can't open this branch, is the same as an unknown id.
      if (!p) throw new AppError(400, 'validation', 'Choose people who work in this branch', { doctorUserIds: ['Choose people who work in this branch'] });
      if (p.isDoctorRole) continue;
      if (!p.canPrescribe) {
        const message = `${p.name} can't write prescriptions here (role: ${p.roleName}), so can't be a doctor`;
        throw new AppError(400, 'validation', message, { doctorUserIds: [message] });
      }
      ticked.push(id);
    }
    const defaultDoctorUserId = parsed.data.defaultDoctorUserId;

    await db.transaction(async (tx) => {
      await tx.delete(branchDoctor).where(eq(branchDoctor.branchId, b.id));
      if (ticked.length) await tx.insert(branchDoctor).values(ticked.map((userId) => ({ branchId: b.id, userId })));
      // Checked against the doctors as they are AFTER this change; throwing rolls the ticks back too.
      if (defaultDoctorUserId != null && !(await doctorsOf(tx, b.id)).some((d) => d.userId === defaultDoctorUserId)) {
        throw new AppError(400, 'validation', 'The default doctor must be one of the doctors of this branch', { defaultDoctorUserId: ['Choose one of the doctors of this branch'] });
      }
      await tx
        .insert(clinicSetting)
        .values({ branchId: b.id, defaultDoctorUserId })
        .onConflictDoUpdate({ target: clinicSetting.branchId, set: { defaultDoctorUserId, updatedAt: new Date().toISOString() } });
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'doctor_settings', entityId: b.id, detail: { doctorUserIds: ticked, defaultDoctorUserId } });
    });
    return c.json(await settingsOf(u.organizationId, b.id));
  });

  return app;
}
