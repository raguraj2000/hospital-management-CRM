import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import type Database from 'better-sqlite3';

export function createTempDbPath(): string {
  return path.join(os.tmpdir(), `clinic-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

export function setupTestDb(filePath: string): Database.Database {
  const db = openDatabase({ filePath });
  runMigrations(db);
  return db;
}

export function seedBasicFixtures(db: Database.Database) {
  db.prepare(`INSERT INTO role (name) VALUES ('admin'), ('pharmacist'), ('doctor'), ('manager'), ('front_desk')`).run();
  const pharmacistRoleId = (db.prepare(`SELECT id FROM role WHERE name = 'pharmacist'`).get() as any).id;
  const doctorRoleId = (db.prepare(`SELECT id FROM role WHERE name = 'doctor'`).get() as any).id;

  const pharmacist = db
    .prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES ('Pharm A', 'pharma', 'x', ?)`)
    .run(pharmacistRoleId);
  const doctor = db
    .prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES ('Doc A', 'doca', 'x', ?)`)
    .run(doctorRoleId);

  const patient = db
    .prepare(
      `INSERT INTO patient (customer_code, current_name, status) VALUES ('PT-0001', 'Test Patient', 'active')`,
    )
    .run();

  const medicine = db
    .prepare(
      `INSERT INTO medicine (name, base_unit, price_cents, minimum_stock, reorder_point) VALUES ('Test Med', 'tablet', 100, 10, 20)`,
    )
    .run();

  const visit = db
    .prepare(`INSERT INTO visit_event (patient_id, visit_date) VALUES (?, date('now'))`)
    .run(patient.lastInsertRowid);

  return {
    pharmacistId: Number(pharmacist.lastInsertRowid),
    doctorId: Number(doctor.lastInsertRowid),
    patientId: Number(patient.lastInsertRowid),
    medicineId: Number(medicine.lastInsertRowid),
    visitEventId: Number(visit.lastInsertRowid),
  };
}

export function addBatch(
  db: Database.Database,
  medicineId: number,
  opts: { lotNumber: string; expiryDate: string; quantity: number },
): number {
  const info = db
    .prepare(
      `INSERT INTO medicine_batch (medicine_id, lot_number, expiry_date, quantity_received, quantity_remaining)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(medicineId, opts.lotNumber, opts.expiryDate, opts.quantity, opts.quantity);
  return Number(info.lastInsertRowid);
}

export function cleanupDb(db: Database.Database, filePath: string) {
  db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const p = filePath + suffix;
    if (fs.existsSync(p)) fs.rmSync(p);
  }
}
