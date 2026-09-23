import type { MiddlewareHandler } from 'hono';
import type Database from 'better-sqlite3';
import type { Permission } from '@clinic/shared';
import { verifySession, type SessionUser } from '../services/auth-service.js';
import { getPermissionsFor } from '../services/permission-service.js';

declare module 'hono' {
  interface ContextVariableMap {
    user: SessionUser;
    permissions: Permission[];
  }
}

export function requireAuth(db: Database.Database): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!token) return c.json({ error: 'Missing session token' }, 401);

    const user = verifySession(db, token);
    if (!user) return c.json({ error: 'Invalid or expired session' }, 401);

    c.set('user', user);
    // Resolved once per request here (cheap, cached in the permission
    // service) so requirePermission stays a plain list check and no route
    // needs to know about the database.
    c.set('permissions', getPermissionsFor(db, user.role));
    await next();
  };
}
