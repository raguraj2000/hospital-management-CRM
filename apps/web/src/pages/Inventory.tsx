import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams, Link } from 'react-router';
import { z } from 'zod';
import { Boxes, CalendarClock, IndianRupee, MoreHorizontal, PackageCheck, Pencil, PackagePlus, PackageX, Plus, Printer, Search, Trash2, TriangleAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { batchInputSchema, FORM_UNIT, formatRupees, MEDICINE_FORMS, toPaise, type BatchInput, type Medicine, type MedicineBatch, type StockReport, type StockReportBatch } from '@platform/shared';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDelete,
  Dialog,
  EmptyState,
  Field,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  NativeSelect,
  PageHeader,
  Skeleton,
  StatCard,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TBody,
  TD,
  TH,
  THead,
  toast,
  TR,
  Pager,
  usePaged,
} from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { Vendors } from './Vendors';
import { useBranch, useCan } from '@/state/auth';
import { fmtDay } from '@/components/format';

const daysUntil = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}T00:00:00`).getTime()) / 86_400_000);

export function Inventory() {
  const { branch } = useParams();
  const current = useBranch();
  const canManage = useCan('inventory.manage');
  const canVendor = useCan('vendor.manage'); // what things cost and earn: for whoever handles vendors
  const qc = useQueryClient();
  // The tab lives in the URL (?tab=reports), so other pages can link straight to the report.
  const [params, setParams] = useSearchParams();
  const asked = params.get('tab');
  const tab = asked === 'reports' ? 'reports' : (asked === 'purchases' || asked === 'vendors') && canVendor ? asked : 'medicines';
  const [search, setSearch] = useState('');
  // Category = the form of the medicine (tablet, syrup, injection...).
  const [category, setCategory] = useState<'all' | (typeof MEDICINE_FORMS)[number]>('all');
  const [adding, setAdding] = useState(false);
  const [stockFor, setStockFor] = useState<Medicine | null>(null);
  const [batchesFor, setBatchesFor] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState<Medicine | null>(null);
  const [editing, setEditing] = useState<Medicine | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['medicines', branch], queryFn: () => api.get<{ medicines: Medicine[] }>(`/b/${branch}/medicines`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['medicines', branch] });
  const remove = useMutation({
    mutationFn: (m: Medicine) => api.delete(`/b/${branch}/medicines/${m.id}`),
    onSuccess: (_d, m) => {
      refresh();
      setDeleting(null);
      toast.success(`${m.name} deleted`);
    },
  });

  const q = search.trim().toLowerCase();
  const medicines = (data?.medicines ?? []).filter((m) => (!q || m.name.toLowerCase().includes(q)) && (category === 'all' || m.form === category));
  const low = (data?.medicines ?? []).filter((m) => m.stock <= m.reorderLevel).length;
  const { rows, pager } = usePaged(medicines, q);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={`Drugs and stock at ${current?.name}. Dispensing always uses the earliest expiry first.`}
        actions={
          canManage && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> Add medicine
            </Button>
          )
        }
      />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'medicines' ? {} : { tab: v }, { replace: true })}>
        <TabsList className="mb-4 max-w-full overflow-x-auto">
          <TabsTrigger value="medicines">Drugs</TabsTrigger>
          {canVendor && <TabsTrigger value="vendors">Vendors &amp; purchases</TabsTrigger>}
          {canVendor && <TabsTrigger value="purchases">Purchase history &amp; profit</TabsTrigger>}
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="medicines">
          <Card>
            <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
                <Input type="search" placeholder="Search drugs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              {low > 0 && <Badge tone="warning" dot className="sm:ml-auto">{low} low on stock</Badge>}
              <NativeSelect aria-label="Category" className={low > 0 ? 'sm:w-52' : 'sm:ml-auto sm:w-52'} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                <option value="all">All categories ({data?.medicines.length ?? 0})</option>
                {MEDICINE_FORMS.map((f) => (
                  <option key={f} value={f} className="capitalize">
                    {f[0]!.toUpperCase() + f.slice(1)} ({(data?.medicines ?? []).filter((m) => m.form === f).length})
                  </option>
                ))}
              </NativeSelect>
            </div>
            {isLoading ? (
              <div className="space-y-3 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : error ? (
              <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
            ) : medicines.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title={q || category !== 'all' ? 'No matching medicines' : 'No medicines yet'}
                description={q ? undefined : 'Add medicines with their selling price, then add stock as it arrives.'}
                action={canManage && !q && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus /> Add medicine</Button>}
              />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Drug</TH>
                    <TH className="text-right">Price</TH>
                    <TH className="text-right">In stock</TH>
                    <TH className="hidden md:table-cell">Next expiry</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((m) => {
                    const expDays = m.nextExpiry ? daysUntil(m.nextExpiry) : null;
                    return (
                      <TR key={m.id}>
                        <TD>
                          <div className="font-medium">
                            {m.name} {m.strength && <span className="text-muted">{m.strength}</span>}
                          </div>
                          <div className="text-xs text-muted capitalize">{m.form}</div>
                        </TD>
                        <TD className="text-right tabular-nums">
                          {formatRupees(m.pricePaise)}
                          <span className="text-xs text-muted">/{FORM_UNIT[m.form]}</span>
                        </TD>
                        <TD className="text-right">
                          <Badge tone={m.stock === 0 ? 'critical' : m.stock <= m.reorderLevel ? 'warning' : 'positive'} className="tabular-nums">
                            {m.stock} {FORM_UNIT[m.form]}
                          </Badge>
                        </TD>
                        <TD className="hidden md:table-cell">
                          {m.nextExpiry ? (
                            <span className={expDays != null && expDays <= 60 ? 'font-medium text-warning' : 'text-muted'}>
                              {fmtDay(m.nextExpiry)}
                              {expDays != null && expDays <= 60 && ` · ${expDays}d`}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </TD>
                        <TD>
                          <div className="flex items-center justify-end gap-1">
                            {canManage && (
                              <Button size="sm" variant="outline" onClick={() => setStockFor(m)}>
                                <PackagePlus /> Add stock
                              </Button>
                            )}
                            <Menu>
                              <MenuTrigger asChild>
                                <Button size="icon-sm" variant="ghost" aria-label={`More for ${m.name}`}>
                                  <MoreHorizontal />
                                </Button>
                              </MenuTrigger>
                              <MenuContent align="end">
                                {canManage && (
                                  <MenuItem onSelect={() => setEditing(m)}>
                                    <Pencil /> Edit price &amp; details
                                  </MenuItem>
                                )}
                                <MenuItem onSelect={() => setBatchesFor(m)}>
                                  <Boxes /> View batches
                                </MenuItem>
                                {canManage && (
                                  <MenuItem destructive onSelect={() => setDeleting(m)}>
                                    <Trash2 /> Delete medicine
                                  </MenuItem>
                                )}
                              </MenuContent>
                            </Menu>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
            <Pager {...pager} />
          </Card>
        </TabsContent>
        <TabsContent value="reports">
          <Reports branch={branch!} branchName={current?.name ?? ''} />
        </TabsContent>
        {canVendor && (
          <TabsContent value="vendors">
            <Vendors embedded />
          </TabsContent>
        )}
        {canVendor && (
          <TabsContent value="purchases">
            <PurchaseProfit branch={branch!} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={`Edit ${editing?.name ?? ''}`} description="Price is per single unit (one tablet, one bottle…). The new price applies to sales from now on.">
        {editing && (
          <MedicineForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (v) => {
              await api.patch(`/b/${branch}/medicines/${editing.id}`, v);
              refresh();
              setEditing(null);
              toast.success(`${v.name} saved`, { description: `Selling price ${formatRupees(v.pricePaise)} per unit.` });
            }}
          />
        )}
      </Dialog>

      <Dialog open={adding} onOpenChange={setAdding} title="Add medicine" description="Price is per single unit (one tablet, one bottle…).">
        <MedicineForm
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            await api.post(`/b/${branch}/medicines`, v);
            refresh();
            setAdding(false);
            toast.success(`${v.name} added`, { description: 'Now add its stock.' });
          }}
        />
      </Dialog>
      <Dialog open={!!stockFor} onOpenChange={(o) => !o && setStockFor(null)} title={`Add stock · ${stockFor?.name ?? ''}`} description="Enter it exactly as printed on the strip or box.">
        {stockFor && (
          <StockForm
            unit={FORM_UNIT[stockFor.form]}
            onCancel={() => setStockFor(null)}
            onSubmit={async (v) => {
              await api.post(`/b/${branch}/medicines/${stockFor.id}/batches`, v);
              refresh();
              toast.success(`${v.quantity} ${FORM_UNIT[stockFor.form]} of ${stockFor.name} added`);
              setStockFor(null);
            }}
          />
        )}
      </Dialog>
      <Dialog open={!!batchesFor} onOpenChange={(o) => !o && setBatchesFor(null)} title={`Batches · ${batchesFor?.name ?? ''}`}>
        {batchesFor && <Batches branch={branch!} medicine={batchesFor} />}
      </Dialog>
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? ''}?`}
        description="It disappears from the medicine list and can no longer be prescribed. Past sales stay in the records."
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  );
}

const medicineFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter the medicine name').max(120),
  form: z.enum(MEDICINE_FORMS),
  strength: z.string().trim().max(40),
  price: z.number({ error: 'Enter the price' }).min(0, 'Enter the price').max(100_000),
  reorderLevel: z.number().int().min(0).max(100_000),
});
type MedicineFormValues = z.infer<typeof medicineFormSchema>;

/** Add a medicine, or edit one (`initial`). */
function MedicineForm({ initial, onSubmit, onCancel }: { initial?: Medicine; onSubmit: (v: { name: string; form: MedicineFormValues['form']; strength: string; pricePaise: number; reorderLevel: number }) => Promise<void>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MedicineFormValues>({ resolver: zodResolver(medicineFormSchema), defaultValues: initial ? { name: initial.name, form: initial.form, strength: initial.strength ?? '', price: initial.pricePaise / 100, reorderLevel: initial.reorderLevel } : { form: 'tablet', strength: '', reorderLevel: 20 },
  });
  const num = (v: unknown) => (v === '' || v == null ? undefined : Number(v));
  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit(async ({ price, ...v }) => {
        try {
          await onSubmit({ ...v, pricePaise: toPaise(price) });
        } catch (e) {
          if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f === 'pricePaise' ? 'price' : (f as keyof MedicineFormValues), { message: m[0] });
          else setError('root', { message: errorMessage(e) });
        }
      })}
    >
      <Field required label="Drug name" htmlFor="med-name" error={errors.name?.message} className="sm:col-span-2">
        <Input id="med-name" autoFocus placeholder="e.g. Paracetamol" {...register('name')} />
      </Field>
      <Field required label="Form" htmlFor="med-form">
        <NativeSelect id="med-form" {...register('form')}>
          {MEDICINE_FORMS.map((f) => (
            <option key={f} value={f} className="capitalize">
              {f[0]!.toUpperCase() + f.slice(1)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Strength" htmlFor="med-strength" hint="Optional, e.g. 500 mg">
        <Input id="med-strength" {...register('strength')} />
      </Field>
      <Field required label="Selling price per unit (₹)" htmlFor="med-price" error={errors.price?.message}>
        <Input id="med-price" inputMode="decimal" placeholder="e.g. 2.50" {...register('price', { setValueAs: num })} />
      </Field>
      <Field label="Warn when stock is at or below" htmlFor="med-reorder" error={errors.reorderLevel?.message}>
        <Input id="med-reorder" inputMode="numeric" {...register('reorderLevel', { setValueAs: num })} />
      </Field>
      {errors.root && <p className="text-sm text-critical sm:col-span-2">{errors.root.message}</p>}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : initial ? 'Save changes' : 'Add medicine'}
        </Button>
      </div>
    </form>
  );
}

function StockForm({ unit, onSubmit, onCancel }: { unit: string; onSubmit: (v: BatchInput) => Promise<void>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BatchInput>({ resolver: zodResolver(batchInputSchema) });
  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={handleSubmit(async (v) => {
        try {
          await onSubmit(v);
        } catch (e) {
          if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof BatchInput, { message: m[0] });
          else setError('root', { message: errorMessage(e) });
        }
      })}
    >
      <Field required label="Batch no." htmlFor="batch-no" error={errors.batchNo?.message}>
        <Input id="batch-no" autoFocus className="font-mono uppercase" {...register('batchNo')} />
      </Field>
      <Field required label="Expiry date" htmlFor="batch-expiry" error={errors.expiryDate?.message}>
        <Input id="batch-expiry" type="date" {...register('expiryDate')} />
      </Field>
      <Field required label={`Quantity (${unit})`} htmlFor="batch-qty" error={errors.quantity?.message}>
        <Input id="batch-qty" inputMode="numeric" {...register('quantity', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} />
      </Field>
      {errors.root && <p className="text-sm text-critical sm:col-span-3">{errors.root.message}</p>}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:col-span-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Add stock'}
        </Button>
      </div>
    </form>
  );
}

function Batches({ branch, medicine }: { branch: string; medicine: Medicine }) {
  const { data, isLoading } = useQuery({ queryKey: ['batches', branch, medicine.id], queryFn: () => api.get<{ batches: MedicineBatch[]; today: string }>(`/b/${branch}/medicines/${medicine.id}/batches`) });
  if (isLoading) return <Skeleton className="h-24" />;
  if (!data?.batches.length) return <p className="text-sm text-muted">No stock has been added yet.</p>;
  return (
    <Table>
      <THead>
        <tr>
          <TH>Batch</TH>
          <TH>Expiry</TH>
          <TH className="text-right">Left / received</TH>
        </tr>
      </THead>
      <TBody>
        {data.batches.map((b) => {
          const expired = b.expiryDate < data.today;
          return (
            <TR key={b.id} className={expired || b.quantity === 0 ? 'opacity-60' : ''}>
              <TD className="font-mono text-xs">{b.batchNo}</TD>
              <TD>
                {fmtDay(b.expiryDate)} {expired && <Badge tone="critical">Expired</Badge>}
              </TD>
              <TD className="text-right tabular-nums">
                {b.quantity} / {b.receivedQty} {FORM_UNIT[medicine.form]}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

// ---------------------------------------------------------------- reports

const EXPIRY_WINDOWS = [30, 60, 90];
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

// Print only the report, always light: the app around it is hidden and the colour tokens go back to their light values.
const REPORT_PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: #fff !important; }
  body * { visibility: hidden; }
  .stock-report, .stock-report * { visibility: visible; }
  .stock-report {
    position: absolute; top: 0; left: 0; width: 100%; color: #09090b; color-scheme: light;
    --color-background: #fff; --color-surface: #fff; --color-subtle: #f4f4f5; --color-ink: #09090b; --color-muted: #52525b; --color-border: #d4d4d8;
    --color-brand: #2563eb; --color-brand-soft: #eff6ff; --color-positive: #16a34a; --color-positive-soft: #f0fdf4;
    --color-warning: #b45309; --color-warning-soft: #fffbeb; --color-critical: #dc2626; --color-critical-soft: #fef2f2; --shadow-card: none;
  }
}`;

/** The small button in a report card's header that hides or shows its list. */
function Minimize({ open, onToggle, what }: { open: boolean; onToggle: () => void; what: string }) {
  return (
    <Button variant="ghost" size="sm" className="print:hidden" aria-expanded={open} aria-label={`${open ? 'Minimize' : 'Show'} ${what}`} onClick={onToggle}>
      {open ? <ChevronUp /> : <ChevronDown />} {open ? 'Minimize' : 'Show'}
    </Button>
  );
}

function Reports({ branch, branchName }: { branch: string; branchName: string }) {
  // Each list can be minimized; closed lists still show their count.
  const [shut, setShut] = useState<Record<'expiring' | 'expired' | 'low', boolean>>({ expiring: false, expired: false, low: false });
  const toggle = (k: 'expiring' | 'expired' | 'low') => setShut((s) => ({ ...s, [k]: !s[k] }));
  const [days, setDays] = useState(30);
  // Keyed under ['medicines', branch]: everything that refreshes the medicine list after a stock change refreshes the report too.
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['medicines', branch, 'report'], queryFn: () => api.get<StockReport>(`/b/${branch}/inventory/report`) });

  if (error && !data) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-critical">{errorMessage(error)}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  const s = data?.summary;
  const expiring = (data?.expiring ?? []).filter((b) => b.daysLeft <= days);
  const expired = data?.expired ?? [];
  const lowStock = data?.lowStock ?? [];
  const footnote = (text: string) => (isLoading ? <Skeleton className="h-4 w-32" /> : text);

  return (
    <div className="stock-report space-y-4" aria-busy={isLoading || undefined}>
      <style>{REPORT_PRINT_CSS}</style>
      {isLoading && <span className="sr-only">Loading…</span>}
      <div className="hidden print:block">
        <h1 className="text-xl font-semibold">{branchName}</h1>
        <p className="text-sm text-muted">Stock and expiry report · {data && fmtDay(data.today)}</p>
      </div>
      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted">{data ? `Stock as of today, ${fmtDay(data.today)}` : 'Loading the report…'}</p>
        <Button variant="outline" onClick={() => window.print()} disabled={!data}>
          <Printer /> Print
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={IndianRupee}
          tone="positive"
          label="Stock value"
          value={formatRupees(s?.sellableValuePaise ?? 0)}
          footnote={footnote(
            !s?.sellableUnits
              ? 'At selling price · nothing in stock'
              : s.costKnownUnits === 0
                ? 'At selling price · cost not recorded'
                : `At selling price · cost ${formatRupees(s.costValuePaise)} (cost known for ${s.costKnownUnits} of ${s.sellableUnits} units)`,
          )}
          loading={isLoading}
        />
        <StatCard
          icon={CalendarClock}
          tone="warning"
          label="Expiring in 30 days"
          value={s?.expiring30 ?? 0}
          footnote={footnote(`${plural(s?.expiring30 ?? 0, 'batch', 'batches')} · ${s?.expiring60 ?? 0} in 60 days · ${s?.expiring90 ?? 0} in 90 days`)}
          loading={isLoading}
        />
        <StatCard
          icon={TriangleAlert}
          tone={s?.expired ? 'critical' : 'neutral'}
          label="Expired on shelf"
          value={<span className={s?.expired ? 'text-critical' : undefined}>{s?.expired ?? 0}</span>}
          footnote={footnote(s?.expired ? `${plural(s.expired, 'batch', 'batches')} · ${formatRupees(s.expiredValuePaise)} at selling price` : 'No expired stock on the shelf')}
          loading={isLoading}
        />
        <StatCard
          icon={PackageX}
          tone="warning"
          label="Low stock"
          value={s?.lowStock ?? 0}
          footnote={footnote(`${plural(s?.lowStock ?? 0, 'medicine')} to reorder · ${s?.outOfStock ?? 0} out of stock`)}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader
          className="flex-wrap"
          title="Expiring soon"
          description={`Next ${days} days · sell first or return to the vendor`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {expiring.length > 0 && <Badge tone="warning">{expiring.length}</Badge>}
              <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))} className="print:hidden">
                <TabsList>
                  {EXPIRY_WINDOWS.map((d) => (
                    <TabsTrigger key={d} value={String(d)}>
                      {d} days
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Minimize open={!shut.expiring} onToggle={() => toggle('expiring')} what="expiring soon" />
            </div>
          }
        />
        {shut.expiring ? null : isLoading ? <ReportRowsSkeleton /> : expiring.length === 0 ? <EmptyState icon={CalendarClock} title={`Nothing expiring in the next ${days} days`} /> : <ReportBatchTable rows={expiring} />}
      </Card>

      <Card className={expired.length ? 'border-critical/50' : undefined}>
        <CardHeader
          title="Expired — remove from shelf"
          description="Past the expiry date, still on the shelf"
          icon={expired.length ? TriangleAlert : undefined}
          iconTone="critical"
          action={
            <div className="flex items-center gap-2">
              {expired.length > 0 && <Badge tone="critical">{expired.length}</Badge>}
              <Minimize open={!shut.expired} onToggle={() => toggle('expired')} what="expired" />
            </div>
          }
        />
        {shut.expired ? null : isLoading ? <ReportRowsSkeleton rows={2} /> : expired.length === 0 ? <EmptyState icon={PackageCheck} title="No expired stock on the shelf" /> : <ReportBatchTable rows={expired} />}
      </Card>

      <Card>
        <CardHeader title="Low stock — reorder" description="Unexpired stock at or below the reorder level" action={<div className="flex items-center gap-2">{lowStock.length > 0 && <Badge tone="warning">{lowStock.length}</Badge>}<Minimize open={!shut.low} onToggle={() => toggle('low')} what="low stock" /></div>} />
        {shut.low ? null : isLoading ? (
          <ReportRowsSkeleton />
        ) : lowStock.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Nothing running low" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Drug</TH>
                <TH className="text-right">In stock</TH>
                <TH className="text-right">Reorder at</TH>
                <TH className="text-right">Status</TH>
              </tr>
            </THead>
            <TBody>
              {lowStock.map((m) => (
                <TR key={m.id}>
                  <TD>
                    <span className="font-medium">{m.name}</span> {m.strength && <span className="text-muted">{m.strength}</span>}
                  </TD>
                  <TD className="text-right whitespace-nowrap tabular-nums">
                    {m.stock} {FORM_UNIT[m.form]}
                  </TD>
                  <TD className="text-right whitespace-nowrap tabular-nums">
                    {m.reorderLevel} {FORM_UNIT[m.form]}
                  </TD>
                  <TD className="text-right">
                    <Badge tone={m.stock === 0 ? 'critical' : 'warning'}>{m.stock === 0 ? 'Out of stock' : 'Low'}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

/** Expiring and expired batches share one table; a negative daysLeft reads "N days ago". */
interface ProfitLine {
  id: number;
  billId: number;
  billDate: string;
  vendorName: string;
  vendorBillNo: string | null;
  medicineName: string;
  strength: string | null;
  batchNo: string;
  costPaise: number;
  sellPricePaise: number;
  received: number;
  left: number;
  soldUnits: number;
  sellValuePaise: number;
  profitIfAllSoldPaise: number;
  profitSoFarPaise: number;
}
interface ProfitReport {
  from: string;
  to: string;
  lines: ProfitLine[];
  totals: { costPaise: number; sellValuePaise: number; profitIfAllSoldPaise: number; profitSoFarPaise: number };
}

/** Everything bought from vendors between two dates: cost, selling value and profit, line by line and in total. */
function PurchaseProfit({ branch }: { branch: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['purchases', branch, 'profit', from, to],
    queryFn: () => api.get<ProfitReport>(`/b/${branch}/purchases/profit?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`),
  });
  const { rows, pager } = usePaged(data?.lines ?? []);
  const money = (p: number) => <span className={p < 0 ? 'text-critical' : ''}>{formatRupees(p)}</span>;
  return (
    <Card>
      <CardHeader
        title="Purchase history & profit"
        description="Every medicine bought from vendors in these dates. Profit is counted at today's selling price."
        action={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Input type="date" aria-label="From" className="w-auto" value={from || data?.from || ''} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-muted">to</span>
            <Input type="date" aria-label="To" className="w-auto" value={to || data?.to || ''} onChange={(e) => setTo(e.target.value)} />
          </div>
        }
      />
      {isLoading ? (
        <Skeleton className="m-4 h-24" />
      ) : error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
      ) : !data?.lines.length ? (
        <p className="px-4 py-8 text-center text-sm text-muted">Nothing was bought from vendors in these dates.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 border-b border-border p-4 lg:grid-cols-4">
            {(
              [
                ['Bought for', data.totals.costPaise],
                ['Sells for', data.totals.sellValuePaise],
                ['Total profit, if all is sold', data.totals.profitIfAllSoldPaise],
                ['Profit so far, on what is sold', data.totals.profitSoFarPaise],
              ] as const
            ).map(([label, paise]) => (
              <div key={label} className="rounded-lg border border-border px-3 py-2">
                <div className="text-xs text-muted">{label}</div>
                <div className="text-xl font-semibold tabular-nums">{money(paise)}</div>
              </div>
            ))}
          </div>
          <Table>
            <THead>
              <tr>
                <TH>Bought</TH>
                <TH>Drug</TH>
                <TH className="text-right">Units</TH>
                <TH className="text-right">Cost</TH>
                <TH className="text-right">Sells for</TH>
                <TH className="text-right">Profit if all sold</TH>
                <TH className="text-right">Sold so far</TH>
                <TH className="text-right">Profit so far</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((l) => (
                <TR key={l.id}>
                  <TD className="whitespace-nowrap">
                    <Link to={`/${branch}/vendors/purchases/${l.billId}`} className="font-medium hover:underline">
                      {l.vendorName}
                    </Link>
                    <div className="text-xs text-muted">
                      {new Date(`${l.billDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {l.vendorBillNo && ` · ${l.vendorBillNo}`}
                    </div>
                  </TD>
                  <TD>
                    <div className="font-medium">
                      {l.medicineName} {l.strength && <span className="font-normal text-muted">{l.strength}</span>}
                    </div>
                    <div className="font-mono text-xs text-muted">{l.batchNo}</div>
                  </TD>
                  <TD className="text-right tabular-nums">{l.received}</TD>
                  <TD className="text-right tabular-nums">{formatRupees(l.costPaise)}</TD>
                  <TD className="text-right tabular-nums">{formatRupees(l.sellValuePaise)}</TD>
                  <TD className="text-right font-medium tabular-nums">{money(l.profitIfAllSoldPaise)}</TD>
                  <TD className="text-right tabular-nums">
                    {l.soldUnits} <span className="text-xs text-muted">of {l.received}</span>
                  </TD>
                  <TD className="text-right font-medium tabular-nums">{money(l.profitSoFarPaise)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pager {...pager} />
        </>
      )}
    </Card>
  );
}

function ReportBatchTable({ rows }: { rows: StockReportBatch[] }) {
  return (
    // Phones scroll sideways; on paper the columns shrink to fit the page.
    <Table className="min-w-[640px] print:min-w-0">
      <THead>
        <tr>
          <TH>Drug</TH>
          <TH>Batch</TH>
          <TH>Expiry</TH>
          <TH className="text-right">Qty</TH>
          <TH className="text-right">Selling value</TH>
          <TH>Vendor</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((b) => {
          const d = b.daysLeft;
          return (
            <TR key={b.batchId}>
              <TD>
                <span className="font-medium">{b.medicineName}</span> {b.strength && <span className="text-muted">{b.strength}</span>}
              </TD>
              <TD className="font-mono text-xs">{b.batchNo}</TD>
              <TD className="whitespace-nowrap">
                {fmtDay(b.expiryDate)}
                <div className={`text-xs font-medium ${d < 0 ? 'text-critical' : d <= 30 ? 'text-warning' : 'text-muted'}`}>
                  {d < 0 ? `${-d} ${plural(-d, 'day')} ago` : d === 0 ? 'today' : `in ${d} ${plural(d, 'day')}`}
                </div>
              </TD>
              <TD className="text-right whitespace-nowrap tabular-nums">
                {b.quantity} {FORM_UNIT[b.form]}
              </TD>
              <TD className="text-right tabular-nums">{formatRupees(b.valuePaise)}</TD>
              <TD>{b.vendorName ?? <span className="text-muted">—</span>}</TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

/** Same outline as the report tables: header strip, then rows of name + values. */
function ReportRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div>
      <div className="h-10 border-b border-border bg-subtle/60" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-40 max-w-full" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}
