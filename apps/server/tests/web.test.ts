import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Hono } from 'hono';
import { isAllowedOrigin, mountWebApp, resolveWebDir } from '../src/web.js';

describe('the app as a website on the hospital network', () => {
  let base: string;
  let webDir: string;
  let app: Hono;

  beforeAll(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'clinic-web-'));
    webDir = path.join(base, 'client-web');
    fs.mkdirSync(path.join(webDir, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(webDir, 'index.html'), '<!doctype html><title>Aadhi Hospital</title>');
    fs.writeFileSync(path.join(webDir, 'assets', 'app-abc123.js'), 'console.log(1)');
    fs.writeFileSync(path.join(base, 'secret.db'), 'patient data');
    app = new Hono();
    mountWebApp(app, webDir);
    app.get('/patients/:id', (c) => c.json({ id: c.req.param('id') }));
    app.post('/patients', (c) => c.json({ created: true }, 201));
  });

  afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

  it('opening a page in the browser gets the app, even on an API path', async () => {
    const res = await app.request('/patients/7', { headers: { 'Sec-Fetch-Mode': 'navigate' } });
    expect(res.headers.get('Content-Type')).toMatch(/text\/html/);
    expect(await res.text()).toContain('Aadhi Hospital');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
  });

  it("the app's own data requests still reach the API", async () => {
    const res = await app.request('/patients/7', { headers: { 'Sec-Fetch-Mode': 'cors', Accept: '*/*' } });
    expect(await res.json()).toEqual({ id: '7' });
    const post = await app.request('/patients', { method: 'POST', headers: { 'Sec-Fetch-Mode': 'navigate' } });
    expect(post.status).toBe(201); // only GET/HEAD are ever served as pages
  });

  it('serves app files, with long caching for hashed /assets', async () => {
    const res = await app.request('/assets/app-abc123.js');
    expect(res.headers.get('Content-Type')).toMatch(/javascript/);
    expect(res.headers.get('Cache-Control')).toContain('immutable');
  });

  it('never serves files outside the app folder', async () => {
    for (const p of ['/../secret.db', '/%2e%2e/secret.db', '/assets/../../secret.db']) {
      const res = await app.request(p, { headers: { 'Sec-Fetch-Mode': 'cors' } });
      expect(await res.text()).not.toContain('patient data');
    }
  });

  it('finds the installed app folder next to the server', () => {
    const serverDir = path.join(base, 'server');
    fs.mkdirSync(serverDir, { recursive: true });
    expect(resolveWebDir(serverDir)).toBe(webDir);
  });

  it('only the desktop app and localhost may call the API from another origin', () => {
    expect(isAllowedOrigin('tauri://localhost')).toBe(true);
    expect(isAllowedOrigin('http://tauri.localhost')).toBe(true);
    expect(isAllowedOrigin('http://localhost:5199')).toBe(true);
    expect(isAllowedOrigin('https://evil.example.com')).toBe(false);
    expect(isAllowedOrigin('http://localhost.evil.com')).toBe(false);
    expect(isAllowedOrigin(undefined)).toBe(false);
  });
});
