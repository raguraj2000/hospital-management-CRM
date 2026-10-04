// The ONE way the web app talks to the server. Cookie session (credentials:
// 'include'), one error type, timeouts, GET retries, and a single 401 handler.
import type { ApiErrorBody } from '@platform/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

let onUnauthenticated: (() => void) | null = null;
/** Called once by the auth layer: what to do when the session has expired. */
export function setUnauthenticatedHandler(fn: () => void) {
  onUnauthenticated = fn;
}

const TIMEOUT_MS = 20_000;

async function request<T>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Network down / server restarting: retry reads once, never writes (could double-save).
    if (method === 'GET' && attempt < 1) return request(method, path, body, attempt + 1);
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    throw new ApiError(0, timedOut ? 'timeout' : 'network', timedOut ? 'The server took too long to answer.' : "Can't reach the server. Check the connection.");
  }

  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const e = (data ?? {}) as Partial<ApiErrorBody>;
    if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthenticated?.();
    if (res.status >= 500 && method === 'GET' && attempt < 1) return request(method, path, body, attempt + 1);
    throw new ApiError(res.status, e.code ?? 'error', e.error ?? `Request failed (${res.status})`, e.fields);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** Plain-English message for any error, for showing to staff. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Please try again.';
}
