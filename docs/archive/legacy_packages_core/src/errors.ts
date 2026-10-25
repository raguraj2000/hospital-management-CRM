import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ZodError } from 'zod';

/** Throw this anywhere in a route; the error handler turns it into JSON. */
export class AppError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Not found') => new AppError(404, 'not_found', what);
export const forbidden = (message = "You don't have permission for this") => new AppError(403, 'forbidden', message);

export function validationError(err: ZodError): AppError {
  const fields: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  const first = err.issues[0]?.message ?? 'Check the form';
  return new AppError(400, 'validation', first, fields);
}

/** One JSON error shape everywhere: { error, code, fields? }. No stack traces leave the server. */
export function handleError(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code, ...(err.fields ? { fields: err.fields } : {}) }, err.status);
  }
  console.error(`[error] ${c.req.method} ${c.req.path}`, err);
  return c.json({ error: 'Something went wrong on the server', code: 'internal' }, 500);
}

export function handleNotFound(c: Context) {
  return c.json({ error: 'Not found', code: 'not_found' }, 404);
}
