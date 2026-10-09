// Enter a vendor's bill the way it is printed: packs, free packs, rate per pack, MRP, GST. Typed by hand,
// or read from the vendor's Excel / CSV file and checked here before saving.
import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, FileSpreadsheet, Plus, Trash2, TriangleAlert } from 'lucide-react';
import {
  findHeaderRow,
  FORM_UNIT,
  formatRupees,
  guessColumns,
  IMPORT_FIELDS,
  matchMedicineName,
  MEDICINE_FORMS,
  parseCsv,
  parseExpiry,
  parsePack,
  purchaseLineTotals,
  readImportLines,
  toPaise,
  type ImportCell,
  type ImportColumns,
  type ImportedLine,
  type ImportField,
  type Medicine,
  type MedicineForm,
  type PurchaseBillDetail,
  type PurchaseBillInput,
  type Vendor,
} from '@platform/shared';
import { Button, Card, CardHeader, Combobox, Dialog, Field, Input, NativeSelect, PageHeader, toast } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { fmtDay } from '@/components/format';
import { useCan } from '@/state/auth';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** One row of the entry table. Everything is text while it is being typed. */
interface Line {
  key: number;
  medicineId: number | null;
  /** The product name in the vendor's file, until it is matched to (or created as) a medicine. */
  fileName: string;
  batchNo: string;
  expiry: string;
  pack: string;
  qty: string;
  free: string;
  rate: string;
  mrp: string;
  gst: string;
  /** Set the selling price from the MRP. null = not chosen: yes only where the medicine has no price yet. */
  setPrice: boolean | null;
}
const emptyLine = (key: number): Line => ({ key, medicineId: null, fileName: '', batchNo: '', expiry: '', pack: '1', qty: '', free: '', rate: '', mrp: '', gst: '', setPrice: null });
const whole = (s: string) => Math.max(0, Math.floor(Number(s) || 0));

/** What a typed line comes to. */
function reckon(l: Line) {
  const packSize = Math.max(1, whole(l.pack));
  const ratePaise = toPaise(Number(l.rate) || 0); // per pack, before GST
  const line = { quantity: whole(l.qty), freeQty: whole(l.free), packSize, gstPercent: Math.max(0, Number(l.gst) || 0) };
  // costPerUnitPaise: what one tablet really cost (GST in, free ones spread). Not the rate.
  const { units, amountPaise, unitCostPaise: costPerUnitPaise } = purchaseLineTotals({ ...line, unitCostPaise: ratePaise });
  const mrpPaise = l.mrp.trim() === '' ? null : toPaise(Number(l.mrp) || 0);
  return { ...line, ratePaise, units, amountPaise, costPerUnitPaise, mrpPaise, pricePerUnitPaise: mrpPaise ? Math.round(mrpPaise / packSize) : null, expiryDate: parseExpiry(l.expiry) };
}

const medicineKey = (m: Medicine) => m.id;
const medicineLabel = (m: Medicine) => `${m.name}${m.strength ? ` ${m.strength}` : ''}`;
const cellInput = 'ml-auto w-20 text-right';

export function NewPurchaseBill() {
  const { branch } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canAddMedicine = useCan('inventory.manage');
  const vendors = useQuery({ queryKey: ['vendors', branch], queryFn: () => api.get<{ vendors: Vendor[] }>(`/b/${branch}/vendors`) });
  const meds = useQuery({ queryKey: ['medicines', branch], queryFn: () => api.get<{ medicines: Medicine[] }>(`/b/${branch}/medicines`) });
  const medicines = meds.data?.medicines ?? [];
  const [vendorId, setVendorId] = useState('');
  const [vendorBillNo, setVendorBillNo] = useState('');
  const [billDate, setBillDate] = useState(today());
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState<ImportCell[][] | null>(null);
  const [creating, setCreating] = useState<Line | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const filled = lines.filter((l) => l.medicineId || l.fileName || l.batchNo || l.qty);
  const total = useMemo(() => filled.reduce((s, l) => s + reckon(l).amountPaise, 0), [filled]);
  const unmatched = filled.filter((l) => !l.medicineId).length;
  /** Whether this line will also set the medicine's selling price, and to what. */
  const priceChange = (l: Line) => {
    const med = medicines.find((m) => m.id === l.medicineId);
    const price = reckon(l).pricePerUnitPaise;
    if (!med || !price || price === med.pricePaise) return null;
    return { med, price, on: l.setPrice ?? med.pricePaise === 0 };
  };

  async function openFile(file: File) {
    try {
      const isExcel = /\.xlsx$/i.test(file.name);
      if (/\.xls$/i.test(file.name)) throw new Error('This is an old Excel file (.xls). Open it in Excel and use Save As → .xlsx or .csv, then choose that file.');
      // The Excel reader is only loaded when an Excel file is actually opened.
      const rows = isExcel ? ((await (await import('read-excel-file/browser')).readSheet(file)) as ImportCell[][]) : parseCsv(await file.text());
      if (!rows.length) throw new Error('The file is empty.');
      setImporting(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'This file could not be read.');
    }
  }

  function addImported(found: ImportedLine[]) {
    const start = Math.max(...lines.map((x) => x.key)) + 1;
    const next: Line[] = found.map((f, i) => ({
      key: start + i,
      medicineId: matchMedicineName(f.name, medicines)?.id ?? null,
      fileName: f.name,
      batchNo: f.batchNo,
      expiry: f.expiryText || (f.expiryDate ?? ''), // as the vendor wrote it; the date it means shows underneath
      pack: String(f.packSize),
      qty: String(f.quantity),
      free: f.freeQty ? String(f.freeQty) : '',
      rate: String(f.rate),
      mrp: f.mrp != null ? String(f.mrp) : '',
      gst: f.gstPercent ? String(f.gstPercent) : '',
      setPrice: null,
    }));
    setLines((ls) => [...ls.filter((l) => l.medicineId || l.fileName || l.batchNo || l.qty), ...next]);
    setImporting(null);
    const matched = next.filter((l) => l.medicineId).length;
    toast.success(`${next.length} line${next.length === 1 ? '' : 's'} read from the file`, { description: matched < next.length ? `${next.length - matched} product${next.length - matched === 1 ? ' is' : 's are'} not in your medicine list yet: pick or create each one.` : 'Check them against the paper bill, then save.' });
  }

  async function save() {
    setErrors({});
    const badExpiry = filled.findIndex((l) => !reckon(l).expiryDate);
    if (unmatched || badExpiry >= 0) {
      if (badExpiry >= 0) setErrors({ [`lines.${badExpiry}.expiryDate`]: 'Type it as MM/YY or a date' });
      return toast.error(unmatched ? `Choose the medicine on ${unmatched} line${unmatched > 1 ? 's' : ''} first.` : `Line ${badExpiry + 1}: the expiry can't be read.`);
    }
    setSaving(true);
    try {
      const body: PurchaseBillInput = {
        vendorId: Number(vendorId) || 0,
        vendorBillNo,
        billDate,
        lines: filled.map((l) => {
          const r = reckon(l);
          const change = priceChange(l);
          return {
            medicineId: l.medicineId ?? 0,
            batchNo: l.batchNo,
            expiryDate: r.expiryDate!,
            quantity: r.quantity,
            freeQty: r.freeQty,
            packSize: r.packSize,
            unitCostPaise: r.ratePaise,
            gstPercent: r.gstPercent,
            mrpPaise: r.mrpPaise,
            sellingPricePaise: change?.on ? change.price : null,
          };
        }),
      };
      const { bill } = await api.post<{ bill: PurchaseBillDetail }>(`/b/${branch}/purchases`, body);
      for (const k of ['purchases', 'vendors', 'medicines', 'batches']) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success('Purchase bill saved', { description: `${filled.length} item${filled.length > 1 ? 's' : ''} added to stock · ${formatRupees(bill.totalPaise)}` });
      navigate(`/${branch}/vendors/purchases/${bill.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0]!])));
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link to={`/${branch}/vendors`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Vendors
      </Link>
      <PageHeader
        title="New purchase bill"
        description="Type it exactly as on the vendor's bill, or read their Excel / CSV file. Saving adds every line to stock."
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls,.csv,.txt,.tsv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ''; // the same file can be chosen again
                if (file) void openFile(file);
              }}
            />
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <FileSpreadsheet /> Import Excel / CSV
            </Button>
          </>
        }
      />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-3">
        <Field required label="Vendor" htmlFor="pb-vendor" error={errors.vendorId}>
          <NativeSelect id="pb-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">{vendors.data?.vendors.length === 0 ? 'Add a vendor first' : 'Choose vendor'}</option>
            {vendors.data?.vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.creditDays ? ` · ${v.creditDays} days credit` : ''}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Vendor's bill no." htmlFor="pb-no">
          <Input id="pb-no" className="font-mono" value={vendorBillNo} onChange={(e) => setVendorBillNo(e.target.value)} />
        </Field>
        <Field required label="Bill date" htmlFor="pb-date" error={errors.billDate}>
          <Input id="pb-date" type="date" value={billDate} max={today()} onChange={(e) => setBillDate(e.target.value)} />
        </Field>
      </Card>

      <Card>
        <CardHeader title="Items" description="One line per batch, in the vendor's own terms: 20 strips of 10 is Pack 10, Qty 20. The app works out the tablets." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-subtle/60 text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Medicine</th>
                <th className="px-2 py-2 font-medium">Batch no.</th>
                <th className="px-2 py-2 font-medium">Expiry</th>
                <th className="px-2 py-2 text-right font-medium">Pack</th>
                <th className="px-2 py-2 text-right font-medium">Qty</th>
                <th className="px-2 py-2 text-right font-medium">Free</th>
                <th className="px-2 py-2 text-right font-medium">Rate (₹)</th>
                <th className="px-2 py-2 text-right font-medium">MRP (₹)</th>
                <th className="px-2 py-2 text-right font-medium">GST %</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const med = medicines.find((m) => m.id === l.medicineId);
                const r = reckon(l);
                const change = priceChange(l);
                const err = (f: string) => errors[`lines.${i}.${f}`];
                const n = i + 1;
                return (
                  <tr key={l.key} className="border-t border-border align-top">
                    <td className="min-w-64 px-3 py-2">
                      <Combobox
                        aria-label={`Line ${n} medicine`}
                        aria-invalid={!!err('medicineId') || (!!l.fileName && !l.medicineId)}
                        options={medicines}
                        value={l.medicineId}
                        onChange={(id) => setLine(l.key, { medicineId: id == null ? null : Number(id) })}
                        getKey={medicineKey}
                        getLabel={medicineLabel}
                        placeholder="Search medicine…"
                        emptyText="No medicine with that name"
                      />
                      {l.fileName && !l.medicineId && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                          <span className="font-medium text-critical">
                            <TriangleAlert className="mr-1 inline size-3.5" />
                            In the file: {l.fileName}
                          </span>
                          {canAddMedicine && (
                            <button type="button" className="font-medium text-brand hover:underline" onClick={() => setCreating(l)}>
                              Create as new medicine
                            </button>
                          )}
                        </div>
                      )}
                      {change && (
                        <label className="mt-1 flex items-center gap-1.5 text-xs">
                          <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={change.on} onChange={(e) => setLine(l.key, { setPrice: e.target.checked })} />
                          Set selling price to {formatRupees(change.price)} / {FORM_UNIT[change.med.form]} <span className="text-muted">(now {formatRupees(change.med.pricePaise)})</span>
                        </label>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Input aria-label={`Line ${n} batch`} className="w-28 font-mono uppercase" value={l.batchNo} onChange={(e) => setLine(l.key, { batchNo: e.target.value })} aria-invalid={!!err('batchNo')} />
                    </td>
                    <td className="px-2 py-2">
                      <Input aria-label={`Line ${n} expiry`} placeholder="MM/YY" className="w-24" value={l.expiry} onChange={(e) => setLine(l.key, { expiry: e.target.value })} aria-invalid={!!err('expiryDate') || (l.expiry !== '' && !r.expiryDate)} />
                      <div className={`mt-1 text-xs ${err('expiryDate') ? 'text-critical' : 'text-muted'}`}>{err('expiryDate') ?? (r.expiryDate ? fmtDay(r.expiryDate) : l.expiry ? 'MM/YY or a date' : '')}</div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input aria-label={`Line ${n} pack`} inputMode="numeric" className="ml-auto w-16 text-right" value={l.pack} onChange={(e) => setLine(l.key, { pack: e.target.value })} onBlur={() => setLine(l.key, { pack: String(parsePack(l.pack)) })} aria-invalid={!!err('packSize')} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input aria-label={`Line ${n} quantity`} inputMode="numeric" className={cellInput} value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} aria-invalid={!!err('quantity')} />
                      {r.units > 0 && med && (
                        <div className="mt-1 text-xs whitespace-nowrap text-muted">
                          = {r.units} {FORM_UNIT[med.form]}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input aria-label={`Line ${n} free`} inputMode="numeric" className="ml-auto w-16 text-right" value={l.free} onChange={(e) => setLine(l.key, { free: e.target.value })} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input aria-label={`Line ${n} rate`} inputMode="decimal" className={cellInput} value={l.rate} onChange={(e) => setLine(l.key, { rate: e.target.value })} aria-invalid={!!err('unitCostPaise')} />
                      {r.units > 0 && r.costPerUnitPaise > 0 && r.costPerUnitPaise !== r.ratePaise && <div className="mt-1 text-xs whitespace-nowrap text-muted">{formatRupees(r.costPerUnitPaise)} each</div>}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input aria-label={`Line ${n} MRP`} inputMode="decimal" className={cellInput} value={l.mrp} onChange={(e) => setLine(l.key, { mrp: e.target.value })} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input aria-label={`Line ${n} GST`} inputMode="decimal" className="ml-auto w-14 text-right" value={l.gst} onChange={(e) => setLine(l.key, { gst: e.target.value })} aria-invalid={!!err('gstPercent')} />
                    </td>
                    <td className="px-3 py-2 pt-4 text-right font-medium tabular-nums">{formatRupees(r.amountPaise)}</td>
                    <td className="px-1 py-2">
                      {lines.length > 1 && (
                        <Button size="icon-sm" variant="ghost" aria-label={`Remove line ${n}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                          <Trash2 className="text-critical" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, emptyLine(Math.max(...ls.map((x) => x.key)) + 1)])}>
            <Plus /> Add line
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted">Bill total, with GST — check it against the paper</div>
              <div className="text-2xl font-semibold tabular-nums">{formatRupees(total)}</div>
            </div>
            <Button size="lg" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save & add to stock'}
            </Button>
          </div>
        </div>
      </Card>

      {importing && <ImportDialog rows={importing} onClose={() => setImporting(null)} onRead={addImported} />}
      {creating && (
        <CreateMedicineDialog
          branch={branch!}
          line={creating}
          pricePaise={reckon(creating).pricePerUnitPaise ?? 0}
          onClose={() => setCreating(null)}
          onCreated={async (id) => {
            await meds.refetch();
            // Every line of the file with that product name is now this medicine.
            setLines((ls) => ls.map((l) => (!l.medicineId && l.fileName === creating.fileName ? { ...l, medicineId: id } : l)));
            setCreating(null);
          }}
        />
      )}
    </div>
  );
}

/** Which column of the file is what. Guessed from the header; the user corrects it; the first rows show what will be read. */
function ImportDialog({ rows, onClose, onRead }: { rows: ImportCell[][]; onClose: () => void; onRead: (lines: ImportedLine[]) => void }) {
  const guessed = findHeaderRow(rows);
  const [headerRow, setHeaderRow] = useState(Math.max(0, guessed));
  const [columns, setColumns] = useState<ImportColumns>(() => guessColumns(rows[Math.max(0, guessed)] ?? []));
  const header = rows[headerRow] ?? [];
  const width = Math.max(...rows.slice(0, 50).map((r) => r.length));
  const found = readImportLines(rows, headerRow, columns);
  const missing = IMPORT_FIELDS.filter((f) => f.required && columns[f.key] == null);
  const title = (i: number) => String(header[i] ?? '').trim() || `Column ${i + 1}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title="Read the vendor's file" description="Tell the app which column is which. It is guessed from the headings; correct anything that is wrong.">
      <div className="space-y-4">
        <Field label="Row with the column headings" htmlFor="import-header" hint={guessed < 0 ? 'No heading row was recognised: choose it.' : undefined}>
          <NativeSelect
            id="import-header"
            value={headerRow}
            onChange={(e) => {
              const at = Number(e.target.value);
              setHeaderRow(at);
              setColumns(guessColumns(rows[at] ?? []));
            }}
          >
            {rows.slice(0, 25).map((r, i) => (
              <option key={i} value={i}>
                Row {i + 1}: {r.map((c) => String(c ?? '')).filter(Boolean).join(' | ').slice(0, 70)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {IMPORT_FIELDS.map((f) => (
            <Field key={f.key} required={f.required} label={f.label} htmlFor={`import-${f.key}`}>
              <NativeSelect id={`import-${f.key}`} value={columns[f.key] ?? ''} aria-invalid={f.required && columns[f.key] == null} onChange={(e) => setColumns((c) => ({ ...c, [f.key as ImportField]: e.target.value === '' ? null : Number(e.target.value) }))}>
                <option value="">Not in the file</option>
                {Array.from({ length: width }, (_, i) => (
                  <option key={i} value={i}>
                    {title(i)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ))}
        </div>
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-3 py-2 text-sm font-medium">
            {found.length} item line{found.length === 1 ? '' : 's'} will be read{found.length > 3 ? ' — the first three:' : ':'}
          </div>
          <ul className="divide-y divide-border text-sm">
            {found.slice(0, 3).map((f) => (
              <li key={f.row} className="px-3 py-2">
                <span className="font-medium">{f.name}</span>
                <span className="text-muted">
                  {' '}
                  · batch {f.batchNo || '—'} · exp {f.expiryDate ? fmtDay(f.expiryDate) : `${f.expiryText || '—'} (not read)`} · pack {f.packSize} × {f.quantity}
                  {f.freeQty ? ` + ${f.freeQty} free` : ''} · ₹{f.rate}
                  {f.gstPercent ? ` + ${f.gstPercent}% GST` : ''}
                </span>
              </li>
            ))}
            {found.length === 0 && <li className="px-3 py-2 text-muted">Nothing yet. An item line needs a product name and a whole-number quantity.</li>}
          </ul>
        </div>
        {missing.length > 0 && <p className="text-sm font-medium text-critical">Choose the column for: {missing.map((f) => f.label).join(', ')}.</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={missing.length > 0 || found.length === 0} onClick={() => onRead(found)}>
            Read {found.length} line{found.length === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** A product of the vendor's file that is not in the medicine list yet. */
function CreateMedicineDialog({ branch, line, pricePaise, onClose, onCreated }: { branch: string; line: Line; pricePaise: number; onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState(line.fileName);
  const [form, setForm] = useState<MedicineForm>(/\binj|vial|amp/i.test(line.fileName) ? 'injection' : /syr|susp|liq|\bml\b/i.test(line.fileName) ? 'syrup' : /\bcap/i.test(line.fileName) ? 'capsule' : /oint|cream|gel/i.test(line.fileName) ? 'ointment' : 'tablet');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title="Create as new medicine" description={`“${line.fileName}” from the vendor's file. Selling price ${formatRupees(pricePaise)} per unit, from the MRP — it can be changed in Inventory.`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError('');
          try {
            const { id } = await api.post<{ id: number }>(`/b/${branch}/medicines`, { name, form, pricePaise });
            toast.success(`${name} added to the medicine list`);
            onCreated(id);
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field required label="Name" htmlFor="new-med-name" error={error || undefined}>
          <Input id="new-med-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field required label="Form" htmlFor="new-med-form">
          <NativeSelect id="new-med-form" value={form} onChange={(e) => setForm(e.target.value as MedicineForm)}>
            {MEDICINE_FORMS.map((f) => (
              <option key={f} value={f}>
                {f[0]!.toUpperCase() + f.slice(1)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || name.trim().length < 2}>
            {saving ? 'Saving…' : 'Create medicine'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
