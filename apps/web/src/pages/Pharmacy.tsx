import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { AlertTriangle, PackageCheck, Pill, Printer, ReceiptText, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { FORM_UNIT, formatRupees, PAYMENT_MODES, type Medicine, type Patient, type PaymentMode, type PharmacyQueueEntry, type PharmacySale } from '@platform/shared';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, NativeSelect, PageHeader, Skeleton, Table, Tabs, TabsContent, TabsList, TabsTrigger, TBody, TD, TH, THead, toast, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useBranch, useCan } from '@/state/auth';
import { visitLabel } from '@/components/Visits';

const modeLabel: Record<PaymentMode, string> = { cash: 'Cash', upi: 'UPI', card: 'Card' };
const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const printUrl = (branch: string, saleId: number) => `/${branch}/pharmacy/sales/${saleId}/print`;
/** Same limit as the server (directSaleSchema). */
const MAX_QTY = 10_000;

export function Pharmacy() {
  const { branch } = useParams();
  const current = useBranch();
  const queue = useQuery({
    queryKey: ['pharmacy-queue', branch],
    queryFn: () => api.get<{ queue: PharmacyQueueEntry[] }>(`/b/${branch}/pharmacy/queue`),
    refetchInterval: 20_000, // new prescriptions appear without reloading
  });
  const sales = useQuery({ queryKey: ['pharmacy-sales', branch], queryFn: () => api.get<{ sales: PharmacySale[]; totalPaise: number }>(`/b/${branch}/pharmacy/sales`) });
  const waiting = queue.data?.queue.length ?? 0;

  return (
    <div>
      <PageHeader title="Pharmacy" description={`Prescriptions waiting at ${current?.name}. Tick what the patient buys, then dispense.`} />
      <Tabs defaultValue="queue">
        <TabsList className="mb-4">
          <TabsTrigger value="queue">
            Waiting {waiting > 0 && <Badge tone="warning">{waiting}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="direct">Direct sale</TabsTrigger>
          <TabsTrigger value="sales">
            Today's sales {sales.data && <span className="text-xs text-muted tabular-nums">{formatRupees(sales.data.totalPaise)}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {queue.isLoading ? (
            <Skeleton className="h-48" />
          ) : queue.error ? (
            <Card className="p-4 text-sm text-critical">{errorMessage(queue.error)}</Card>
          ) : waiting === 0 ? (
            <Card>
              <EmptyState icon={PackageCheck} title="Nothing waiting" description="Prescriptions written by doctors show up here automatically." />
            </Card>
          ) : (
            queue.data!.queue.map((entry) => <QueueCard key={entry.visitId} branch={branch!} entry={entry} />)
          )}
        </TabsContent>

        {/* Stays mounted, so the cart survives a look at the other tabs. */}
        <TabsContent value="direct" forceMount className="data-[state=inactive]:hidden">
          <DirectSale branch={branch!} />
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            {sales.isLoading ? (
              <Skeleton className="m-4 h-32" />
            ) : sales.error ? (
              <p className="p-4 text-sm text-critical">{errorMessage(sales.error)}</p>
            ) : !sales.data?.sales.length ? (
              <EmptyState icon={ReceiptText} title="No sales yet today" />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Bill no.</TH>
                    <TH>Patient</TH>
                    <TH className="hidden md:table-cell">Medicines</TH>
                    <TH>Paid by</TH>
                    <TH className="text-right">Amount</TH>
                    <TH className="text-right">Bill</TH>
                  </tr>
                </THead>
                <TBody>
                  {sales.data.sales.map((s) => (
                    <TR key={s.id}>
                      <TD className="font-mono text-xs whitespace-nowrap">{s.saleNo}</TD>
                      <TD>
                        {s.patientName} {s.visitId == null && <Badge tone="brand">Direct</Badge>}
                      </TD>
                      <TD className="hidden max-w-sm truncate text-muted md:table-cell">{s.lines.map((l) => `${l.medicineName} ×${l.quantity}`).join(', ')}</TD>
                      <TD>
                        <Badge>{modeLabel[s.paymentMode]}</Badge>
                      </TD>
                      <TD className="text-right font-medium tabular-nums">{formatRupees(s.totalPaise)}</TD>
                      <TD className="text-right">
                        <a href={printUrl(branch!, s.id)} target="_blank" rel="noopener" aria-label={`Print bill ${s.saleNo}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                          <Printer className="size-3.5" /> Print
                        </a>
                      </TD>
                    </TR>
                  ))}
                  <TR className="bg-subtle/50 font-semibold">
                    <TD colSpan={3} className="hidden md:table-cell">
                      Total today
                    </TD>
                    <TD colSpan={2} className="text-right tabular-nums md:hidden">
                      Total today {formatRupees(sales.data.totalPaise)}
                    </TD>
                    <TD className="hidden md:table-cell" />
                    <TD className="hidden text-right tabular-nums md:table-cell">{formatRupees(sales.data.totalPaise)}</TD>
                    <TD />
                  </TR>
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** One patient's prescription: all lines ticked by default; untick what they don't buy. */
function QueueCard({ branch, entry }: { branch: string; entry: PharmacyQueueEntry }) {
  const qc = useQueryClient();
  const [ticked, setTicked] = useState<number[]>(() => entry.items.filter((i) => i.stock >= i.quantity).map((i) => i.id));
  const [mode, setMode] = useState<PaymentMode>('cash');
  const chosen = entry.items.filter((i) => ticked.includes(i.id));
  const total = chosen.reduce((s, i) => s + i.quantity * i.pricePaise, 0);
  const shortOnTicked = chosen.some((i) => i.stock < i.quantity);

  const dispense = useMutation({
    mutationFn: () => api.post<{ sale: { saleNo: string; totalPaise: number } }>(`/b/${branch}/pharmacy/dispense`, { visitId: entry.visitId, itemIds: ticked, paymentMode: mode }),
    onSuccess: ({ sale }) => {
      toast.success(`Dispensed · ${sale.saleNo}`, { description: `${formatRupees(sale.totalPaise)} received by ${modeLabel[mode]}. Stock updated.` });
      qc.invalidateQueries({ queryKey: ['pharmacy-queue', branch] });
      qc.invalidateQueries({ queryKey: ['pharmacy-sales', branch] });
      qc.invalidateQueries({ queryKey: ['medicines', branch] });
      qc.invalidateQueries({ queryKey: ['prescription', branch, entry.visitId] });
      qc.invalidateQueries({ queryKey: ['patient-bills', branch] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card>
      <CardHeader
        icon={Pill}
        iconTone="violet"
        title={
          <span className="flex items-center gap-2">
            <Avatar name={entry.patientName} size="sm" />
            <Link to={`/${branch}/visits/${entry.visitId}`} className="hover:underline">
              {entry.patientName}
            </Link>
          </span>
        }
        description={`${visitLabel(entry)} · ${entry.patientUhid}${entry.doctorName ? ` · ${entry.doctorName}` : ''}`}
      />
      <Table>
        <THead>
          <tr>
            <TH className="w-10" />
            <TH>Medicine</TH>
            <TH className="hidden sm:table-cell">Dose</TH>
            <TH className="text-right">Qty</TH>
            <TH className="text-right">Price</TH>
            <TH className="text-right">Amount</TH>
          </tr>
        </THead>
        <TBody>
          {entry.items.map((i) => {
            const short = i.stock < i.quantity;
            return (
              <TR key={i.id} className={ticked.includes(i.id) ? '' : 'opacity-50'}>
                <TD>
                  <input
                    type="checkbox"
                    aria-label={`Sell ${i.medicineName}`}
                    className="size-4 accent-[var(--color-primary)]"
                    checked={ticked.includes(i.id)}
                    onChange={(e) => setTicked((t) => (e.target.checked ? [...t, i.id] : t.filter((x) => x !== i.id)))}
                  />
                </TD>
                <TD>
                  <div className="font-medium">
                    {i.medicineName} {i.strength && <span className="text-muted">{i.strength}</span>}
                  </div>
                  {short ? (
                    <div className="flex items-center gap-1 text-xs font-medium text-critical">
                      <AlertTriangle className="size-3" /> Only {i.stock} in stock
                    </div>
                  ) : (
                    i.instructions && <div className="text-xs text-muted">{i.instructions}</div>
                  )}
                </TD>
                <TD className="hidden whitespace-nowrap text-muted sm:table-cell">
                  {i.dose} × {i.days}d
                </TD>
                <TD className="text-right tabular-nums">
                  {i.quantity} <span className="text-xs text-muted">{FORM_UNIT[i.form]}</span>
                </TD>
                <TD className="text-right text-muted tabular-nums">{formatRupees(i.pricePaise)}</TD>
                <TD className="text-right font-medium tabular-nums">{formatRupees(i.quantity * i.pricePaise)}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
      <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs text-muted">
            Total for {chosen.length} of {entry.items.length} medicine{entry.items.length > 1 ? 's' : ''}
          </div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">{formatRupees(total)}</div>
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect aria-label="Paid by" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} className="w-28">
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {modeLabel[m]}
              </option>
            ))}
          </NativeSelect>
          <Button size="lg" disabled={!chosen.length || shortOnTicked || dispense.isPending} onClick={() => dispense.mutate()}>
            <PackageCheck /> {dispense.isPending ? 'Dispensing…' : `Dispense ${formatRupees(total)}`}
          </Button>
        </div>
      </div>
      {ticked.length < entry.items.length && chosen.length > 0 && (
        <p className="border-t border-border bg-subtle/50 px-4 py-2 text-xs text-muted">Unticked medicines will be marked “not bought”.</p>
      )}
    </Card>
  );
}

/** Over-the-counter sale: no prescription. Pick medicines into a cart; the customer is optional. */
function DirectSale({ branch }: { branch: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ medicineId: number; qty: string }[]>([]);
  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [lastSale, setLastSale] = useState<{ id: number; saleNo: string; totalPaise: number } | null>(null);
  const meds = useQuery({ queryKey: ['medicines', branch], queryFn: () => api.get<{ medicines: Medicine[] }>(`/b/${branch}/medicines`) });

  const q = search.trim().toLowerCase();
  const matches = q ? (meds.data?.medicines ?? []).filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8) : [];
  // Stock, batch and price always come from the latest medicine list, not from when the row was added.
  const rows = cart.map((c) => {
    const med = meds.data?.medicines.find((m) => m.id === c.medicineId);
    const qty = Number(c.qty);
    const problem = !med
      ? 'No longer in the medicine list. Remove it.'
      : !Number.isInteger(qty) || qty < 1
        ? 'Enter a whole number, 1 or more'
        : qty > MAX_QTY
          ? `At most ${MAX_QTY} at a time`
          : qty > med.stock
            ? `Only ${med.stock} in stock`
            : null;
    return { ...c, med, quantity: qty, problem, amountPaise: med && !problem ? qty * med.pricePaise : 0 };
  });
  const total = rows.reduce((s, r) => s + r.amountPaise, 0);
  const invalid = rows.some((r) => r.problem);

  function add(m: Medicine) {
    // Each medicine is one row: picking it again adds one more.
    setCart((c) => (c.some((x) => x.medicineId === m.id) ? c.map((x) => (x.medicineId === m.id ? { ...x, qty: String((Number(x.qty) || 0) + 1) } : x)) : [...c, { medicineId: m.id, qty: '1' }]));
    setSearch('');
  }

  const sell = useMutation({
    mutationFn: () =>
      api.post<{ sale: { id: number; saleNo: string; totalPaise: number } }>(`/b/${branch}/pharmacy/sales`, {
        items: rows.map((r) => ({ medicineId: r.medicineId, quantity: r.quantity })),
        paymentMode: mode,
        patientId: patient?.id ?? null,
      }),
    onSuccess: ({ sale }) => {
      toast.success(`Sold · ${sale.saleNo}`, {
        description: `${formatRupees(sale.totalPaise)} received by ${modeLabel[mode]}. Stock updated.`,
        action: { label: 'Print bill', onClick: () => window.open(printUrl(branch, sale.id), '_blank', 'noopener') },
      });
      setLastSale(sale);
      setCart([]);
      setPatient(null);
      for (const k of ['pharmacy-sales', 'pharmacy-queue', 'medicines', 'batches', 'dashboard', 'collection', 'patient-bills']) qc.invalidateQueries({ queryKey: [k, branch] });
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      qc.invalidateQueries({ queryKey: ['medicines', branch] }); // stock probably changed under us
    },
  });

  return (
    <Card>
      <CardHeader icon={ShoppingCart} iconTone="brand" title="Direct sale" description="Sell medicines over the counter, without a prescription." />
      {lastSale && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-positive-soft px-4 py-2.5 text-sm">
          <span>
            Sold <span className="font-mono">{lastSale.saleNo}</span> · <span className="font-medium tabular-nums">{formatRupees(lastSale.totalPaise)}</span>
          </span>
          <span className="flex items-center gap-1">
            <a href={printUrl(branch, lastSale.id)} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium hover:bg-subtle">
              <Printer className="size-4" /> Print bill
            </a>
            <Button size="icon-sm" variant="ghost" aria-label="Hide the last sale" onClick={() => setLastSale(null)}>
              <X />
            </Button>
          </span>
        </div>
      )}

      <div className="border-b border-border p-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
          <Input type="search" aria-label="Search medicine to add" placeholder="Search medicine to add…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {meds.isLoading ? (
          <Skeleton className="mt-3 h-10" />
        ) : meds.error ? (
          <p className="mt-3 text-sm text-critical">{errorMessage(meds.error)}</p>
        ) : meds.data?.medicines.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No medicines yet. Add them in Inventory first.</p>
        ) : q && matches.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No matching medicines.</p>
        ) : (
          matches.length > 0 && (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={m.stock === 0}
                    onClick={() => add(m)}
                    className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2.5 text-left text-sm hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    <span className="font-medium">
                      {m.name} {m.strength && <span className="font-normal text-muted">{m.strength}</span>}
                    </span>
                    {m.stock === 0 ? (
                      <span className="text-xs font-medium text-critical">Out of stock. Add stock in Inventory to sell it.</span>
                    ) : (
                      <span className="text-xs text-muted tabular-nums">
                        {formatRupees(m.pricePaise)}/{FORM_UNIT[m.form]} · {m.stock} in stock
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No medicines added" description="Search above and pick what the customer is buying." />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Medicine</TH>
                <TH className="hidden md:table-cell">Batch</TH>
                <TH className="hidden md:table-cell">Expiry</TH>
                <TH className="hidden text-right md:table-cell">In stock</TH>
                <TH className="text-right">Qty</TH>
                <TH className="hidden text-right sm:table-cell">Rate</TH>
                <TH className="text-right">Amount</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => {
                const name = r.med?.name ?? 'Medicine';
                return (
                  <TR key={r.medicineId}>
                    <TD>
                      <div className="font-medium">
                        {name} {r.med?.strength && <span className="text-muted">{r.med.strength}</span>}
                      </div>
                      {r.med && (
                        <div className="text-xs text-muted md:hidden">
                          Batch <span className="font-mono">{r.med.nextBatchNo ?? '—'}</span>
                          {r.med.nextExpiry && ` · exp ${fmtDay(r.med.nextExpiry)}`} · {r.med.stock} in stock
                        </div>
                      )}
                      {r.problem && (
                        <div className="flex items-center gap-1 text-xs font-medium text-critical">
                          <AlertTriangle className="size-3 shrink-0" /> {r.problem}
                        </div>
                      )}
                    </TD>
                    <TD className="hidden font-mono text-xs md:table-cell">{r.med?.nextBatchNo ?? '—'}</TD>
                    <TD className="hidden whitespace-nowrap text-muted md:table-cell">{r.med?.nextExpiry ? fmtDay(r.med.nextExpiry) : '—'}</TD>
                    <TD className="hidden text-right tabular-nums md:table-cell">
                      {r.med ? r.med.stock : '—'} {r.med && <span className="text-xs text-muted">{FORM_UNIT[r.med.form]}</span>}
                    </TD>
                    <TD className="text-right">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        aria-label={`Quantity of ${name}`}
                        aria-invalid={!!r.problem}
                        className="ml-auto w-20 text-right tabular-nums"
                        value={r.qty}
                        onChange={(e) => setCart((c) => c.map((x) => (x.medicineId === r.medicineId ? { ...x, qty: e.target.value } : x)))}
                      />
                    </TD>
                    <TD className="hidden text-right text-muted tabular-nums sm:table-cell">{r.med ? formatRupees(r.med.pricePaise) : '—'}</TD>
                    <TD className="text-right font-medium tabular-nums">{formatRupees(r.amountPaise)}</TD>
                    <TD className="text-right">
                      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${name}`} onClick={() => setCart((c) => c.filter((x) => x.medicineId !== r.medicineId))}>
                        <Trash2 className="text-critical" />
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <p className="border-t border-border bg-subtle/50 px-4 py-2 text-xs text-muted">
            The batch shown is the earliest expiry, used first. A larger quantity may also take from the next batch; the printed bill lists the batches actually sold.
          </p>
        </>
      )}

      <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2 md:items-end">
        <PatientPicker branch={branch} value={patient} onChange={setPatient} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:justify-end md:gap-6">
          <div>
            <div className="text-xs text-muted">
              Total for {rows.length} medicine{rows.length === 1 ? '' : 's'}
            </div>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">{formatRupees(total)}</div>
          </div>
          <div className="flex items-center gap-2">
            <NativeSelect aria-label="Paid by" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} className="w-28">
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {modeLabel[m]}
                </option>
              ))}
            </NativeSelect>
            <Button size="lg" disabled={!rows.length || invalid || sell.isPending} onClick={() => sell.mutate()}>
              <PackageCheck /> {sell.isPending ? 'Selling…' : `Sell ${formatRupees(total)}`}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

type PickedPatient = Pick<Patient, 'id' | 'name' | 'uhid'>;

/** Optional: attach an existing patient of this branch to the sale. Nothing picked = walk-in customer. */
function PatientPicker({ branch, value, onChange }: { branch: string; value: PickedPatient | null; onChange: (p: PickedPatient | null) => void }) {
  const canSearch = useCan('patient.view'); // the patients list needs it
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const found = useQuery({
    queryKey: ['patients', branch, q, 'pick'],
    queryFn: () => api.get<{ patients: Patient[] }>(`/b/${branch}/patients?${new URLSearchParams({ q, limit: '6' })}`),
    enabled: canSearch && !value && q.length >= 2,
  });

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">Patient (optional)</div>
        <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-border bg-subtle py-1 pr-1 pl-3 text-sm">
          <span className="truncate font-medium">{value.name}</span>
          <span className="font-mono text-xs text-muted">{value.uhid}</span>
          <Button size="icon-sm" variant="ghost" className="rounded-full" aria-label={`Remove patient ${value.name}`} onClick={() => onChange(null)}>
            <X />
          </Button>
        </span>
      </div>
    );
  }
  if (!canSearch) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">Patient (optional)</div>
        <p className="text-sm text-muted">Walk-in customer</p>
      </div>
    );
  }
  return (
    <Field label="Patient (optional)" htmlFor="sale-patient" hint={q.length >= 2 ? undefined : 'Walk-in customer. Search to attach a registered patient.'}>
      <Input id="sale-patient" type="search" placeholder="Search name, UHID or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {q.length >= 2 &&
        (found.error ? (
          <p className="text-xs font-medium text-critical">{errorMessage(found.error)}</p>
        ) : !found.data ? (
          <Skeleton className="h-9" />
        ) : found.data.patients.length === 0 ? (
          <p className="text-xs text-muted">No matching patients. The sale stays a walk-in.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {found.data.patients.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-subtle"
                  onClick={() => {
                    onChange({ id: p.id, name: p.name, uhid: p.uhid });
                    setSearch('');
                  }}
                >
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    <span className="font-mono">{p.uhid}</span>
                    {p.phone && ` · ${p.phone}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </Field>
  );
}
