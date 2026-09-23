import { getAuthToken, clearSession } from '../state/auth-store.js';
import { reportRequestOutcome } from '../state/connection-monitor.js';

/**
 * A 401 on any authenticated call means the session is gone (expired,
 * revoked, or the server restarted and lost it) -- there is no path where
 * retrying or waiting fixes it. Clearing the stored session and telling the
 * app to redirect here, once, means the user sees one clear "please log in
 * again" instead of a different cryptic per-widget error on every request
 * that happens to fire next.
 */
function handleUnauthorized() {
  clearSession();
  window.dispatchEvent(new CustomEvent('clinic:session-expired'));
}

let serverBaseUrl = localStorage.getItem('clinic.serverBaseUrl') ?? 'http://localhost:3001';

export function setServerBaseUrl(url: string) {
  serverBaseUrl = url;
  localStorage.setItem('clinic.serverBaseUrl', url);
}

export function getServerBaseUrl(): string {
  return serverBaseUrl;
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  // FormData bodies (file uploads) need the browser to set their own
  // multipart boundary in Content-Type -- setting it ourselves breaks that.
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  try {
    const response = await fetch(`${serverBaseUrl}${path}`, { ...init, headers });
    reportRequestOutcome(true);
    return response;
  } catch (err) {
    reportRequestOutcome(false);
    throw err;
  }
}

/** Reads are allowed to fall back to cached data while offline (handled by callers/hooks). */
export async function get<T>(path: string): Promise<T> {
  const res = await request(path, { method: 'GET' });
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new ApiError(res.status, await safeJson(res));
  return res.json();
}

/**
 * The single seam every mutating call goes through. A future v2 offline
 * write-queue hooks in here — nowhere else in the client should call
 * fetch() directly for a write. See plan §4.
 */
export async function mutate<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  if (!isOnlineForWrites()) {
    throw new OfflineError('Connection to main computer lost — new dispenses and edits are disabled until reconnected.');
  }
  const res = await request(path, { method, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new ApiError(res.status, await safeJson(res));
  return res.json();
}

/** Like mutate(), but for a file upload -- body is a FormData, not JSON. */
export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  if (!isOnlineForWrites()) {
    throw new OfflineError('Connection to main computer lost — new dispenses and edits are disabled until reconnected.');
  }
  const res = await request(path, { method: 'POST', body: formData });
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new ApiError(res.status, await safeJson(res));
  return res.json();
}

function isOnlineForWrites(): boolean {
  // Deferred import to avoid a circular init dependency; connection-monitor
  // is the single source of truth for online/offline state.
  return (window as any).__clinicConnectionState !== 'offline';
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

export class OfflineError extends Error {}

/**
 * Turns a caught error into a message that actually says why something
 * failed, instead of a generic "could not reach the main computer" no
 * matter what happened. In particular, a 404 here almost always means the
 * main computer's server is running older code than this client expects --
 * a very different problem from "offline" or "no permission", and one that
 * generic messages made impossible to tell apart.
 */
export function describeError(err: unknown, action: string): string {
  if (err instanceof ApiError) {
    if (err.status === 404) {
      return `Could not ${action}: the main computer's server doesn't have this feature yet (HTTP 404). It needs to be updated to the latest server package and restarted.`;
    }
    if (err.status === 401) {
      return `Could not ${action}: your session has expired. Please log in again.`;
    }
    if (err.status === 403) {
      return `Could not ${action}: your account doesn't have permission for this.`;
    }
    const detail =
      err.body && typeof err.body === 'object' && 'error' in (err.body as Record<string, unknown>)
        ? (err.body as Record<string, unknown>).error
        : undefined;
    return `Could not ${action} (HTTP ${err.status})${detail ? `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : '.'}`;
  }
  if (err instanceof OfflineError) return err.message;
  return `Could not ${action}: could not reach the main computer. Check the network connection.`;
}
