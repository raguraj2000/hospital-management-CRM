import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fork, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { createTempDbPath, setupTestDb, seedBasicFixtures, addBatch, cleanupDb } from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dirname, 'concurrency-worker.ts');

function spawnWorker(args: string[]): ChildProcess {
  return fork(WORKER_PATH, args, {
    execArgv: ['--import', 'tsx'],
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
}

describe('dispense-service concurrency (separate OS processes)', () => {
  let db: Database.Database;
  let dbPath: string;
  let fixtures: ReturnType<typeof seedBasicFixtures>;

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    fixtures = seedBasicFixtures(db);
  });

  afterEach(() => {
    cleanupDb(db, dbPath);
  });

  it('never oversells stock when multiple processes dispense the same medicine simultaneously', async () => {
    const totalStock = 100;
    addBatch(db, fixtures.medicineId, { lotNumber: 'RACE', expiryDate: '2027-01-01', quantity: totalStock });
    // Close the parent's handle before workers open their own connections,
    // so WAL writers aren't contending with an idle parent connection.
    db.close();

    const workerCount = 5;
    const perWorkerRequest = 30; // 5 * 30 = 150 > 100 available: some must fail or be partially blocked

    const workers = Array.from({ length: workerCount }, () =>
      spawnWorker([
        dbPath,
        String(fixtures.medicineId),
        String(fixtures.patientId),
        String(fixtures.visitEventId),
        String(fixtures.pharmacistId),
        String(perWorkerRequest),
      ]),
    );

    const results = await new Promise<any[]>((resolve, reject) => {
      const ready: ChildProcess[] = [];
      const collected: any[] = [];
      const timeout = setTimeout(() => reject(new Error('concurrency test timed out')), 20000);

      for (const w of workers) {
        w.on('message', (msg: any) => {
          if (msg.type === 'ready') {
            ready.push(w);
            if (ready.length === workers.length) {
              // Fire all 'go' messages back-to-back so workers race as
              // closely to simultaneously as an OS scheduler allows.
              for (const rw of ready) rw.send({ type: 'go' });
            }
          } else if (msg.type === 'result') {
            collected.push(msg);
            if (collected.length === workers.length) {
              clearTimeout(timeout);
              resolve(collected);
            }
          }
        });
        w.on('error', reject);
      }
    });

    const totalTaken = results.filter((r) => r.success).reduce((sum, r) => sum + r.taken, 0);
    expect(totalTaken).toBeLessThanOrEqual(totalStock);

    // Re-open in the test process to verify final state.
    const verifyDb = setupTestDb(dbPath);
    const batchRow = verifyDb
      .prepare('SELECT quantity_remaining FROM medicine_batch WHERE medicine_id = ?')
      .get(fixtures.medicineId) as any;
    expect(batchRow.quantity_remaining).toBe(totalStock - totalTaken);
    expect(batchRow.quantity_remaining).toBeGreaterThanOrEqual(0);

    const dispenseLogSum = (
      verifyDb.prepare('SELECT COALESCE(SUM(quantity_dispensed),0) as s FROM dispense_log').get() as any
    ).s;
    expect(dispenseLogSum).toBe(totalTaken);
    verifyDb.close();

    // Prevent afterEach from closing the already-closed parent handle.
    db = setupTestDb(dbPath);
  }, 25000);
});
