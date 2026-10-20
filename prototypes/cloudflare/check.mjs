// Runs against `npm run dev` (wrangler dev on :8787). Each hospital name = a fresh Durable Object = a fresh database.
const base = process.env.BASE ?? 'http://localhost:8787';
const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const stock = async (h) => Object.fromEntries((await (await fetch(`${base}/h/${h}/stock`)).json()).stock.map((r) => [r.medicineId, r.left]));
const tag = Date.now();

for (const mode of ['async', 'sync']) {
  const h = `rollback-${mode}-${tag}`;
  const { medicines } = await (await post(`/h/${h}/seed`, { stock: 10 })).json();
  const [para, syrup] = medicines.map((m) => m.id);
  // 3 Paracetamol is fine, 50 syrup is not: the whole sale must be refused AND the 3 tablets must come back.
  const r = await post(`/h/${h}/sale-${mode}`, { items: [{ medicineId: para, quantity: 3 }, { medicineId: syrup, quantity: 50 }] });
  const s = await stock(h);
  console.log(`[${mode}] two-item sale, second short -> ${r.status}; Paracetamol left ${s[para]} (must be 10): ${s[para] === 10 ? 'ROLLED BACK ✓' : 'NOT ROLLED BACK ✗'}`);
}

for (const mode of ['async', 'sync']) {
  const h = `race-${mode}-${tag}`;
  const { medicines } = await (await post(`/h/${h}/seed`, { stock: 10 })).json();
  const para = medicines[0].id;
  // 25 counters at the same moment, 1 tablet each, only 10 in stock.
  const res = await Promise.all(Array.from({ length: 25 }, () => post(`/h/${h}/sale-${mode}`, { items: [{ medicineId: para, quantity: 1 }] })));
  const ok = res.filter((x) => x.status === 201).length;
  const s = await stock(h);
  console.log(`[${mode}] 25 sales at once, 10 in stock -> ${ok} sold, ${res.length - ok} refused, stock left ${s[para]} (must be 0, never below): ${ok === 10 && s[para] === 0 ? '✓' : '✗'}`);
}

// Two hospitals never see each other's stock.
const a = `iso-a-${tag}`;
const b = `iso-b-${tag}`;
await post(`/h/${a}/seed`, { stock: 4 });
console.log(`isolation: hospital B before any seed has ${JSON.stringify(await stock(b))} (must be {}) ${Object.keys(await stock(b)).length === 0 ? '✓' : '✗'}`);

const t0 = Date.now();
const sc = await post('/scrypt');
console.log(`scrypt (HMS settings, 2 checks) -> ${sc.status} in ${Date.now() - t0} ms wall time (local; real CPU is shown after a deploy)`);
