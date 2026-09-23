// Small database helper used by the clinic's double-click tools
// (Backup to Pendrive, Restore Backup, Reset Admin Password, one-click update).
// Runs with the Node.js + node_modules already in C:\Aadhi Hospital -- no internet.
//
//   node db-tool.cjs backup <db> <destination>   safe copy of a live database
//   node db-tool.cjs check <db>                  integrity check + record counts (prints JSON)
//   node db-tool.cjs reset-admin <db>            admin password -> changeme123
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const [cmd, dbPath, dest] = process.argv.slice(2);

function count(db, table) {
  try { return db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c; } catch { return null; }
}

async function main() {
  if (!dbPath || !fs.existsSync(dbPath)) throw new Error(`Database not found: ${dbPath}`);

  if (cmd === 'backup') {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const db = new Database(dbPath, { fileMustExist: true });
    db.pragma('busy_timeout = 5000');
    await db.backup(dest);  // consistent even while the server is writing
    db.close();
    // Make the copy one self-contained file (no -wal/-shm side files on the pendrive).
    const copy = new Database(dest);
    copy.pragma('journal_mode = DELETE');
    copy.close();
    console.log(dest);
  } else if (cmd === 'check') {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const integrity = db.pragma('integrity_check', { simple: true });
    const result = {
      ok: integrity === 'ok',
      integrity,
      patients: count(db, 'patient'),
      users: count(db, 'user'),
      medicines: count(db, 'medicine'),
      labReports: count(db, 'lab_report'),
    };
    db.close();
    console.log(JSON.stringify(result));
    if (!result.ok || result.users === null) process.exit(2);
  } else if (cmd === 'reset-admin') {
    const argon2 = require('argon2');
    const hash = await argon2.hash('changeme123');
    const db = new Database(dbPath, { fileMustExist: true });
    db.pragma('busy_timeout = 5000');
    const role = db.prepare("SELECT id FROM role WHERE name = 'admin'").get();
    if (!role) throw new Error("This database has no 'admin' role.");
    const user = db.prepare("SELECT id FROM user WHERE username = 'admin'").get();
    if (user) {
      db.prepare(`UPDATE user SET password_hash = ?, role_id = ?, is_active = 1, deactivated_at = NULL,
                  updated_at = datetime('now', 'localtime') WHERE id = ?`).run(hash, role.id, user.id);
      db.prepare(`UPDATE session SET revoked_at = datetime('now', 'localtime')
                  WHERE user_id = ? AND revoked_at IS NULL`).run(user.id);
    } else {
      db.prepare('INSERT INTO user (full_name, username, password_hash, role_id) VALUES (?, ?, ?, ?)')
        .run('Administrator', 'admin', hash, role.id);
    }
    db.close();
    console.log('reset-ok');
  } else {
    throw new Error(`Unknown command: ${cmd}`);
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
