import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { auditLog, branchDoctor, clinicSetting, organization, user } from '../src/db/schema.js';
import journal from '../drizzle/meta/_journal.json';
import { M, setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;

const names = async (caller: Caller, branch = 'main') => (await (await caller(`/api/b/${branch}/doctors`)).json()).doctors.map((d: any) => d.name);
const settings = async (caller: Caller, branch = 'main') => (await caller(`/api/b/${branch}/doctor-settings`)).json();
const save = (caller: Caller, doctorUserIds: number[], defaultDoctorUserId: number | null = null, branch = 'main') =>
  caller(`/api/b/${branch}/doctor-settings`, { method: 'PUT', body: { doctorUserIds, defaultDoctorUserId } });
const idOf = async (username: string) => (await t.db.select({ id: user.id }).from(user).where(eq(user.mobile, M(username))))[0]!.id;
const ticks = () => t.db.select({ branchId: branchDoctor.branchId, userId: branchDoctor.userId }).from(branchDoctor);
const settingAudits = async () => (await t.db.select().from(auditLog)).filter((a) => a.entity === 'doctor_settings');

async function patientIn(caller: Caller, branch: string, name: string) {
  return (await (await caller(`/api/b/${branch}/patients`, { method: 'POST', body: { name } })).json()).patient;
}
const startVisit = (caller: Caller, patientId: number, body: unknown, branch = 'main') => caller(`/api/b/${branch}/patients/${patientId}/visits`, { method: 'POST', body });

/** The owner adds a branch admin to main; returns their id and a signed-in caller. */
async function addAdmin(owner: Caller) {
  const { roles } = await (await owner('/api/b/main/roles')).json();
  const res = await owner('/api/b/main/staff', { method: 'POST', body: { name: 'Admin Anu', mobile: M('badmin'), password: 'badmin-pass-1', roleId: roles.find((r: any) => r.key === 'branch_admin').id } });
  return { adminId: (await res.json()).userId as number, admin: await t.as('badmin', 'badmin-pass-1') };
}

describe('doctors of a branch', () => {
  it('the migration added the table and the column (applied on top of the existing ones)', async () => {
    const applied = await t.db.get<{ n: number }>(sql`select count(*) as n from __drizzle_migrations`);
    expect(applied!.n).toBe(journal.entries.length);
    expect(journal.entries.map((e) => e.tag)).toContain('0008_branch_doctors');
    expect(await t.db.get(sql`select name from sqlite_master where type = 'table' and name = 'branch_doctor'`)).toBeTruthy();
    const cols = await t.db.all<{ name: string; notnull: number }>(sql`pragma table_info(clinic_setting)`);
    expect(cols.find((c) => c.name === 'default_doctor_user_id')).toMatchObject({ notnull: 0 });
  });

  it('Doctor-role staff are doctors without any tick; the settings list shows who can be ticked', async () => {
    const owner = await t.as('owner');
    expect(await (await owner('/api/b/main/doctors')).json()).toEqual({ doctors: [{ userId: await idOf('doc'), name: 'doc' }], defaultDoctorUserId: null });
    expect(await ticks()).toEqual([]);

    const s = await settings(owner);
    expect(s.defaultDoctorUserId).toBeNull();
    const by = Object.fromEntries(s.people.map((p: any) => [p.name, p]));
    expect(Object.keys(by).sort()).toEqual(['Owner', 'desk', 'doc', 'labtech', 'nurse', 'pharm']); // eastdesk works in east only
    expect(by.doc).toMatchObject({ roleName: 'Doctor', isOwner: false, isDoctorRole: true, isDoctor: true, canPrescribe: true });
    expect(by.Owner).toMatchObject({ roleName: 'Owner', isOwner: true, isDoctorRole: false, isDoctor: false, canPrescribe: true });
    expect(by.desk).toMatchObject({ roleName: 'Front desk', isDoctorRole: false, isDoctor: false, canPrescribe: false });
  });

  it('the owner ticked as a doctor is listed, can be given a visit, and the doctor filter finds it', async () => {
    const owner = await t.as('owner');
    const ownerId = await idOf('owner');
    const docId = await idOf('doc');
    // The Doctor-role id is accepted but needs no row.
    const res = await save(owner, [ownerId, docId, ownerId]);
    expect(res.status).toBe(200);
    const saved = await res.json();
    expect(saved).toEqual(await settings(owner));
    expect(saved.people.find((p: any) => p.userId === ownerId).isDoctor).toBe(true);
    expect(await ticks()).toEqual([{ branchId: t.main.id, userId: ownerId }]);
    expect(await names(owner)).toEqual(['doc', 'Owner']);

    const [audit] = await settingAudits();
    expect(audit).toMatchObject({ action: 'update', branchId: t.main.id, userId: ownerId, entityId: String(t.main.id) });
    expect(JSON.parse(audit.detail!)).toEqual({ doctorUserIds: [ownerId], defaultDoctorUserId: null });

    const p = await patientIn(owner, 'main', 'Ravi Kumar');
    const mine = await startVisit(owner, p.id, { doctorUserId: ownerId });
    expect(mine.status).toBe(201);
    expect((await mine.json()).visit).toMatchObject({ doctorUserId: ownerId, doctorName: 'Owner' });
    await startVisit(owner, p.id, { doctorUserId: docId });
    const list = await (await owner(`/api/b/main/visits?doctor=${ownerId}`)).json();
    expect(list.visits.map((v: any) => v.doctorName)).toEqual(['Owner']);
  });

  it('a branch admin ticked as a doctor works the same, and can tick themselves', async () => {
    const owner = await t.as('owner');
    const { admin, adminId } = await addAdmin(owner);
    expect((await save(admin, [adminId])).status).toBe(200);
    expect(await names(owner)).toEqual(['Admin Anu', 'doc']);

    const p = await patientIn(owner, 'main', 'Ravi Kumar');
    const { visit } = await (await startVisit(admin, p.id, { doctorUserId: adminId })).json();
    expect(visit.doctorName).toBe('Admin Anu');
    expect((await (await admin(`/api/b/main/visits?doctor=${adminId}`)).json()).visits.map((v: any) => v.id)).toEqual([visit.id]);
    // An existing visit can be moved to them too.
    const other = (await (await startVisit(owner, p.id, {})).json()).visit;
    expect((await (await owner(`/api/b/main/visits/${other.id}`, { method: 'PATCH', body: { doctorUserId: adminId } })).json()).visit.doctorName).toBe('Admin Anu');
  });

  it('a role without prescription.write cannot be ticked: field error, nothing saved', async () => {
    const owner = await t.as('owner');
    const ownerId = await idOf('owner');
    const res = await save(owner, [ownerId, await idOf('desk')], ownerId);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('validation');
    expect(body.fields.doctorUserIds).toBeTruthy();
    expect(await ticks()).toEqual([]);
    expect(await t.db.select().from(clinicSetting)).toEqual([]);
    expect(await settingAudits()).toEqual([]);
    expect(await names(owner)).toEqual(['doc']);
  });

  it('ticks are per branch; people from outside the branch or organization are rejected like an unknown id', async () => {
    const owner = await t.as('owner');
    const ownerId = await idOf('owner');
    expect((await save(owner, [ownerId], ownerId)).status).toBe(200);

    // main's ticks and default do not exist in east.
    expect(await (await owner('/api/b/east/doctors')).json()).toEqual({ doctors: [], defaultDoctorUserId: null });
    const east = await settings(owner, 'east');
    expect(east.defaultDoctorUserId).toBeNull();
    expect(east.people.map((p: any) => [p.name, p.isDoctor])).toEqual([
      ['eastdesk', false],
      ['Owner', false],
    ]);
    const ep = await patientIn(owner, 'east', 'Muthu Selvam');
    const refused = await startVisit(owner, ep.id, { doctorUserId: ownerId }, 'east');
    expect(refused.status).toBe(400);
    expect((await refused.json()).fields.doctorUserId).toBeTruthy();
    expect((await (await startVisit(owner, ep.id, {}, 'east')).json()).visit.doctorUserId).toBeNull();

    // Saving in east leaves main alone.
    expect((await save(owner, [], null, 'east')).status).toBe(200);
    expect(await ticks()).toEqual([{ branchId: t.main.id, userId: ownerId }]);
    expect((await (await owner('/api/b/main/doctors')).json()).defaultDoctorUserId).toBe(ownerId);

    // Someone from another organization, someone who only works in east, and an id that does not exist: all the same answer.
    const [otherOrg] = await t.db.insert(organization).values({ name: 'Other Hospital' }).returning();
    const [stranger] = await t.db.insert(user).values({ organizationId: otherOrg.id, username: M('stranger'), mobile: M('stranger'), name: 'Stranger', passwordHash: 'x', isOwner: true }).returning();
    const unknown = await (await save(owner, [ownerId, 999_999], ownerId)).json();
    for (const id of [stranger.id, await idOf('eastdesk')]) {
      const res = await save(owner, [ownerId, id], ownerId);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual(unknown);
      const asDefault = await save(owner, [ownerId], id);
      expect(asDefault.status).toBe(400);
      expect((await asDefault.json()).fields.defaultDoctorUserId).toBeTruthy();
    }
    expect(unknown.fields.doctorUserIds).toBeTruthy();
    expect(await ticks()).toEqual([{ branchId: t.main.id, userId: ownerId }]);

    // A tick row that should never exist (another organization's owner) still does not make a doctor.
    await t.db.insert(branchDoctor).values({ branchId: t.main.id, userId: stranger.id });
    expect(await names(owner)).toEqual(['doc', 'Owner']);
  });

  it('settings need settings.manage (403) and membership of the branch (404)', async () => {
    const doc = await t.as('doc');
    const eastdesk = await t.as('eastdesk');
    const docId = await idOf('doc');
    expect((await doc('/api/b/main/doctors')).status).toBe(200); // the list itself only needs patient.view
    expect((await doc('/api/b/main/doctor-settings')).status).toBe(403);
    expect((await save(doc, [], docId)).status).toBe(403);
    expect((await eastdesk('/api/b/main/doctor-settings')).status).toBe(404);
    expect((await save(eastdesk, [], docId)).status).toBe(404);
    expect((await eastdesk('/api/b/main/doctors')).status).toBe(404);
    expect((await eastdesk('/api/b/east/doctor-settings')).status).toBe(403); // a member there, but front desk
    expect(await t.db.select().from(clinicSetting)).toEqual([]);
  });
});

describe('default doctor', () => {
  it('must be a doctor of the branch after the change', async () => {
    const owner = await t.as('owner');
    const ownerId = await idOf('owner');
    const notDoctor = await save(owner, [], ownerId);
    expect(notDoctor.status).toBe(400);
    expect((await notDoctor.json()).fields.defaultDoctorUserId).toBeTruthy();
    expect(await t.db.select().from(clinicSetting)).toEqual([]);

    // Ticked and made default in one save; a Doctor-role member can be the default without a tick.
    expect((await (await save(owner, [ownerId], ownerId)).json()).defaultDoctorUserId).toBe(ownerId);
    expect((await (await save(owner, [ownerId], await idOf('doc'))).json()).defaultDoctorUserId).toBe(await idOf('doc'));

    // Unticking the default doctor while keeping them as default is refused, and the tick stays.
    await save(owner, [ownerId], ownerId);
    const untick = await save(owner, [], ownerId);
    expect(untick.status).toBe(400);
    expect((await untick.json()).fields.defaultDoctorUserId).toBeTruthy();
    expect(await ticks()).toEqual([{ branchId: t.main.id, userId: ownerId }]);
    expect((await settings(owner)).defaultDoctorUserId).toBe(ownerId);
  });

  it('a new visit gets the default when no doctor is sent; null means none; another doctor wins', async () => {
    const owner = await t.as('owner');
    const ownerId = await idOf('owner');
    const docId = await idOf('doc');
    // The consultation fee lives in the same settings row: saving one must not wipe the other.
    await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 30_000 } });
    await save(owner, [ownerId], ownerId);
    await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 35_000 } });
    expect((await (await owner('/api/b/main/billing/settings')).json()).consultationFeePaise).toBe(35_000);
    expect((await (await owner('/api/b/main/doctors')).json()).defaultDoctorUserId).toBe(ownerId);

    const p = await patientIn(owner, 'main', 'Ravi Kumar');
    const doctorOf = async (body: unknown) => (await (await startVisit(owner, p.id, body)).json()).visit.doctorUserId;
    expect(await doctorOf({ complaint: 'Fever' })).toBe(ownerId);
    expect(await doctorOf({ doctorUserId: null })).toBeNull();
    expect(await doctorOf({ doctorUserId: docId })).toBe(docId);

    // Editing never applies the default.
    const { visit } = await (await startVisit(owner, p.id, { doctorUserId: null })).json();
    expect((await (await owner(`/api/b/main/visits/${visit.id}`, { method: 'PATCH', body: { pulse: 80 } })).json()).visit.doctorUserId).toBeNull();
  });

  it('unticking the default doctor clears the default; new visits then get no doctor', async () => {
    const owner = await t.as('owner');
    const ownerId = await idOf('owner');
    await save(owner, [ownerId], ownerId);
    const p = await patientIn(owner, 'main', 'Ravi Kumar');

    expect((await (await save(owner, [], null)).json()).defaultDoctorUserId).toBeNull();
    expect(await (await owner('/api/b/main/doctors')).json()).toMatchObject({ defaultDoctorUserId: null });
    expect((await (await startVisit(owner, p.id, {})).json()).visit.doctorUserId).toBeNull();

    // A stored default whose tick is gone (not reachable through the API) is ignored, never an error.
    await save(owner, [ownerId], ownerId);
    await t.db.delete(branchDoctor);
    expect((await t.db.select().from(clinicSetting))[0]!.defaultDoctorUserId).toBe(ownerId);
    expect(await (await owner('/api/b/main/doctors')).json()).toMatchObject({ defaultDoctorUserId: null });
    expect((await settings(owner)).defaultDoctorUserId).toBeNull();
    const res = await startVisit(owner, p.id, {});
    expect(res.status).toBe(201);
    expect((await res.json()).visit.doctorUserId).toBeNull();
  });

  it('a default doctor who stops being a doctor (role changed, removed from the branch) is treated as not set', async () => {
    const owner = await t.as('owner');
    const docId = await idOf('doc');
    const { adminId } = await addAdmin(owner);
    const p = await patientIn(owner, 'main', 'Ravi Kumar');
    const effective = async () => (await (await owner('/api/b/main/doctors')).json()).defaultDoctorUserId;

    // Doctor role -> front desk.
    await save(owner, [], docId);
    expect(await effective()).toBe(docId);
    const { roles } = await (await owner('/api/b/main/roles')).json();
    await owner(`/api/b/main/staff/${docId}`, { method: 'PATCH', body: { roleId: roles.find((r: any) => r.key === 'front_desk').id } });
    expect(await effective()).toBeNull();
    expect(await names(owner)).toEqual([]);
    expect((await (await startVisit(owner, p.id, {})).json()).visit.doctorUserId).toBeNull();

    // A ticked branch admin removed from the branch.
    await save(owner, [adminId], adminId);
    expect(await effective()).toBe(adminId);
    await owner(`/api/b/main/staff/${adminId}`, { method: 'DELETE' });
    expect(await effective()).toBeNull();
    expect(await names(owner)).toEqual([]);
    expect((await (await startVisit(owner, p.id, {})).json()).visit.doctorUserId).toBeNull();
  });

  it('a deactivated ticked user is no longer a doctor', async () => {
    const owner = await t.as('owner');
    const { adminId } = await addAdmin(owner);
    await save(owner, [adminId], adminId);
    expect(await names(owner)).toEqual(['Admin Anu', 'doc']);

    expect((await owner(`/api/b/main/staff/${adminId}/deactivate`, { method: 'POST' })).status).toBe(200);
    expect(await (await owner('/api/b/main/doctors')).json()).toMatchObject({ doctors: [{ name: 'doc' }], defaultDoctorUserId: null });
    expect((await settings(owner)).people.map((p: any) => p.name)).not.toContain('Admin Anu');
    const p = await patientIn(owner, 'main', 'Ravi Kumar');
    const refused = await startVisit(owner, p.id, { doctorUserId: adminId });
    expect(refused.status).toBe(400);
    expect((await refused.json()).fields.doctorUserId).toBeTruthy();
    expect((await (await startVisit(owner, p.id, {})).json()).visit.doctorUserId).toBeNull();

    // Activated again: the tick was kept, so they are a doctor (and the default) again.
    await owner(`/api/b/main/staff/${adminId}/activate`, { method: 'POST' });
    expect((await (await owner('/api/b/main/doctors')).json()).defaultDoctorUserId).toBe(adminId);
  });
});
