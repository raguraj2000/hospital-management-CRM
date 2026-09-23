import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { insertAuditLog } from '../services/audit-service.js';

const createCategorySchema = z.object({ name: z.string().trim().min(1).max(60) });

// Medicine categories (Tablet, Syrup, Injection, ...) -- a small, flat lookup
// list. Anyone who can see inventory can see the list (so the Add/Edit
// medicine form can populate its dropdown); only medicine.manage can add one.
// No delete: a category already in use on a medicine would need to be
// reassigned first, and that's not asked for -- keeps this simple.
export function createMedicineCategoryRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  app.get('/', requirePermission('inventory.view'), (c) => {
    const categories = db.prepare('SELECT id, name FROM medicine_category ORDER BY name').all();
    return c.json({ categories });
  });

  app.post('/', requirePermission('medicine.manage'), async (c) => {
    const parsed = createCategorySchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const name = parsed.data.name;
    const user = c.get('user');

    const existing = db.prepare('SELECT id, name FROM medicine_category WHERE name = ? COLLATE NOCASE').get(name) as
      | { id: number; name: string }
      | undefined;
    if (existing) return c.json({ category: existing }); // idempotent: picking an existing name just returns it

    const info = db.prepare('INSERT INTO medicine_category (name) VALUES (?)').run(name);
    const id = Number(info.lastInsertRowid);

    insertAuditLog(db, {
      entityType: 'medicine_category',
      entityId: id,
      action: 'create',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: { name },
    });

    return c.json({ category: { id, name } }, 201);
  });

  return app;
}
