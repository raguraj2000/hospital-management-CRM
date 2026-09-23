import type { Context } from 'hono';

export class ConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InsufficientStockError extends Error {
  status = 409;
  constructor(
    public medicineId: number,
    public shortfall: number,
  ) {
    super(`Insufficient stock for medicine ${medicineId}: short by ${shortfall}`);
    this.name = 'InsufficientStockError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Last-resort handler for anything a route didn't catch. A request body that
 * isn't valid JSON is the caller's mistake (400), not a server crash (500).
 */
export function handleUncaughtError(err: Error, c: Context): Response {
  if (err instanceof SyntaxError) return c.json({ error: 'Request body is not valid JSON' }, 400);
  console.error('Unhandled error:', err);
  return c.json({ error: 'Something went wrong on the main computer' }, 500);
}
