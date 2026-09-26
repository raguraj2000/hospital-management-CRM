import fs from 'node:fs';
import path from 'node:path';
import type { Context, Hono, MiddlewareHandler } from 'hono';

/**
 * The clinic app as a website on the hospital network: the main computer's
 * server also hands out the app itself, so any PC, tablet or phone on the
 * hospital Wi-Fi opens http://<main-computer>:3001 in a browser -- no install.
 *
 * Page addresses (/patients/7) and API addresses (/patients/7) are the same
 * paths, so they're told apart by how the browser asks: opening a page is a
 * "navigation" (Sec-Fetch-Mode: navigate, or an Accept: text/html request),
 * while the app's own data calls are fetch() requests. Navigations get the
 * app's index.html; everything else goes to the API exactly as before.
 */

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

/**
 * Where the built app lives: CLINIC_WEB_DIR, else `apps/client-web` next to
 * the server (the installed layout), else the dev build `apps/client/dist`.
 * Null if none has an index.html (the API still works on its own).
 */
export function resolveWebDir(serverDir = process.cwd()): string | null {
  const candidates = [
    process.env.CLINIC_WEB_DIR,
    path.resolve(serverDir, '..', 'client-web'),
    path.resolve(serverDir, '..', 'client', 'dist'),
  ].filter((d): d is string => Boolean(d));
  return candidates.find((d) => fs.existsSync(path.join(d, 'index.html'))) ?? null;
}

export function isPageRequest(c: Context): boolean {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') return false;
  const mode = c.req.header('Sec-Fetch-Mode');
  if (mode) return mode === 'navigate';
  // Older browsers without Sec-Fetch-*: a page load asks for HTML first.
  return (c.req.header('Accept') ?? '').includes('text/html');
}

function fileResponse(file: string, cacheControl: string): Response {
  const body = fs.readFileSync(file);
  return new Response(body, {
    headers: {
      'Content-Type': CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': cacheControl,
    },
  });
}

/** Serves the built app's files and pages. Mount before the API routes. */
export function webAppMiddleware(webDir: string): MiddlewareHandler {
  const root = path.resolve(webDir);
  return async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') return next();

    // A real file of the app (script, style, font, image). Resolved inside
    // the app folder only -- "../" can never reach anything else on disk.
    const requested = path.resolve(root, '.' + decodeURIComponent(c.req.path));
    const insideRoot = requested.startsWith(root + path.sep);
    if (insideRoot && path.extname(requested) && fs.existsSync(requested) && fs.statSync(requested).isFile()) {
      // Vite puts a content hash in /assets file names, so they never change.
      const immutable = c.req.path.startsWith('/assets/');
      return fileResponse(requested, immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
    }

    // Opening a page in the browser: always the latest app.
    if (isPageRequest(c)) return fileResponse(path.join(root, 'index.html'), 'no-cache');

    return next();
  };
}

/**
 * Which other web addresses may call the API from a browser: the desktop
 * app (Tauri) and localhost during development. The website served by this
 * same server is same-origin and needs no permission.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (origin === 'tauri://localhost' || origin === 'http://tauri.localhost' || origin === 'https://tauri.localhost') return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function mountWebApp(app: Hono, webDir: string | null): void {
  if (webDir) app.use('*', webAppMiddleware(webDir));
}
