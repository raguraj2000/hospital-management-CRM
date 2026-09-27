import argon2 from 'argon2';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { openDatabase, defaultDbPath } from './connection.js';
import { runMigrations } from './migrate.js';
import { generateBatchCode } from '../services/stock-service.js';

const ROLES = ['admin', 'manager', 'doctor', 'pharmacist', 'front_desk', 'lab_technician'] as const;

export async function seed(db: Database.Database) {
  runMigrations(db);

  const insertRole = db.prepare('INSERT OR IGNORE INTO role (name) VALUES (?)');
  for (const role of ROLES) insertRole.run(role);

  const existingAdmin = db.prepare('SELECT id FROM user WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const adminRoleId = (db.prepare('SELECT id FROM role WHERE name = ?').get('admin') as any).id;
    const passwordHash = await argon2.hash('changeme123');
    db.prepare(
      `INSERT INTO user (full_name, username, password_hash, role_id) VALUES (?, ?, ?, ?)`,
    ).run('Administrator', 'admin', passwordHash, adminRoleId);
    console.log('Seeded default admin user (username: admin, password: changeme123 - change immediately)');
  }

  const medicineCount = (db.prepare('SELECT COUNT(*) as c FROM medicine').get() as any).c;
  if (medicineCount === 0) {
    const categoryId = (name: string) =>
      (db.prepare('SELECT id FROM medicine_category WHERE name = ?').get(name) as { id: number } | undefined)?.id ?? null;
    const insertMedicine = db.prepare(`
      INSERT INTO medicine (name, medical_code, base_unit, pack_size, conversion_factor, price_cents, minimum_stock, reorder_point, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const paracetamol = insertMedicine.run(
      'Paracetamol 500mg', generateBatchCode(db), 'tablet', 10, 1, 200, 50, 100, categoryId('Tablet'),
    );
    const coughSyrup = insertMedicine.run(
      'Cough Syrup', generateBatchCode(db), 'ml', 100, 1, 50, 500, 1000, categoryId('Syrup'),
    );

    const insertBatch = db.prepare(`
      INSERT INTO medicine_batch (medicine_id, lot_number, expiry_date, quantity_received, quantity_remaining)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertBatch.run(paracetamol.lastInsertRowid, 'LOT-P1', '2027-01-01', 500, 500);
    insertBatch.run(coughSyrup.lastInsertRowid, 'LOT-C1', '2026-12-01', 5000, 5000);
    console.log('Seeded sample medicines and batches.');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const db = openDatabase({ filePath: defaultDbPath() });
  await seed(db);
  db.close();
}
