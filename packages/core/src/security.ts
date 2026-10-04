import type { MiddlewareHandler } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { AppError } from './errors.js';

/**
 * Blocks cross-site writes (CSRF): a POST/PATCH/DELETE coming from a page on
 * another site carries that site's Origin, which won't match our Host.
 */
export function sameOriginWrites(): MiddlewareHandler {
  return async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const origin = c.req.header('Origin');
      const host = c.req.header('Host');
      if (origin && host && new URL(origin).host !== host) {
        throw new AppError(403, 'bad_origin', 'Request blocked: it came from another website');
      }
    }
    await next();
  };
}

/** Standard protective headers + a strict content security policy (no outside scripts). */
export function securityHeaders(): MiddlewareHandler {
  return secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
    strictTransportSecurity: false, // turned on when served over https
    crossOriginEmbedderPolicy: false,
  });
}

/** Simple in-memory limiter for login attempts per IP (single-server setup). */
export function rateLimit(max: number, windowMs: number): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    const key = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || c.env?.incoming?.socket?.remoteAddress || 'local';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) hits.set(key, { count: 1, resetAt: now + windowMs });
    else if (++entry.count > max) throw new AppError(429, 'rate_limited', 'Too many attempts. Wait a minute and try again.');
    await next();
  };
}
