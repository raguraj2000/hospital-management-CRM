import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auditLog, branchMember } from '../src/db/schema.js';
import { M, setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const login = (username: string, password: string) =>
  t.app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: M(username), password }) });

async function roleId(caller: Awaited<ReturnType<typeof t.as>>, key: string, branch = 'main') {
  const { roles } = await (await caller(`/api/b/${branch}/roles`)).json();
  return roles.find((r: any) => r.key === key).id as number;
}

describe('staff (per branch)', () => {
  it('needs users.manage — and the guard does NOT leak onto other branch routes', async () => {
    const doc = await t.as('doc');
    expect((await doc('/api/b/main/staff')).status).toBe(403);
    expect((await doc('/api/b/main/patients')).status).toBe(200); // regression: must stay reachable
    expect((await doc('/api/b/main/visits')).status).toBe(200);
  });

  it('owner adds a staff member who can then sign in to that branch only', async () => {
    const owner = await t.as('owner');
    const res = await owner('/api/b/main/staff', {
      method: 'POST',
      body: { name: 'Kavya R', mobile: M('Kavya'), password: 'kavya-pass-1', roleId: await roleId(owner, 'front_desk') },
    });
    expect(res.status).toBe(201);
    const me = await (await login('kavya', 'kavya-pass-1')).json();
    expect(me.branches.map((b: any) => [b.slug, b.roleName])).toEqual([['main', 'Front desk']]);
    const list = await (await owner('/api/b/main/staff')).json();
    expect(list.staff.map((s: any) => s.mobile)).toContain(M('kavya'));

    const dup = await owner('/api/b/main/staff', { method: 'POST', body: { name: 'Other', mobile: M('kavya'), password: 'another-pass', roleId: await roleId(owner, 'doctor') } });
    expect(dup.status).toBe(409);
    expect((await dup.json()).fields.mobile).toBeTruthy();
  });

  it('a branch admin manages staff in their branch only, never themselves or the owner', async () => {
    const owner = await t.as('owner');
    await owner('/api/b/main/staff', { method: 'POST', body: { name: 'Branch Admin', mobile: M('badmin'), password: 'badmin-pass-1', roleId: await roleId(owner, 'branch_admin') } });
    const admin = await t.as('badmin', 'badmin-pass-1');
    expect((await admin('/api/b/main/staff')).status).toBe(200);
    expect((await admin('/api/b/east/staff')).status).toBe(404); // not a member of east
    const { staff } = await (await admin('/api/b/main/staff')).json();
    const self = staff.find((s: any) => s.mobile === M('badmin'));
    expect((await admin(`/api/b/main/staff/${self.userId}`, { method: 'PATCH', body: { roleId: self.roleId } })).status).toBe(400);
    const ownerId = (await (await owner('/api/auth/me')).json()).user.id;
    expect((await admin(`/api/b/main/staff/${ownerId}/reset-password`, { method: 'POST', body: { password: 'hijack-pass' } })).status).toBe(404);
    expect((await admin('/api/org/branches')).status).toBe(403); // owner-only area
  });

  it('a branch admin cannot reset or rename someone who also works in another branch', async () => {
    const owner = await t.as('owner');
    await owner('/api/b/main/staff', { method: 'POST', body: { name: 'Main Admin', mobile: M('mainadmin'), password: 'mainadmin-pass', roleId: await roleId(owner, 'branch_admin') } });
    // "doc" works in main; the owner also gives them a role in east.
    const { staff } = await (await owner('/api/b/main/staff')).json();
    const docId = staff.find((s: any) => s.mobile === M('doc')).userId;
    await t.db.insert(branchMember).values({ branchId: t.east.id, userId: docId, roleId: await roleId(owner, 'doctor') });

    const admin = await t.as('mainadmin', 'mainadmin-pass');
    const reset = await admin(`/api/b/main/staff/${docId}/reset-password`, { method: 'POST', body: { password: 'taken-over-1' } });
    expect(reset.status).toBe(403);
    expect((await reset.json()).code).toBe('other_branch');
    expect((await admin(`/api/b/main/staff/${docId}`, { method: 'PATCH', body: { name: 'Renamed' } })).status).toBe(403);
    expect((await login('doc', 'taken-over-1')).status).toBe(401); // password unchanged
    // The owner can.
    expect((await owner(`/api/b/main/staff/${docId}/reset-password`, { method: 'POST', body: { password: 'owner-set-1' } })).status).toBe(200);
  });

  it('role change applies on the next request', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    expect((await doc('/api/b/main/staff')).status).toBe(403);
    const { staff } = await (await owner('/api/b/main/staff')).json();
    const docId = staff.find((s: any) => s.mobile === M('doc')).userId;
    await owner(`/api/b/main/staff/${docId}`, { method: 'PATCH', body: { roleId: await roleId(owner, 'branch_admin') } });
    expect((await doc('/api/b/main/staff')).status).toBe(200);
  });

  it('reset password signs the person out and the new password works', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const { staff } = await (await owner('/api/b/main/staff')).json();
    const docId = staff.find((s: any) => s.mobile === M('doc')).userId;
    expect((await owner(`/api/b/main/staff/${docId}/reset-password`, { method: 'POST', body: { password: 'short' } })).status).toBe(400);
    expect((await owner(`/api/b/main/staff/${docId}/reset-password`, { method: 'POST', body: { password: 'brand-new-pass' } })).status).toBe(200);
    expect((await doc('/api/auth/me')).status).toBe(401);
    expect((await login('doc', 'doc-pass-123')).status).toBe(401);
    expect((await login('doc', 'brand-new-pass')).status).toBe(200);
  });

  it('removing from the only branch signs them out and closes the branch', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const { staff } = await (await owner('/api/b/main/staff')).json();
    const docId = staff.find((s: any) => s.mobile === M('doc')).userId;
    expect((await owner(`/api/b/main/staff/${docId}`, { method: 'DELETE' })).status).toBe(200);
    expect((await doc('/api/auth/me')).status).toBe(401);
    const again = await t.as('doc');
    expect((await again('/api/b/main/patients')).status).toBe(404);
    expect((await (await again('/api/auth/me')).json()).branches).toEqual([]);
  });
});

describe('my password', () => {
  it('needs the current password; other sessions end, this one stays', async () => {
    const phone = await t.as('doc');
    const desk = await t.as('doc');
    expect((await desk('/api/auth/password', { method: 'POST', body: { currentPassword: 'wrong', newPassword: 'new-pass-123' } })).status).toBe(400);
    expect((await desk('/api/auth/password', { method: 'POST', body: { currentPassword: 'doc-pass-123', newPassword: 'new-pass-123' } })).status).toBe(200);
    expect((await desk('/api/auth/me')).status).toBe(200);
    expect((await phone('/api/auth/me')).status).toBe(401);
    expect((await login('doc', 'new-pass-123')).status).toBe(200);
  });
});

describe('organization (owner only)', () => {
  it('adds a branch the owner can open right away; duplicate address refused', async () => {
    const owner = await t.as('owner');
    const res = await owner('/api/org/branches', { method: 'POST', body: { name: 'West branch', slug: 'west', phone: '0421 2345678' } });
    expect(res.status).toBe(201);
    expect((await owner('/api/b/west/patients')).status).toBe(200);
    expect((await owner('/api/org/branches', { method: 'POST', body: { name: 'West again', slug: 'west' } })).status).toBe(409);
    const { branches } = await (await owner('/api/org/branches')).json();
    expect(branches.map((b: any) => b.slug)).toEqual(['main', 'east', 'west']);
    expect((await owner(`/api/org/branches/${branches[2].id}`, { method: 'PATCH', body: { name: 'West wing' } })).status).toBe(200);
  });

  it('editing a role changes what its staff can do; staff cannot edit roles', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    expect((await doc('/api/org/roles')).status).toBe(403);
    const { roles } = await (await owner('/api/org/roles')).json();
    const doctor = roles.find((r: any) => r.key === 'doctor');
    expect((await doc('/api/b/main/patients')).status).toBe(200);
    const res = await owner(`/api/org/roles/${doctor.id}/permissions`, { method: 'PUT', body: { permissions: ['dashboard.view', 'not.a.permission'] } });
    expect((await res.json()).permissions).toEqual(['dashboard.view']);
    expect((await doc('/api/b/main/patients')).status).toBe(403);
  });
});

describe('owner details (owner only)', () => {
  const ownerAudits = async () => (await t.db.select().from(auditLog)).filter((a) => a.entity === 'owner');

  it('owner changes name, login mobile and organization name; the session stays and the new mobile signs in', async () => {
    const owner = await t.as('owner');
    const res = await owner('/api/org/owner', { method: 'PATCH', body: { name: ' New Owner ', mobile: '98765 00001', organizationName: 'Renamed Hospital' } });
    expect(res.status).toBe(200);
    const saved = await res.json();
    const me = await (await owner('/api/auth/me')).json(); // same cookie still works
    expect(saved).toEqual(me);
    expect(me.user).toMatchObject({ name: 'New Owner', mobile: '+919876500001', isOwner: true });
    expect(me.organization.name).toBe('Renamed Hospital');
    expect(me.branches.map((b: any) => b.slug)).toEqual(['main', 'east']);

    const withNew = await t.app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: '9876500001', password: 'owner-pass-123' }) });
    expect(withNew.status).toBe(200);
    expect((await login('owner', 'owner-pass-123')).status).toBe(401); // old number no longer signs in

    const [audit] = await ownerAudits();
    expect(audit).toMatchObject({ action: 'update', entityId: String(me.user.id), userId: me.user.id });
    expect(JSON.parse(audit.detail!)).toEqual({ name: 'New Owner', mobile: '+919876500001', organizationName: 'Renamed Hospital' });

    // The old number is free again: a new staff member can take it.
    const add = await owner('/api/b/main/staff', { method: 'POST', body: { name: 'Takes Old', mobile: M('owner'), password: 'takes-old-1', roleId: await roleId(owner, 'doctor') } });
    expect(add.status).toBe(201);
  });

  it('only the owner; a taken or invalid mobile and an empty name change nothing', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const before = await (await owner('/api/auth/me')).json();
    const body = { name: 'Someone', mobile: '98765 00001', organizationName: 'Other Hospital' };
    expect((await doc('/api/org/owner', { method: 'PATCH', body })).status).toBe(403);

    const dup = await owner('/api/org/owner', { method: 'PATCH', body: { ...body, mobile: M('doc') } });
    expect(dup.status).toBe(400);
    const dupBody = await dup.json();
    expect(dupBody.code).toBe('validation');
    expect(dupBody.fields.mobile).toBeTruthy();

    const badMobile = await owner('/api/org/owner', { method: 'PATCH', body: { ...body, mobile: '12345' } });
    expect(badMobile.status).toBe(400);
    expect((await badMobile.json()).fields.mobile).toBeTruthy();
    const noName = await owner('/api/org/owner', { method: 'PATCH', body: { ...body, name: ' ' } });
    expect(noName.status).toBe(400);
    expect((await noName.json()).fields.name).toBeTruthy();
    expect((await owner('/api/org/owner', { method: 'PATCH', body: { name: 'Someone' } })).status).toBe(400); // all three are required

    expect(await (await owner('/api/auth/me')).json()).toEqual(before);
    expect(await ownerAudits()).toEqual([]);
    expect((await (await doc('/api/auth/me')).json()).user.mobile).toBe(M('doc'));

    // Saving with my own current mobile is not a duplicate.
    expect((await owner('/api/org/owner', { method: 'PATCH', body: { ...body, mobile: M('owner') } })).status).toBe(200);
  });
});
