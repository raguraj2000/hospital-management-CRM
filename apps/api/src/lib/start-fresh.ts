// "Start fresh": after a trial period, remove everything that was entered while testing and keep the setup,
// so the hospital begins real use with empty patient lists and numbers that start again from 1.
// Run from the pendrive tool on the main computer (setup-tool.ts start-fresh); never from the web app.
import { sql } from 'drizzle-orm';
import type { Db } from '@platform/core';

/** What a hospital did while testing: always removed. */
export const TRIAL_TABLES = [
  'patient',
  'op_visit',
  'prescription_item',
  'treatment_dose',
  'visit_instruction',
  'visit_charge',
  'lab_order',
  'lab_result',
  'lab_release',
  'op_bill',
  'op_bill_line',
  'bill_payment',
  'pharmacy_sale',
  'pharmacy_sale_line',
  'audit_log',
  // Everyone signs in again; the day's and the UHID numbers start from 1 again.
  'session',
  'branch_counter',
  'org_counter',
] as const;

/** Stock received and what is owed to vendors: removed unless the hospital keeps its stock. */
export const STOCK_TABLES = ['medicine_batch', 'purchase_bill', 'purchase_line', 'vendor_payment'] as const;

/** The setup: staff, prices, lists. Never touched. */
export const SETUP_TABLES = [
  'organization',
  'branch',
  'user',
  'role',
  'role_permission',
  'branch_member',
  'branch_doctor',
  'clinic_setting',
  'lab_test',
  'lab_test_parameter',
  'medicine',
  'vendor',
  'treatment_bookmark',
  'treatment_bookmark_line',
] as const;

export interface StartFreshResult {
  /** Rows removed, by table (only tables that had any). */
  removed: Record<string, number>;
  /** Rows left in the setup tables. */
  kept: Record<string, number>;
}

/**
 * Removes the trial data in one transaction (all of it or none of it). `keepStock`: leave the medicine stock,
 * purchase bills and vendor payments exactly as they are now.
 */
export async function startFresh(db: Db, { keepStock }: { keepStock: boolean }): Promise<StartFreshResult> {
  const count = async (table: string) => (await db.all<{ n: number }>(sql.raw(`select count(*) as n from "${table}"`)))[0]!.n;
  const clear = [...TRIAL_TABLES, ...(keepStock ? [] : STOCK_TABLES)];
  const removed: Record<string, number> = {};
  for (const t of clear) {
    const n = await count(t);
    if (n) removed[t] = n;
  }
  // Rows point at each other (a bill at its visit, a sale line at its batch): the checks are off while the
  // tables are emptied together, as in a restore.
  const script = ['PRAGMA foreign_keys = OFF;', 'BEGIN;', ...clear.map((t) => `DELETE FROM "${t}";`), 'COMMIT;'].join('\n');
  try {
    await db.$client.executeMultiple(script);
  } catch (e) {
    await db.$client.executeMultiple('ROLLBACK;').catch(() => undefined);
    throw e;
  } finally {
    await db.$client.executeMultiple('PRAGMA foreign_keys = ON;').catch(() => undefined);
  }
  const kept: Record<string, number> = {};
  for (const t of [...SETUP_TABLES, ...(keepStock ? STOCK_TABLES : [])]) kept[t] = await count(t);
  return { removed, kept };
}
