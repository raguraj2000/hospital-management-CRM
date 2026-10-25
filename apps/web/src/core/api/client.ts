// Centralized API client for the web application.
// Cookie session (credentials: 'include'), typed errors, timeouts, GET retries,
// AbortSignal support, and unauthenticated session expiry handling.
import type { ApiErrorBody } from '@platform/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthenticated: (() => void) | null = null;

/** Called once by the auth layer: handler when the session has expired or is invalid. */
export function setUnauthenticatedHandler(fn: () => void) {
  onUnauthenticated = fn;
}

const DEFAULT_TIMEOUT_MS = 25_000;
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:8000';

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
  attempt = 0,
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  
  // Combine user signal with timeout signal if provided
  let combinedSignal: AbortSignal = timeoutSignal;
  if (options?.signal) {
    combinedSignal = AbortSignal.any([options.signal, timeoutSignal]);
  }

  const headers: Record<string, string> = {
    ...(options?.headers ?? {}),
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      credentials: 'include',
      headers: Object.keys(headers).length ? headers : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: combinedSignal,
    });
  } catch (err) {
    // If explicitly aborted by consumer, rethrow without retrying
    if (options?.signal?.aborted) {
      throw err;
    }

    // Network down / server restarting: retry GET reads once
    if (method === 'GET' && attempt < 1) {
      return request(method, path, body, options, attempt + 1);
    }

    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    throw new ApiError(
      0,
      timedOut ? 'timeout' : 'network',
      timedOut
        ? 'The server took too long to answer. Please try again.'
        : "Can't reach the server. Check your connection.",
    );
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const e = (data ?? {}) as Partial<ApiErrorBody>;
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      onUnauthenticated?.();
    }
    if (res.status >= 500 && method === 'GET' && attempt < 1) {
      return request(method, path, body, options, attempt + 1);
    }
    throw new ApiError(
      res.status,
      e.code ?? 'error',
      e.error ?? `Request failed (${res.status})`,
      e.fields,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body ?? {}, options),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  put: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
  
  /** Download binary data (e.g. CSV or PDF reports) */
  blob: async (path: string, options?: RequestOptions): Promise<{ blob: Blob; filename: string | null }> => {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options?.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

    const res = await fetch(`/api${path}`, {
      method: 'GET',
      credentials: 'include',
      signal,
    });

    if (!res.ok) {
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json().catch(() => null) : null;
      const e = (data ?? {}) as Partial<ApiErrorBody>;
      throw new ApiError(
        res.status,
        e.code ?? 'export_error',
        e.error ?? `Failed to download file (${res.status})`,
      );
    }

    const disposition = res.headers.get('content-disposition');
    let filename: string | null = null;
    if (disposition) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match?.[1]) filename = match[1];
    }

    const blob = await res.blob();
    return { blob, filename };
  },
};

/** User-friendly error message resolution for alerts and notifications. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

