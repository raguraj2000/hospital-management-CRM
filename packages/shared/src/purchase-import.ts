// Reading a vendor's invoice file (Excel / CSV) into purchase lines. Every vendor's billing software names
// and orders its columns differently, so: find the header row, guess which column is what, let the user
// correct the guess, then read the rows. Nothing here talks to the server.

export type ImportCell = string | number | boolean | Date | null | undefined;

export const IMPORT_FIELDS = [
  { key: 'name', label: 'Product name', required: true },
  { key: 'batch', label: 'Batch no.', required: true },
  { key: 'expiry', label: 'Expiry', required: true },
  { key: 'pack', label: 'Pack', required: false },
  { key: 'qty', label: 'Qty', required: true },
  { key: 'free', label: 'Free qty', required: false },
  { key: 'rate', label: 'Rate', required: true },
  { key: 'mrp', label: 'MRP', required: false },
  { key: 'gst', label: 'GST %', required: false },
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number]['key'];
/** Which column of the file holds each field; null = the file has no such column. */
export type ImportColumns = Record<ImportField, number | null>;

// Tried in this order, each column used once: the unmistakable words first ("mrp" before "rate", "free" before "qty").
const HINTS: [ImportField, RegExp][] = [
  ['mrp', /^m\W*r\W*p|max.*retail/],
  ['batch', /batch|lot\b/],
  ['expiry', /^exp/],
  ['pack', /pack|^unit$|^uom$/],
  ['free', /free|^f\W*r$|scheme|bonus/],
  ['gst', /gst|tax\W*%|^tax$|igst/],
  ['qty', /qty|quantity|^nos$/],
  ['rate', /rate|ptr|cost|price/],
  ['name', /product|item|descri|particular|medicine|^name$/],
];
const text = (v: ImportCell) => (v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());

/** Guess the columns from one header row. */
export function guessColumns(header: ImportCell[]): ImportColumns {
  const titles = header.map((h) => text(h).toLowerCase());
  const columns = Object.fromEntries(IMPORT_FIELDS.map((f) => [f.key, null])) as ImportColumns;
  const used = new Set<number>();
  for (const [field, hint] of HINTS) {
    const i = titles.findIndex((t, at) => !used.has(at) && hint.test(t));
    if (i >= 0) {
      columns[field] = i;
      used.add(i);
    }
  }
  return columns;
}

/** The header is the first of the top rows where at least three columns are recognised (files often start with the vendor's address). -1 = none. */
export function findHeaderRow(rows: ImportCell[][]): number {
  return rows.slice(0, 25).findIndex((r) => Object.values(guessColumns(r)).filter((c) => c != null).length >= 3);
}

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** A month and year only: the medicine is good until the LAST day of that month. */
const monthEnd = (year: number, month: number) => (month >= 1 && month <= 12 ? `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}` : null);
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

/**
 * An expiry as vendors write it -> YYYY-MM-DD, or null if it can't be read.
 * "06/31", "6-2031", "Jun-31", "JUN 2031" = the end of that month; "30/06/2031", "2031-06-30" and Excel dates = that day.
 */
export function parseExpiry(v: ImportCell): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const s = text(v).toLowerCase();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s); // day first, as in India
  if (m && Number(m[2]) <= 12 && Number(m[1]) <= 31) return `${fullYear(Number(m[3]))}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  m = /^(\d{1,2})\s*[/.-]\s*(\d{2}|\d{4})$/.exec(s);
  if (m) return monthEnd(fullYear(Number(m[2])), Number(m[1]));
  m = /^([a-z]{3})[a-z]*\W*(\d{2}|\d{4})$/.exec(s);
  if (m && MONTHS.includes(m[1]!)) return monthEnd(fullYear(Number(m[2])), MONTHS.indexOf(m[1]!) + 1);
  return null;
}

/**
 * Units in one pack from the invoice's "Packing" column: "10'S", "15,S", "10 TAB", "1X10" = that many;
 * a measure ("2ML", "5GM", "90CM", "VIAL") or nothing = 1, sold as one piece.
 */
export function parsePack(v: ImportCell): number {
  const s = text(v).toLowerCase();
  const m = /^(?:\d+\s*[x*]\s*)?(\d+)\s*(?:['’`,.]?\s*s|tabs?|tablets?|caps?|capsules?)?$/.exec(s);
  const n = m ? Number(m[1]) : 1;
  return n >= 1 && n <= 10_000 ? n : 1;
}

/** "1,424.00" / "₹ 71.20" / 71.2 -> 71.2; anything else -> null. */
export function parseAmount(v: ImportCell): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = text(v).replace(/[₹,\s]|rs\.?/gi, '');
  return s !== '' && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

export interface ImportedLine {
  /** Row number in the file, for messages. */
  row: number;
  name: string;
  batchNo: string;
  /** YYYY-MM-DD, or null with the raw text kept in `expiryText`. */
  expiryDate: string | null;
  expiryText: string;
  packSize: number;
  quantity: number;
  freeQty: number;
  /** Rupees per pack, before GST. */
  rate: number;
  mrp: number | null;
  gstPercent: number;
}

/** The rows under the header that are items: they have a name and a quantity (totals and blank rows have not). */
export function readImportLines(rows: ImportCell[][], headerRow: number, columns: ImportColumns): ImportedLine[] {
  const cell = (r: ImportCell[], f: ImportField) => (columns[f] == null ? null : r[columns[f]!]);
  const lines: ImportedLine[] = [];
  rows.slice(headerRow + 1).forEach((r, i) => {
    const name = text(cell(r, 'name'));
    const quantity = parseAmount(cell(r, 'qty'));
    if (!name || !quantity || quantity <= 0 || !Number.isInteger(quantity)) return;
    lines.push({
      row: headerRow + 2 + i,
      name,
      batchNo: text(cell(r, 'batch')),
      expiryDate: parseExpiry(cell(r, 'expiry')),
      expiryText: text(cell(r, 'expiry')),
      packSize: parsePack(cell(r, 'pack')),
      quantity,
      freeQty: Math.max(0, Math.floor(parseAmount(cell(r, 'free')) ?? 0)),
      rate: parseAmount(cell(r, 'rate')) ?? 0,
      mrp: parseAmount(cell(r, 'mrp')),
      gstPercent: Math.max(0, parseAmount(cell(r, 'gst')) ?? 0),
    });
  });
  return lines;
}

/** A CSV (or tab / semicolon separated) file as rows of text. Quoted cells may hold the separator, quotes ("") and line breaks. */
export function parseCsv(csv: string): string[][] {
  const firstLine = csv.slice(0, csv.search(/\r?\n/) >>> 0);
  const sep = [',', '\t', ';'].map((s) => [s, firstLine.split(s).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]!;
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ''));
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** The medicine an invoice line names, if one has exactly that name (ignoring case, spaces and punctuation; with or without the strength). */
export function matchMedicineName<T extends { name: string; strength: string | null }>(name: string, medicines: T[]): T | null {
  const wanted = squash(name);
  return medicines.find((m) => squash(m.name) === wanted || squash(`${m.name}${m.strength ?? ''}`) === wanted) ?? null;
}
