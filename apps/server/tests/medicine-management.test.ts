import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createMedicineRoutes } from '../src/routes/medicines.js';
import { createMedicineCategoryRoutes } from '../src/routes/medicine-categories.js';
import { generateBatchCode } from '../src/services/stock-service.js';
import { createTempDbPath, setupTestDb, cleanupDb } from './helpers.js';

describe('medicine management (batch code, category, delete)', () => {
  let db: Database.Database;
  let dbPath: string;
  let medicines: ReturnType<typeof createMedicineRoutes>;
  let categories: ReturnType<typeof createMedicineCategoryRoutes>;
  let token: string;

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    medicines = createMedicineRoutes(db);
    categories = createMedicineCategoryRoutes(db);

    db.prepare(`INSERT INTO role (name) VALUES ('manager')`).run();
    const roleId = (db.prepare(`SELECT id FROM role WHERE name = 'manager'`).get() as any).id;
    const user = db
      .prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES ('Mgr', 'mgr', 'x', ?)`)
      .run(roleId);
    token = 'test-token';
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES (?, ?, ?)`).run(
      token,
      user.lastInsertRowid,
      expiresAt,
    );
  });

  afterEach(() => cleanupDb(db, dbPath));

  // A function, not a value computed once at describe-time -- `token` is only
  // set inside beforeEach, which runs after this describe body executes.
  function auth() {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  it('generateBatchCode produces unique, #-prefixed codes and never reuses one already taken', () => {
    db.prepare(`INSERT INTO medicine (name, base_unit, price_cents, medical_code) VALUES ('X', 'tablet', 100, '#1234')`).run();
    const insert = db.prepare(`INSERT INTO medicine (name, base_unit, price_cents, medical_code) VALUES ('Y', 'tablet', 100, ?)`);
    const seen = new Set<string>();
    // Insert each generated code before asking for the next one, mirroring
    // real usage (POST /medicines generates then immediately inserts) --
    // otherwise a small code space collides by chance (birthday paradox) even
    // though the real flow never would.
    for (let i = 0; i < 50; i++) {
      const code = generateBatchCode(db);
      expect(code).toMatch(/^#\d{4,}$/);
      expect(code).not.toBe('#1234');
      expect(seen.has(code)).toBe(false);
      seen.add(code);
      insert.run(code);
    }
  });

  it('assigns a batch code automatically on create; the client cannot set or edit it', async () => {
    const res = await medicines.request('/', {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ name: 'Amoxicillin', baseUnit: 'tablet', priceCents: 500 }),
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.batchCode).toMatch(/^#\d{4,}$/);

    const row = db.prepare('SELECT medical_code FROM medicine WHERE id = ?').get(created.id) as { medical_code: string };
    expect(row.medical_code).toBe(created.batchCode);

    // Attempting to change it via PATCH is silently ignored (not in the schema).
    const patchRes = await medicines.request(`/${created.id}`, {
      method: 'PATCH',
      headers: auth(),
      body: JSON.stringify({ medicalCode: '#0000', name: 'Amoxicillin 500' }),
    });
    expect(patchRes.status).toBe(200);
    const after = db.prepare('SELECT medical_code, name FROM medicine WHERE id = ?').get(created.id) as any;
    expect(after.medical_code).toBe(created.batchCode); // unchanged
    expect(after.name).toBe('Amoxicillin 500'); // other fields still update
  });

  it('the 7 default categories exist; a new one can be added and is idempotent (case-insensitive)', async () => {
    const listBefore = await (await categories.request('/', { headers: auth() })).json();
    expect(listBefore.categories.map((c: any) => c.name)).toEqual(
      expect.arrayContaining(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment/Cream', 'Drops', 'Other']),
    );

    const create1 = await categories.request('/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Lozenge' }) });
    expect(create1.status).toBe(201);
    const cat1 = (await create1.json()).category;

    const create2 = await categories.request('/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'lozenge' }) });
    expect(create2.status).toBe(200); // idempotent, not a duplicate
    const cat2 = (await create2.json()).category;
    expect(cat2.id).toBe(cat1.id);

    const medRes = await medicines.request('/', {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ name: 'Insulin', baseUnit: 'vial', priceCents: 1000, categoryId: cat1.id }),
    });
    const med = await medRes.json();
    const listed = await (await medicines.request('/', { headers: auth() })).json();
    const row = listed.medicines.find((m: any) => m.id === med.id);
    expect(row.category_name).toBe('Lozenge');
  });

  it('soft-deletes a medicine: it stops appearing in the list but the row is kept', async () => {
    const createRes = await medicines.request('/', {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ name: 'ToDelete', baseUnit: 'tablet', priceCents: 100 }),
    });
    const { id } = await createRes.json();

    const before = await (await medicines.request('/', { headers: auth() })).json();
    expect(before.medicines.some((m: any) => m.id === id)).toBe(true);

    const delRes = await medicines.request(`/${id}/delete`, { method: 'POST', headers: auth() });
    expect(delRes.status).toBe(200);

    const after = await (await medicines.request('/', { headers: auth() })).json();
    expect(after.medicines.some((m: any) => m.id === id)).toBe(false);

    const row = db.prepare('SELECT deleted_at FROM medicine WHERE id = ?').get(id) as { deleted_at: string | null };
    expect(row.deleted_at).not.toBeNull();

    // Deleting again is a 404, not a silent success.
    const secondDelete = await medicines.request(`/${id}/delete`, { method: 'POST', headers: auth() });
    expect(secondDelete.status).toBe(404);
  });

  it('inventory list shows expired stock first, then soon-expiring, then the rest A-Z', async () => {
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const add = (name: string, expiry: string | null) => {
      const id = Number(
        db.prepare(`INSERT INTO medicine (name, base_unit, price_cents, minimum_stock, reorder_point) VALUES (?, 'tablet', 100, 0, 0)`)
          .run(name).lastInsertRowid,
      );
      if (expiry)
        db.prepare(
          `INSERT INTO medicine_batch (medicine_id, lot_number, expiry_date, quantity_received, quantity_remaining) VALUES (?, 'L', ?, 10, 10)`,
        ).run(id, expiry);
    };
    add('Aspirin', day(400));
    add('Zinc', day(-5)); // expired
    add('Bcomplex', null); // no stock
    add('Cetirizine', day(10)); // expires soon
    add('Amoxicillin', day(3)); // expires sooner

    const res = await medicines.request('/?page=1&pageSize=20', { headers: auth() });
    const names = (await res.json()).medicines.map((m: any) => m.name);
    expect(names).toEqual(['Zinc', 'Amoxicillin', 'Cetirizine', 'Aspirin', 'Bcomplex']);
  });
});
