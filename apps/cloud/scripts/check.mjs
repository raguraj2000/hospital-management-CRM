// Checks against the Cloudflare version running under `wrangler dev` (local test flag on).
//   node scripts/check.mjs [base]   (default http://127.0.0.1:8788)
const base = process.argv[2] ?? 'http://127.0.0.1:8788';
let bad = 0;
const say = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? '✓' : '✗'} ${msg}`); };

const rb = await (await fetch(`${base}/api/__check/rollback`)).json();
say(rb.rolledBack === true, `HMS transaction fails after a write -> the write is undone (rowsLeft ${rb.rowsLeft})`);

const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobile: '9000000000', password: 'e2e-password' }) });
const cookie = login.headers.get('set-cookie').split(';')[0];
const call = (method, p, body) => fetch(`${base}/api/b/main${p}`, { method, headers: { cookie, 'content-type': 'application/json', origin: base }, body: body ? JSON.stringify(body) : undefined });
const { id: med } = await (await call('POST', '/medicines', { name: `Race Tab ${Date.now()}`, form: 'tablet', pricePaise: 100 })).json();
await call('POST', `/medicines/${med}/batches`, { batchNo: 'R1', expiryDate: '2028-01-01', quantity: 10 });
const res = await Promise.all(Array.from({ length: 25 }, () => call('POST', '/pharmacy/sales', { items: [{ medicineId: med, quantity: 1 }], paymentMode: 'cash' })));
const sold = res.filter((r) => r.status === 201).length;
const batches = (await (await call('GET', `/medicines/${med}/batches`)).json()).batches;
const left = batches.reduce((s, b) => s + b.quantity, 0);
say(sold === 10 && left === 0, `25 counters at once, 10 in stock (real API) -> ${sold} sold, ${res.length - sold} refused, ${left} left`);
process.exit(bad ? 1 : 0);
