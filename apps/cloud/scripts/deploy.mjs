// HMS on Cloudflare, from this PC. Always the HMS account: this PC's CLOUDFLARE_ACCOUNT_ID points at another
// account (other projects), so it is overridden here for every command.
//   node scripts/deploy.mjs staging      build + deploy to hms-staging
//   node scripts/deploy.mjs production   build + deploy to hms (production)
//   node scripts/deploy.mjs rollback     production back to the version before the latest
import { execSync } from 'node:child_process';
import path from 'node:path';
const HMS_ACCOUNT = 'bc8509d94dbc0fc835d6bf44ed033c5c';
const cloud = path.resolve(import.meta.dirname, '..');
const root = path.resolve(cloud, '..', '..');
const env = { ...process.env, CLOUDFLARE_ACCOUNT_ID: HMS_ACCOUNT };
const run = (cmd, cwd = cloud) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, env, stdio: 'inherit' });
};
const what = process.argv[2];
if (what === 'staging' || what === 'production') {
  run('node scripts/gen-migrations.mjs');
  run('npm run build -w @platform/web', root);
  run(`npx wrangler deploy${what === 'staging' ? ' --env staging' : ''}`);
} else if (what === 'rollback') {
  run(`npx wrangler rollback --name hms -y -m "${process.argv[3] ?? 'rollback from this PC'}"`);
} else {
  console.error('Use: node scripts/deploy.mjs staging | production | rollback ["reason"]');
  process.exit(1);
}
