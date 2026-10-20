// Test only (no screen, nothing saved in HMS): read supplier bill photos with Claude Haiku 5.5 and see how well and
// how cheaply it does. Photos in handoff/ai-test/bills (jpg/png/webp). For a photo "bill1.jpg", the correct values
// can be put in "bill1.expected.json" (same shape as the answer) to get a score.
//   Run:  npm run ai:test -w @platform/api      (the key is read from apps/api/.env.ai: ANTHROPIC_API_KEY=...)
// TODO(shortcut): test script; the real feature reads the photo in the API route behind the review screen.
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

// Which model and effort to try: AI_MODEL / AI_EFFORT (default: the cheapest, Claude Haiku 5.5 at low effort).
const MODEL = process.env.AI_MODEL ?? 'claude-haiku-5-5';
const EFFORT = (process.env.AI_EFFORT ?? 'low') as 'low' | 'medium' | 'high';
// USD per million tokens (prompts under 100K tokens).
const PRICES: Record<string, { inPerM: number; outPerM: number }> = { 'claude-haiku-5-5': { inPerM: 0.1, outPerM: 0.5 }, 'claude-sonnet-5-5': { inPerM: 2, outPerM: 10 } };
const PRICE = PRICES[MODEL];
if (!PRICE) throw new Error(`No price known for ${MODEL}`);
const TAG = `${MODEL.replace('claude-', '')}-${EFFORT}`;
const DIR = path.resolve(import.meta.dirname, '..', '..', '..', 'handoff', 'ai-test', 'bills');
const MEDIA: Record<string, 'image/jpeg' | 'image/png' | 'image/webp'> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const FIELD = z.enum(['hsn', 'mfr', 'name', 'pack', 'batch', 'expiry', 'qty', 'free', 'rate', 'mrp', 'value', 'gst']);
const Bill = z.object({
  vendorName: z.string().nullable(),
  billNo: z.string().nullable(),
  billDate: z.string().nullable().describe('As printed, e.g. 16-10-2026'),
  billTotal: z.number().nullable().describe('Grand total in rupees, as printed'),
  lines: z.array(
    z.object({
      hsn: z.string().nullable().describe('HSN code, as printed'),
      mfr: z.string().nullable().describe('Manufacturer short code, as printed (e.g. SUR, ALK)'),
      name: z.string().describe('Product name with strength, as printed'),
      pack: z.string().nullable().describe("Packing as printed, e.g. 10'S, 2ML, 90CM"),
      batch: z.string(),
      expiry: z.string().describe('As printed, e.g. 08/28'),
      qty: z.number(),
      free: z.number().nullable(),
      rate: z.number().describe('Rate per unit in rupees'),
      mrp: z.number().nullable(),
      value: z.number().nullable().describe('Line value / amount in rupees, as printed'),
      gst: z.number().nullable().describe('GST percent'),
      replacement: z.boolean().describe('True when the line is marked Repl (replacement for returned stock)'),
      unsure: z.array(FIELD).describe('Fields of this line that were hard to read'),
    }),
  ),
});
type Bill = z.infer<typeof Bill>;

const PROMPT = `This is a photo of a supplier's bill (invoice) for a hospital pharmacy in India.
Read every product line of the item table. Copy values exactly as printed; do not guess a value you cannot see:
use null for a missing optional value. List in "unsure" every field of a line that was hard to read.
Rupee amounts are plain numbers (18.50, not "Rs 18.50"). Skip totals, taxes summary and footer rows as lines.
Ignore handwritten ticks and marks on the bill. The photo may be sideways. The bill may continue on another page:
then billTotal is null when no grand total is printed on this page.
Read the table one printed row at a time, left to right, and keep every value with the row it is printed on:
never move a number up or down to fill a gap. Rows marked "Repl" (replacement for returned stock) print no rate
and no value: give them rate 0 and value null, and do not take the next row's rate. Each printed row is exactly one
line: do not repeat a row, and do not add a row that is not printed.`;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('No API key. Create apps/api/.env.ai with one line:  ANTHROPIC_API_KEY=<your key>');
  process.exit(1);
}
if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true });
  console.error(`Put the bill photos in ${DIR} and run again.`);
  process.exit(1);
}
const photos = fs.readdirSync(DIR).filter((f) => MEDIA[path.extname(f).toLowerCase()]);
if (!photos.length) {
  console.error(`No photos (jpg/png/webp) in ${DIR}.`);
  process.exit(1);
}

// A key made outside a workspace needs the workspace named on each request (ANTHROPIC_WORKSPACE_ID in .env.ai).
const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
const client = new Anthropic(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {});
const same = (a: unknown, b: unknown) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 0.005 : String(a ?? '').trim().toUpperCase() === String(b ?? '').trim().toUpperCase());
const totals = { photos: 0, inTok: 0, outTok: 0, usd: 0, fields: 0, right: 0 };
const report: string[] = [`# AI bill reading test (${MODEL}, effort ${EFFORT})`, '', `${new Date().toLocaleString('en-IN')}`, '', '| Photo | Lines | Unsure | Qty x rate ≠ value | Lines add up to total | Fields right | Tokens in / out | Cost (USD) | Seconds |', '|---|---|---|---|---|---|---|---|---|'];

for (const file of photos) {
  const bytes = fs.readFileSync(path.join(DIR, file));
  const started = Date.now();
  process.stdout.write(`${file} (${(bytes.length / 1024 / 1024).toFixed(1)} MB) … `);
  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000, // thinking counts toward it on this model
      output_config: { effort: EFFORT, format: zodOutputFormat(Bill) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: MEDIA[path.extname(file).toLowerCase()]!, data: bytes.toString('base64') } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });
    const secs = (Date.now() - started) / 1000;
    const usd = (res.usage.input_tokens * PRICE.inPerM + res.usage.output_tokens * PRICE.outPerM) / 1_000_000;
    totals.photos++;
    totals.inTok += res.usage.input_tokens;
    totals.outTok += res.usage.output_tokens;
    totals.usd += usd;
    if (res.stop_reason === 'refusal' || !res.parsed_output) {
      console.log(`not read (${res.stop_reason})`);
      report.push(`| ${file} | not read: ${res.stop_reason} | | | | | ${res.usage.input_tokens} / ${res.usage.output_tokens} | ${usd.toFixed(4)} | ${secs.toFixed(1)} |`);
      continue;
    }
    const bill: Bill = res.parsed_output;
    fs.writeFileSync(path.join(DIR, `${path.parse(file).name}.${TAG}.ai.json`), JSON.stringify(bill, null, 2));
    const sum = bill.lines.reduce((s, l) => s + (l.value ?? l.qty * l.rate), 0);
    // Each line on its own: does qty x rate give the printed value?
    const lineMath = bill.lines.filter((l) => l.value != null && Math.abs(l.qty * l.rate - l.value) > 1).length;
    const addsUp = bill.billTotal == null ? 'no total read' : Math.abs(sum - bill.billTotal) <= Math.max(1, bill.billTotal * 0.02) ? 'yes' : `no (${sum.toFixed(2)} vs ${bill.billTotal})`;
    let score = 'no .expected.json';
    const expectedFile = path.join(DIR, `${path.parse(file).name}.expected.json`);
    if (fs.existsSync(expectedFile)) {
      const want = JSON.parse(fs.readFileSync(expectedFile, 'utf8')) as Bill;
      let n = 0;
      let ok = 0;
      want.lines.forEach((w, i) => {
        const got = bill.lines.find((l) => same(l.batch, w.batch)) ?? bill.lines[i];
        for (const f of ['hsn', 'name', 'pack', 'batch', 'expiry', 'qty', 'free', 'rate', 'mrp', 'value'] as const) {
          if (w[f] == null) continue;
          n++;
          if (got && same(got[f], w[f])) ok++;
        }
      });
      totals.fields += n;
      totals.right += ok;
      score = `${ok}/${n}`;
    }
    const unsure = bill.lines.reduce((s, l) => s + l.unsure.length, 0);
    console.log(`${bill.lines.length} lines, ${score} right, $${usd.toFixed(4)}, ${secs.toFixed(1)} s`);
    report.push(`| ${file} | ${bill.lines.length} | ${unsure} | ${lineMath} | ${addsUp} | ${score} | ${res.usage.input_tokens} / ${res.usage.output_tokens} | ${usd.toFixed(4)} | ${secs.toFixed(1)} |`);
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `API error ${e.status}: ${e.message}` : String(e);
    console.log(msg);
    report.push(`| ${file} | error: ${msg.replace(/\|/g, '/')} | | | | | | | |`);
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError || e instanceof Anthropic.NotFoundError) break; // a wrong key: stop, don't try every photo
  }
}

const per = totals.photos ? totals.usd / totals.photos : 0;
report.push('', `**${totals.photos} photos read · total $${totals.usd.toFixed(4)} · about $${per.toFixed(4)} per photo · ${totals.photos ? Math.round(totals.inTok / totals.photos) : 0} tokens in per photo**`);
if (totals.fields) report.push('', `**Fields right: ${totals.right}/${totals.fields} (${((100 * totals.right) / totals.fields).toFixed(1)}%)**`);
const out = path.join(DIR, '..', `report-${TAG}.md`);
fs.writeFileSync(out, report.join('\n'));
console.log(`\nTotal $${totals.usd.toFixed(4)} for ${totals.photos} photos. Report: ${out}`);
