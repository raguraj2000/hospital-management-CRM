// Centralized API client for the web application.
// Cookie session (credentials: 'include'), typed errors, timeouts, GET retries,
// AbortSignal support, unauthenticated session expiry handling, and automatic
// mapping to the canonical /api/{module}/{op} backend architecture.
import type { ApiErrorBody } from '@platform/shared';
import { transformRequest } from './adapter';

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
  // Transform legacy routes & payloads into canonical /api/{module}/{op} contract
  const transformed = transformRequest(method, path, body, options?.headers);

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  // Combine user signal with timeout signal if provided
  let combinedSignal: AbortSignal = timeoutSignal;
  if (options?.signal) {
    combinedSignal = AbortSignal.any([options.signal, timeoutSignal]);
  }

  const headers: Record<string, string> = {
    ...transformed.headers,
  };
  if (transformed.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${transformed.path}`, {
      method: transformed.method,
      credentials: 'include',
      headers: Object.keys(headers).length ? headers : undefined,
      body: transformed.body === undefined ? undefined : JSON.stringify(transformed.body),
      signal: combinedSignal,
    });
  } catch (err) {
    // If explicitly aborted by consumer, rethrow without retrying
    if (options?.signal?.aborted) {
      throw err;
    }

    // Network down / server restarting: retry GET reads once
    if (transformed.method === 'GET' && attempt < 1) {
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
  const responseData = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    let code = 'error';
    let message = `Request failed (${res.status})`;
    let fields: Record<string, string[]> | undefined = undefined;

    if (responseData && typeof responseData === 'object') {
      const resp = responseData as Record<string, any>;
      if (typeof resp.message === 'string' && resp.message) {
        message = resp.message;
      }
      if (resp.error) {
        if (typeof resp.error === 'string') {
          message = resp.error;
        } else if (typeof resp.error === 'object') {
          if (typeof resp.error.code === 'string') {
            code = resp.error.code;
          }
          if (typeof resp.error.message === 'string') {
            message = resp.error.message;
          }
          if (resp.error.details) {
            if (Array.isArray(resp.error.details)) {
              // FastAPI validation errors: [{ field: 'name', message: '...' }]
              fields = {};
              for (const d of resp.error.details) {
                const k = d.field || 'general';
                if (!fields[k]) fields[k] = [];
                fields[k].push(d.message || 'Invalid value');
              }
            } else if (typeof resp.error.details === 'object') {
              fields = resp.error.details;
            }
          }
        }
      }
      if (resp.code && typeof resp.code === 'string') {
        code = resp.code;
      }
      if (resp.fields && typeof resp.fields === 'object') {
        fields = resp.fields;
      }
    }

    if (res.status === 401 && !transformed.path.includes('/auth/login')) {
      onUnauthenticated?.();
    }
    if (res.status >= 500 && transformed.method === 'GET' && attempt < 1) {
      return request(method, path, body, options, attempt + 1);
    }
    throw new ApiError(res.status, code, message, fields);
  }

  // Response OK: unwrap standardized response envelope { status_code, message, data, error }
  if (
    responseData !== null &&
    typeof responseData === 'object' &&
    'status_code' in responseData &&
    'data' in responseData
  ) {
    return (responseData as { data: T }).data;
  }

  return responseData as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body ?? {}, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('DELETE', path, body, options),

  /** Download binary data (e.g. CSV or PDF reports) */
  blob: async (path: string, options?: RequestOptions): Promise<{ blob: Blob; filename: string | null }> => {
    const transformed = transformRequest('GET', path, undefined, options?.headers);

    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options?.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

    const res = await fetch(`${API_BASE_URL}${transformed.path}`, {
      method: 'GET',
      credentials: 'include',
      headers: Object.keys(transformed.headers).length ? transformed.headers : undefined,
      signal,
    });

    if (!res.ok) {
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json().catch(() => null) : null;
      const e = (data ?? {}) as Partial<ApiErrorBody>;
      throw new ApiError(
        res.status,
        e.code ?? 'export_error',
        e.error ?? (data as any)?.message ?? `Failed to download file (${res.status})`,
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
