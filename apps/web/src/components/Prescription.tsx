// The prescription card of a visit: the medicines, and the form that adds one.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pill, Plus, Syringe, Trash2 } from 'lucide-react';
import {
  FORM_UNIT,
  formatRupees,
  prescriptionItemSchema,
  suggestedQuantity,
  type Medicine,
  type OpVisit,
  type PrescriptionItem,
  type PrescriptionItemFormValues,
  type PrescriptionItemInput,
  type PrescriptionSuggestions,
} from '@platform/shared';
import { Badge, Button, Card, CardHeader, Combobox, EmptyState, Field, Input, NativeSelect, Skeleton, Table, TBody, TD, TH, THead, toast, TR } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { CounterNote } from './CounterNote';

const rxTone = { pending: 'warning', dispensed: 'positive', declined: 'neutral' } as const;
const rxLabel = { pending: 'At pharmacy', dispensed: 'Dispensed', declined: 'Not bought' } as const;

export function Prescription({ branch, visit, onAdded }: { branch: string; visit: OpVisit; onAdded: () => void }) {
  const canWrite = useCan('prescription.write');
  const qc = useQueryClient();
  const key = ['prescription', branch, visit.id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get<{ items: PrescriptionItem[] }>(`/b/${branch}/visits/${visit.id}/prescription`) });
  const items = data?.items ?? [];
  const total = items.filter((i) => i.status !== 'declined').reduce((s, i) => s + i.quantity * i.pricePaise, 0);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['pharmacy-queue', branch] });
    qc.invalidateQueries({ queryKey: ['visits', branch] }); // the OP list shows how many medicines
    qc.invalidateQueries({ queryKey: ['rx-suggestions', branch] });
    qc.invalidateQueries({ queryKey: ['treatments', branch] });
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
        description="The pharmacy sees each medicine as soon as you add it."
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
                  {i.givenHere && (
                    <Badge tone={i.dosesGiven === i.dosesTotal ? 'positive' : 'brand'} className="mt-1">
                      <Syringe className="size-3.5" /> Given here · {i.dosesGiven} of {i.dosesTotal} doses
                    </Badge>
                  )}
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
            visitId={visit.id}
            onAdded={() => {
              refresh();
              onAdded();
            }}
          />
        </div>
      )}
      <CounterNote branch={branch} visit={visit} field="pharmacyNote" label="Note to pharmacy" placeholder="e.g. Give the generic brand. Explain the inhaler to the patient." canEdit={canWrite} />
    </Card>
  );
}

const medicineKey = (m: Medicine) => m.id;
const medicineLabel = (m: Medicine) => `${m.name}${m.strength ? ` ${m.strength}` : ''}`;

// ---------------------------------------------------------------- dose: one dropdown, or typed

const TIMES = ['Morning', 'Afternoon', 'Night'];
const CUSTOM = '__custom';
/** "1-0-1" -> "1-0-1 — Morning, Night"; anything else (SOS, 1-1-1-1, 5 ml twice) as it is. */
function doseLabel(dose: string): string {
  const parts = dose.split('-');
  if (parts.length !== 3 || parts.some((x) => !/^\d+(\.5)?$/.test(x))) return dose;
  const when = TIMES.filter((_, i) => Number(parts[i]) > 0);
  return when.length ? `${dose.replace(/0\.5/g, '½')} — ${when.join(', ')}` : dose;
}

/** The usual doses (and the ones this branch has typed before) in one dropdown; "Custom…" opens a box to type any other. */
function DoseInput({ value, onChange, choices, error }: { value: string; onChange: (dose: string) => void; choices: string[]; error?: string }) {
  // Custom stays open while the typed text happens to match a listed dose, until a listed one is picked.
  const [custom, setCustom] = useState(!choices.includes(value));
  return (
    <Field required label="Dose" htmlFor="rx-dose" error={error} className="col-span-2">
      <div className="flex gap-2">
        <NativeSelect
          id="rx-dose"
          value={custom ? CUSTOM : value}
          onChange={(e) => {
            const picked = e.target.value;
            setCustom(picked === CUSTOM);
            onChange(picked === CUSTOM ? '' : picked);
          }}
        >
          {choices.map((d) => (
            <option key={d} value={d}>
              {doseLabel(d)}
            </option>
          ))}
          <option value={CUSTOM}>Custom…</option>
        </NativeSelect>
        {custom && <Input aria-label="Custom dose" autoFocus placeholder="Type the dose, e.g. 5 ml twice" maxLength={40} value={value} onChange={(e) => onChange(e.target.value)} />}
      </div>
    </Field>
  );
}

/** How to take it: "After food" and "Before food" first, then the other usual ones and what this branch has typed before. */
function InstructionInput({ value, onChange, choices }: { value: string; onChange: (text: string) => void; choices: string[] }) {
  const [custom, setCustom] = useState(value !== '' && !choices.includes(value));
  return (
    <Field label="Instructions" htmlFor="rx-instructions" className="col-span-2">
      <div className="flex gap-2">
        <NativeSelect
          id="rx-instructions"
          value={custom ? CUSTOM : value}
          onChange={(e) => {
            const picked = e.target.value;
            setCustom(picked === CUSTOM);
            onChange(picked === CUSTOM ? '' : picked);
          }}
        >
          {choices.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
          <option value="">No instruction</option>
          <option value={CUSTOM}>Other…</option>
        </NativeSelect>
        {custom && <Input aria-label="Other instruction" autoFocus placeholder="Type it, e.g. With warm water" maxLength={200} value={value} onChange={(e) => onChange(e.target.value)} />}
      </div>
    </Field>
  );
}

// ---------------------------------------------------------------- add a medicine

const INSTRUCTIONS = ['After food', 'Before food', 'With food', 'Chew and swallow', 'Empty stomach', 'At bedtime'];
const START_DOSES = ['1-0-1', '1-1-1', '1-0-0', '0-1-0', '0-0-1', '1-1-0', '0-1-1', '0.5-0-0.5', '2-0-2', '1-1-1-1', 'SOS'];
/** The fixed choices first, then what this branch has used that is not among them. */
const withRemembered = (fixed: string[], remembered: string[] = []) => [...fixed, ...remembered.filter((x) => !fixed.some((f) => f.toLowerCase() === x.toLowerCase()))];

function AddMedicineForm({ branch, visitId, onAdded }: { branch: string; visitId: number; onAdded: () => void }) {
  const meds = useQuery({ queryKey: ['medicines', branch], queryFn: () => api.get<{ medicines: Medicine[] }>(`/b/${branch}/medicines`), staleTime: 60_000 });
  const used = useQuery({ queryKey: ['rx-suggestions', branch], queryFn: () => api.get<PrescriptionSuggestions>(`/b/${branch}/prescription/suggestions`), staleTime: 60_000 });

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
    defaultValues: { dose: '1-0-1', days: 5, quantity: null, instructions: 'After food', givenHere: false },
  });
  const dose = watch('dose') ?? '';
  const days = Number(watch('days'));
  const medicineId = Number(watch('medicineId'));
  const instructions = watch('instructions') ?? '';
  const auto = suggestedQuantity(dose, days);
  const chosen = meds.data?.medicines.find((m) => m.id === medicineId);

  return (
    <form
      noValidate
      className="grid grid-cols-2 gap-3 sm:grid-cols-6"
      onSubmit={handleSubmit(async (values) => {
        try {
          const r = await api.post<{ quantity: number }>(`/b/${branch}/visits/${visitId}/prescription`, values);
          toast.success(`${chosen?.name ?? 'Medicine'} added · ${r.quantity} ${chosen ? FORM_UNIT[chosen.form] : ''}`);
          reset({ dose: values.dose, days: values.days, quantity: null, instructions: values.instructions ?? '', givenHere: false });
          onAdded();
        } catch (e) {
          if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof PrescriptionItemFormValues, { message: m[0] });
          else setError('root', { message: errorMessage(e) });
        }
      })}
    >
      <div className="col-span-2 sm:col-span-6" data-shortcut="alt+m">
        <div className="mb-2 text-sm font-medium">
          Add medicine <span aria-hidden className="text-critical">*</span>
        </div>
        <Combobox
          aria-label="Medicine"
          aria-invalid={!!errors.medicineId}
          options={meds.data?.medicines ?? []}
          value={medicineId || null}
          onChange={(id) => setValue('medicineId', (id ?? undefined) as number, { shouldValidate: id != null })}
          getKey={medicineKey}
          getLabel={medicineLabel}
          placeholder={meds.data?.medicines.length === 0 ? 'No medicines — add them in Inventory' : 'Search medicine…   (Alt+M)'}
          // No stock at all: the pharmacy could not give it, so it cannot be prescribed.
          isDisabled={(m) => m.stock === 0}
          emptyText="No medicine with that name"
          renderOption={(m) => (
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                <span className="font-medium">{m.name}</span>
                {m.strength && <span className="text-muted"> {m.strength}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {formatRupees(m.pricePaise)}/{FORM_UNIT[m.form]} · <span className={m.stock > 0 ? '' : 'font-medium text-critical'}>{m.stock > 0 ? `${m.stock} in stock` : 'Out of stock'}</span>
              </span>
            </span>
          )}
        />
        {errors.medicineId && <p className="mt-1 text-xs font-medium text-critical">{errors.medicineId.message}</p>}
      </div>

      <DoseInput value={dose} onChange={(d) => setValue('dose', d, { shouldValidate: d !== '' })} choices={withRemembered(START_DOSES, used.data?.doses)} error={errors.dose?.message} />
      <InstructionInput value={instructions} onChange={(x) => setValue('instructions', x)} choices={withRemembered(INSTRUCTIONS, used.data?.instructions)} />
      <Field required label="Days" htmlFor="rx-days" error={errors.days?.message}>
        <Input id="rx-days" inputMode="numeric" {...register('days', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} />
      </Field>
      <Field label="Qty" htmlFor="rx-qty" error={errors.quantity?.message} hint={auto != null ? `Auto: ${auto}` : 'Type it'}>
        <Input id="rx-qty" inputMode="numeric" placeholder={auto != null ? String(auto) : ''} {...register('quantity', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })} />
      </Field>

      <label className="col-span-2 flex min-h-10 items-center gap-2.5 text-sm sm:col-span-6">
        <input type="checkbox" className="size-5 accent-[var(--color-primary)]" {...register('givenHere')} />
        <span>
          <span className="font-medium">Give here in the hospital</span>
          <span className="text-muted"> — an injection or drip: the nurse gives each dose and ticks it on the Treatments page.</span>
        </span>
      </label>

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
