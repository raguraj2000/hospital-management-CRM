import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, FlaskConical, Pill, Plus, Stethoscope, Trash2 } from 'lucide-react';
import {
  FORM_UNIT,
  formatRupees,
  prescriptionItemSchema,
  suggestedQuantity,
  type LabOrder,
  type LabTest,
  type Medicine,
  type OpVisit,
  type Patient,
  type PrescriptionItem,
  type PrescriptionItemFormValues,
  type PrescriptionItemInput,
} from '@platform/shared';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, NativeSelect, Skeleton, Table, TBody, TD, TH, THead, toast, TR } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { TokenBadge, VisitActions, VisitStatusBadge, vitalsSummary } from '@/components/Visits';
import { ageOf } from './Patients';
import { VisitBill } from '@/components/VisitBill';

const rxTone = { pending: 'warning', dispensed: 'positive', declined: 'neutral' } as const;
const rxLabel = { pending: 'At pharmacy', dispensed: 'Dispensed', declined: 'Not bought' } as const;
export const labTone = { ordered: 'warning', sample_collected: 'brand', completed: 'positive', cancelled: 'neutral' } as const;
export const labLabel = { ordered: 'Ordered', sample_collected: 'Sample collected', completed: 'Result ready', cancelled: 'Cancelled' } as const;

/** The consultation screen: vitals, prescription, lab orders for one OP visit. */
export function VisitDetail() {
  const { branch, visitId } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['visit', branch, visitId],
    queryFn: () => api.get<{ visit: OpVisit; patient: Pick<Patient, 'id' | 'name' | 'uhid' | 'gender' | 'ageYears' | 'dob' | 'phone'> }>(`/b/${branch}/visits/${visitId}`),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Card className="p-6 text-sm">{errorMessage(error)}</Card>;
  const { visit: v, patient: p } = data;
  const age = ageOf(p);

  return (
    <div>
      <Link to={`/${branch}/visits`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> OP visits
      </Link>

      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={p.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/${branch}/patients/${p.id}`} className="truncate text-xl font-semibold tracking-tight hover:underline">
                {p.name}
              </Link>
              <VisitStatusBadge status={v.status} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <TokenBadge opNo={v.opNo} token={v.token} className="px-2.5 py-1 text-sm" />
              <Badge className="font-mono">{v.opNo}</Badge>
              <Badge className="font-mono">{p.uhid}</Badge>
              {age != null && <span>{age} yrs</span>}
              {p.gender && <span className="capitalize">· {p.gender}</span>}
              <span>· {v.doctorName ? `Dr. ${v.doctorName.replace(/^Dr\.?\s*/i, '')}` : 'No doctor assigned'}</span>
            </div>
            <div className="mt-2 text-sm">
              {v.complaint && <span className="font-medium">{v.complaint}</span>}
              {vitalsSummary(v) && <span className="ml-2 text-muted tabular-nums">{vitalsSummary(v)}</span>}
            </div>
          </div>
          <VisitActions branch={branch!} visit={v} label={p.name} />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Prescription branch={branch!} visit={v} />
        </div>
        <div className="space-y-6 xl:col-span-2">
          <LabOrders branch={branch!} visit={v} />
          <VisitBill branch={branch!} visitId={v.id} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- prescription

function Prescription({ branch, visit }: { branch: string; visit: OpVisit }) {
  const canWrite = useCan('prescription.write');
  const qc = useQueryClient();
  const key = ['prescription', branch, visit.id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get<{ items: PrescriptionItem[] }>(`/b/${branch}/visits/${visit.id}/prescription`) });
  const items = data?.items ?? [];
  const total = items.filter((i) => i.status !== 'declined').reduce((s, i) => s + i.quantity * i.pricePaise, 0);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['pharmacy-queue', branch] });
  };
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/b/${branch}/prescription-items/${id}`),
    onSuccess: () => {
      refresh();
      toast.success('Medicine removed');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card>
      <CardHeader
        title="Prescription"
        description="Sent to the pharmacy as soon as you add it."
        icon={Pill}
        iconTone="violet"
        action={items.length > 0 && <span className="text-sm font-semibold tabular-nums">{formatRupees(total)}</span>}
      />
      {isLoading ? (
        <div className="p-4">
          <Skeleton className="h-24" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Pill} title="No medicines yet" description={canWrite ? 'Add the first medicine below.' : 'The doctor has not prescribed anything yet.'} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Medicine</TH>
              <TH>Dose</TH>
              <TH className="text-right">Qty</TH>
              <TH className="text-right">Amount</TH>
              <TH>Status</TH>
              {canWrite && <TH />}
            </tr>
          </THead>
          <TBody>
            {items.map((i) => (
              <TR key={i.id}>
                <TD>
                  <div className="font-medium">
                    {i.medicineName} {i.strength && <span className="text-muted">{i.strength}</span>}
                  </div>
                  {i.instructions && <div className="text-xs text-muted">{i.instructions}</div>}
                </TD>
                <TD className="whitespace-nowrap tabular-nums">
                  {i.dose} <span className="text-muted">× {i.days}d</span>
                </TD>
                <TD className="text-right tabular-nums">
                  {i.quantity} <span className="text-xs text-muted">{FORM_UNIT[i.form]}</span>
                </TD>
                <TD className="text-right tabular-nums">{formatRupees(i.quantity * i.pricePaise)}</TD>
                <TD>
                  <Badge tone={rxTone[i.status]} dot>
                    {rxLabel[i.status]}
                  </Badge>
                </TD>
                {canWrite && (
                  <TD className="text-right">
                    {i.status === 'pending' && (
                      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${i.medicineName}`} onClick={() => remove.mutate(i.id)}>
                        <Trash2 className="text-critical" />
                      </Button>
                    )}
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      {canWrite && visit.status !== 'cancelled' && (
        <div className="border-t border-border p-4">
          <AddMedicineForm
            branch={branch}
            onAdded={() => {
              refresh();
            }}
            visitId={visit.id}
          />
        </div>
      )}
    </Card>
  );
}

const DOSE_PRESETS = ['1-0-1', '1-1-1', '1-0-0', '0-0-1', '1-1-1-1', 'SOS'];

function AddMedicineForm({ branch, visitId, onAdded }: { branch: string; visitId: number; onAdded: () => void }) {
  const [search, setSearch] = useState('');
  const meds = useQuery({ queryKey: ['medicines', branch], queryFn: () => api.get<{ medicines: Medicine[] }>(`/b/${branch}/medicines`), staleTime: 60_000 });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (meds.data?.medicines ?? []).filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [meds.data, search]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PrescriptionItemFormValues, unknown, PrescriptionItemInput>({
    resolver: zodResolver(prescriptionItemSchema),
    defaultValues: { dose: '1-0-1', days: 5, quantity: null, instructions: 'After food' },
  });
  const dose = watch('dose');
  const days = Number(watch('days'));
  const medicineId = Number(watch('medicineId'));
  const auto = suggestedQuantity(dose ?? '', days);
  const chosen = meds.data?.medicines.find((m) => m.id === medicineId);

  return (
    <form
      noValidate
      className="grid grid-cols-2 gap-3 sm:grid-cols-6"
      onSubmit={handleSubmit(async (values) => {
        try {
          const r = await api.post<{ quantity: number }>(`/b/${branch}/visits/${visitId}/prescription`, values);
          toast.success(`${chosen?.name ?? 'Medicine'} added · ${r.quantity} ${chosen ? FORM_UNIT[chosen.form] : ''}`);
          reset({ dose: values.dose, days: values.days, quantity: null, instructions: values.instructions ?? '' });
          setSearch('');
          onAdded();
        } catch (e) {
          if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof PrescriptionItemFormValues, { message: m[0] });
          else setError('root', { message: errorMessage(e) });
        }
      })}
    >
      <div className="col-span-2 sm:col-span-6">
        <div className="mb-2 text-sm font-medium">Add medicine</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Search medicine…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search medicine" />
          <NativeSelect aria-label="Medicine" aria-invalid={!!errors.medicineId} {...register('medicineId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}>
            <option value="">{meds.data?.medicines.length === 0 ? 'No medicines — add them in Inventory' : `Choose (${filtered.length})`}</option>
            {filtered.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.strength ? ` ${m.strength}` : ''} · {formatRupees(m.pricePaise)}/{FORM_UNIT[m.form]} · {m.stock > 0 ? `${m.stock} in stock` : 'OUT OF STOCK'}
              </option>
            ))}
          </NativeSelect>
        </div>
        {errors.medicineId && <p className="mt-1 text-xs font-medium text-critical">{errors.medicineId.message}</p>}
      </div>
      <Field label="Dose (M-A-N)" htmlFor="rx-dose" error={errors.dose?.message} className="col-span-2">
        <Input id="rx-dose" list="dose-presets" {...register('dose')} />
        <datalist id="dose-presets">
          {DOSE_PRESETS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </Field>
      <Field label="Days" htmlFor="rx-days" error={errors.days?.message}>
        <Input id="rx-days" inputMode="numeric" {...register('days', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} />
      </Field>
      <Field label="Qty" htmlFor="rx-qty" error={errors.quantity?.message} hint={auto != null ? `Auto: ${auto}` : 'Type it'}>
        <Input id="rx-qty" inputMode="numeric" placeholder={auto != null ? String(auto) : ''} {...register('quantity', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })} />
      </Field>
      <Field label="Instructions" htmlFor="rx-instructions" className="col-span-2">
        <Input id="rx-instructions" list="rx-instruction-presets" {...register('instructions')} />
        <datalist id="rx-instruction-presets">
          {['After food', 'Before food', 'At bedtime', 'With warm water'].map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      </Field>
      <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-6">
        <div className="text-xs text-muted">
          {chosen && (
            <>
              {chosen.name}: {formatRupees(chosen.pricePaise)} × {auto ?? '?'} = <b className="text-ink">{auto != null ? formatRupees(chosen.pricePaise * auto) : '—'}</b>
              {chosen.stock < (auto ?? 0) && <span className="ml-2 font-medium text-warning">Only {chosen.stock} in stock</span>}
            </>
          )}
          {errors.root && <span className="text-critical">{errors.root.message}</span>}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          <Plus /> {isSubmitting ? 'Adding…' : 'Add to prescription'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- lab

function LabOrders({ branch, visit }: { branch: string; visit: OpVisit }) {
  const canOrder = useCan('lab.order');
  const canViewLab = useCan('lab.view');
  const canPrint = canOrder || canViewLab; // the report page takes either
  const qc = useQueryClient();
  const key = ['visit-lab', branch, visit.id];
  const orders = useQuery({ queryKey: key, queryFn: () => api.get<{ orders: LabOrder[] }>(`/b/${branch}/visits/${visit.id}/lab-orders`) });
  const tests = useQuery({ queryKey: ['lab-tests', branch], queryFn: () => api.get<{ tests: LabTest[] }>(`/b/${branch}/lab/tests`), enabled: canOrder, staleTime: 60_000 });
  const [picked, setPicked] = useState<number[]>([]);

  const order = useMutation({
    mutationFn: () => api.post(`/b/${branch}/visits/${visit.id}/lab-orders`, { testIds: picked }),
    onSuccess: () => {
      toast.success(`${picked.length} test${picked.length > 1 ? 's' : ''} sent to the lab`);
      setPicked([]);
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['lab-queue', branch] });
      qc.invalidateQueries({ queryKey: ['patient-lab', branch] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (id: number) => api.patch(`/b/${branch}/lab/orders/${id}`, { status: 'cancelled' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      // A cancelled test also leaves its unpaid bill.
      for (const k of ['visit-bills', 'patient-lab', 'patient-bills']) qc.invalidateQueries({ queryKey: [k, branch] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const active = (orders.data?.orders ?? []).filter((o) => o.status !== 'cancelled');
  const already = new Set(active.map((o) => o.testId));
  const pickedTotal = (tests.data?.tests ?? []).filter((t) => picked.includes(t.id)).reduce((s, t) => s + t.pricePaise, 0);

  return (
    <Card>
      <CardHeader
        title="Lab tests"
        description="Ordered tests appear in the lab queue."
        icon={FlaskConical}
        iconTone="brand"
        action={
          active.length > 0 &&
          canPrint && (
            <a href={`/${branch}/lab/visits/${visit.id}/print`} className="text-xs font-medium text-brand hover:underline">
              Print report
            </a>
          )
        }
      />
      {orders.isLoading ? (
        <div className="p-4">
          <Skeleton className="h-16" />
        </div>
      ) : (orders.data?.orders.length ?? 0) === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">No tests ordered.</p>
      ) : (
        <ul className="divide-y divide-border">
          {orders.data!.orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span className={o.status === 'cancelled' ? 'text-muted line-through' : 'font-medium'}>{o.testName}</span>
              <span className="flex items-center gap-2">
                <span className="text-muted tabular-nums">{formatRupees(o.pricePaise)}</span>
                <Badge tone={labTone[o.status]} dot>
                  {labLabel[o.status]}
                </Badge>
                {canOrder && o.status === 'ordered' && (
                  <Button size="sm" variant="ghost" onClick={() => cancel.mutate(o.id)}>
                    Cancel
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canOrder && visit.status !== 'cancelled' && (
        <div className="border-t border-border p-4">
          <div className="mb-2 text-sm font-medium">Order tests</div>
          {tests.data?.tests.length === 0 ? (
            <p className="text-sm text-muted">No tests set up yet. A branch admin adds them in Lab → Tests.</p>
          ) : (
            <div className="grid gap-1.5">
              {(tests.data?.tests ?? []).map((t) => (
                <label key={t.id} className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-subtle ${already.has(t.id) ? 'opacity-50' : ''}`}>
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-primary)]"
                      disabled={already.has(t.id)}
                      checked={picked.includes(t.id)}
                      onChange={(e) => setPicked((p) => (e.target.checked ? [...p, t.id] : p.filter((x) => x !== t.id)))}
                    />
                    {t.name} {already.has(t.id) && <span className="text-xs text-muted">(ordered)</span>}
                  </span>
                  <span className="text-muted tabular-nums">{formatRupees(t.pricePaise)}</span>
                </label>
              ))}
            </div>
          )}
          <Button className="mt-3 w-full" variant="outline" disabled={!picked.length || order.isPending} onClick={() => order.mutate()}>
            <CheckCircle2 /> {picked.length ? `Order ${picked.length} test${picked.length > 1 ? 's' : ''} · ${formatRupees(pickedTotal)}` : 'Tick tests to order'}
          </Button>
        </div>
      )}
      {!canOrder && <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted"><Stethoscope className="size-3.5" /> Only doctors order tests.</p>}
    </Card>
  );
}
