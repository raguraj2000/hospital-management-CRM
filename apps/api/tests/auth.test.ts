import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { session } from '../src/db/schema.js';
import { M, setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const login = (username: string, password: string, headers: Record<string, string> = {}) =>
  t.app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ mobile: M(username), password }),
  });

describe('login', () => {
  it('sets an httpOnly, SameSite=Lax session cookie and returns only my branches', async () => {
    const res = await login('doc', 'doc-pass-123');
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(/^sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    const me = await res.json();
    expect(me.branches.map((b: any) => b.slug)).toEqual(['main']);
    expect(me.branches[0].roleName).toBe('Doctor');
    expect(me.branches[0].permissions).toContain('patient.view');
    expect(me.branches[0].permissions).not.toContain('users.manage');
  });

  it('owner sees every branch with every permission', async () => {
    const me = await (await login('owner', 'owner-pass-123')).json();
    expect(me.branches.map((b: any) => b.slug)).toEqual(['main', 'east']);
    expect(me.branches[0].permissions).toContain('users.manage');
  });

  it('stores only a hash of the token, never the token itself', async () => {
    const res = await login('doc', 'doc-pass-123');
    const token = res.headers.get('set-cookie')!.split(';')[0].slice('sid='.length);
    const rows = await t.db.select().from(session);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).not.toBe(token);
    expect(rows[0].id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same error for wrong password and unknown user', async () => {
    const a = await login('doc', 'nope');
    const b = await login('nobody', 'nope');
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect((await a.json()).error).toBe((await b.json()).error);
  });

  it('locks the account for 15 minutes after 5 wrong passwords', async () => {
    for (let i = 0; i < 5; i++) expect((await login('doc', 'wrong')).status).toBe(401);
    const res = await login('doc', 'doc-pass-123'); // even the right password
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe('locked');
  });

  it('rejects a login posted from another website (CSRF)', async () => {
    const res = await login('doc', 'doc-pass-123', { Origin: 'https://evil.example', Host: 'localhost' });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('bad_origin');
  });
});

describe('session', () => {
  it('/me needs a cookie; logout revokes the session server-side', async () => {
    expect((await t.app.request('/api/auth/me')).status).toBe(401);
    const doc = await t.as('doc');
    expect((await doc('/api/auth/me')).status).toBe(200);
    expect((await doc('/api/auth/logout', { method: 'POST' })).status).toBe(200);
    expect((await doc('/api/auth/me')).status).toBe(401); // the old cookie is dead
  });

  it('an expired session is refused', async () => {
    const doc = await t.as('doc');
    for (const s of await t.db.select().from(session)) {
      await t.db.update(session).set({ expiresAt: '2000-01-01T00:00:00.000Z' }).where(eq(session.id, s.id));
    }
    expect((await doc('/api/auth/me')).status).toBe(401);
  });

  it('errors are JSON with { error, code } and no stack trace', async () => {
    const res = await t.app.request('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found', code: 'not_found' });
  });
});
