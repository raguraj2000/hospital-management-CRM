// Guards against a Node.js 24.19+ bug (nodejs/node#65446): a native addon that
// uses node::ObjectWrap, as better-sqlite3's Statement does, aborts the whole
// process with "Assertion failed: (env) != nullptr" whenever V8 collects one
// on its own -- IF the addon was compiled against Node >= 24.19.0 headers.
// On the clinic server that shows up as a random crash under normal use.
//
// Working mitigation (from the upstream issue): build better-sqlite3 against
// Node 24.18.1 headers. It still runs on newer 24.x runtimes. Rebuild with:
//   set npm_config_target=24.18.1 && set npm_config_build_from_source=true && npm rebuild better-sqlite3
//
// This script reproduces the crash deterministically (5/5 on a bad build,
// 0/5 on a good one). package-for-handoff.ps1 runs it and refuses to build a
// pendrive with a crashing binary. Exit 0 = safe.
const path = require('node:path');
const root = path.join(__dirname, '..');
require(path.join(root, 'node_modules', 'argon2'));
const Database = require(path.join(root, 'node_modules', 'better-sqlite3'));
const db = new Database(':memory:');
let junk = [];
for (let i = 0; i < 300000; i++) {
  db.prepare('SELECT 1'); // a Statement that is immediately unreachable
  junk.push({ a: i, s: 'x' + i }); // keep allocating so V8 collects by itself
  if (junk.length > 1000) junk = [];
}
db.close();
console.log('native-gc-ok');
