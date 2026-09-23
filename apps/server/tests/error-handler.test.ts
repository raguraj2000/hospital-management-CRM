import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { handleUncaughtError } from '../src/errors.js';

describe('uncaught error handler', () => {
  const app = new Hono();
  app.onError(handleUncaughtError);
  app.post('/echo', async (c) => c.json(await c.req.json()));
  app.get('/boom', () => {
    throw new Error('kaboom');
  });

  it('turns a malformed JSON body into a 400, not a 500', async () => {
    const res = await app.request('/echo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not json' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not valid JSON/);
  });

  it('returns a JSON 500 for real crashes', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await app.request('/boom');
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
    spy.mockRestore();
  });
});
