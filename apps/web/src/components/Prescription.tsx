// The prescription card of a visit: the medicines, and the form that adds one.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Pill, Plus, Syringe, Trash2 } from 'lucide-react';
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
  type PrescriptionSuggestions, } from '@platform/shared';
import { prettyDose } from '@platform/shared';
import { Badge, Button, Card, CardHeader, Combobox, EmptyState, Field, Input, NativeSelect, Skeleton, Table, TBody, TD, TH, THead, toast, TR, ConfirmDelete, Dialog } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { CounterNote } from './CounterNote';

const rxTone = { pending: 'warning', dispensed: 'positive', declined: 'neutral' } as const;
const rxLabel = { pending: 'At pharmacy', dispensed: 'Dispensed', declined: 'Not bought' } as const;

export function Prescription({ branch, visit, onAdded, hideNote, readOnly }: { branch: string; visit: OpVisit; onAdded: () => void; /** The note to the pharmacy is shown elsewhere (the doctor's steps). */ hideNote?: boolean; /** Only the table: nothing to add or remove. */ readOnly?: boolean }) {
  const canWrite = useCan('prescription.write') && !readOnly;
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
  // The line being changed in the form below (until the pharmacy has given it).
  const [editing, setEditing] = useState<PrescriptionItem | null>(null);
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
              <TR key={i.id} className={editing?.id === i.id ? 'bg-brand-soft' : undefined}>
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
                  {prettyDose(i.dose)} <span className="text-muted">× {i.days} days</span>
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
                      <Button size="icon-sm" variant="ghost" aria-label={`Edit ${i.medicineName}`} title="Change the dose, days, quantity or instruction" onClick={() => setEditing(i)}>
                        <Pencil />
                      </Button>
                    )}
                    {i.status === 'pending' && (
                      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${i.medicineName}`} disabled={remove.isPending} onClick={() => remove.mutate(i.id)}>
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
        <div className={editing ? 'border-t-2 border-brand bg-brand-soft/40 p-4' : 'border-t border-border p-4'}>
          <AddMedicineForm
            key={editing?.id ?? 'new'}
            branch={branch}
            visitId={visit.id}
            editing={editing}
            onEdited={() => setEditing(null)}
            onAdded={() => {
              refresh();
              onAdded();
            }}
          />
        </div>
      )}
      {!hideNote && <CounterNote branch={branch} visit={visit} field="pharmacyNote" label="Note to pharmacy" placeholder="e.g. Give the generic brand. Explain the inhaler to the patient." canEdit={canWrite} />}
    </Card>
  );
}

const medicineKey = (m: Medicine) => m.id;
export const medicineLabel = (m: Medicine) => `${m.name}${m.strength ? ` ${m.strength}` : ''}`;
/** A medicine in the search list: name and strength, then the rate and what is in stock. */
export const medicineOption = (m: Medicine) => (
  <span className="flex items-center justify-between gap-3">
    <span className="min-w-0 truncate">
      <span className="font-medium">{m.name}</span>
      {m.strength && <span className="text-muted"> {m.strength}</span>}
    </span>
    <span className="shrink-0 text-xs text-muted">
      {formatRupees(m.pricePaise)}/{FORM_UNIT[m.form]} · <span className={m.stock > 0 ? '' : 'font-medium text-critical'}>{m.stock > 0 ? `${m.stock} in stock` : 'Out of stock'}</span>
    </span>
  </span>
);

// ---------------------------------------------------------------- dose: one dropdown, or typed

const TIMES = ['Morning', 'Afternoon', 'Night'];
const CUSTOM = '__custom';
/** "1-0-1" -> "1-0-1 (BD)", "1-1-1" -> "1-1-1 (TDS)"; anything else (SOS, 1-1-1-1, 5 ml twice) as it is. */
function doseLabel(dose: string): string {
  const parts = dose.split('-');
  if (parts.length !== 3 || parts.some((x) => !/^\d+(\.(?:25|5|75))?$/.test(x))) return dose;
  const when = TIMES.filter((_, i) => Number(parts[i]) > 0);
  // The short name doctors write: once, twice, three times a day.
  const times = ['', 'OD', 'BD', 'TDS'][when.length];
  return when.length ? `${prettyDose(dose)} (${times})` : dose;
}

/** The usual doses (and the ones this branch has typed before) in one dropdown; "Custom…" opens a box to type any other. */
export function DoseInput({ value, onChange, choices, error, id = 'rx-dose' }: { value: string; onChange: (dose: string) => void; choices: string[]; error?: string; id?: string }) {
  // Custom stays open while the typed text happens to match a listed dose, until a listed one is picked.
  const [custom, setCustom] = useState(!choices.includes(value));
  return (
    <Field required label="Dose" htmlFor={id} error={error} className="col-span-2">
      <div className="flex gap-2">
        <NativeSelect
          id={id}
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
export function InstructionInput({ value, onChange, choices, id = 'rx-instructions' }: { value: string; onChange: (text: string) => void; choices: string[]; id?: string }) {
  const [custom, setCustom] = useState(value !== '' && !choices.includes(value));
  return (
    <Field label="Instructions" htmlFor={id} className="col-span-2">
      <div className="flex gap-2">
        <NativeSelect
          id={id}
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
/** What a syrup dose can be, in ml. */
const SYRUP_ML = ['1', '2', '2.5', '3', '4', '5', '7.5', '10', '15'];
const START_DOSES = ['1-0-1', '1-1-1', '1-0-0', '0-1-0', '0-0-1', '1-1-0', '0-1-1', '0.5-0-0.5', '0.5-0.5-0.5', '0.75-0-0.75', '0.75-0.75-0.75', '0.5-0-0', '2-0-2', '1-1-1-1', 'SOS'];
/** The fixed choices first, then what this branch has used that is not among them. */
const withRemembered = (fixed: string[], remembered: string[] = []) => [...fixed, ...remembered.filter((x) => !fixed.some((f) => f.toLowerCase() === x.toLowerCase()))];

/** The dose and instruction choices of the prescription form: the usual ones, then what this branch has typed before. */
export function useRxChoices(branch: string) {
  const used = useQuery({ queryKey: ['rx-suggestions', branch], queryFn: () => api.get<PrescriptionSuggestions>(`/b/${branch}/prescription/suggestions`), staleTime: 60_000 });
  return { doses: withRemembered(START_DOSES, used.data?.doses), instructions: withRemembered(INSTRUCTIONS, used.data?.instructions) };
}

/** A syrup's saved dose "2.5 ml · 1-0-1" as its two parts; any other dose as it is. */
const splitMl = (dose: string) => {
  const m = dose.match(/^([\d.]+) ml · (.+)$/);
  return m ? { ml: m[1]!, pattern: m[2]! } : { ml: '5', pattern: dose };
};

/** What the quantity of a line is when nobody types it: one bottle of a syrup, else dose x days. (Then the box is left empty, so it follows a new dose or days.) */
const autoQuantity = (i: PrescriptionItem) => (i.form === 'syrup' ? 1 : suggestedQuantity(i.dose, i.days));

/** `editing`: a line already on the prescription is changed (its medicine stays); without it a medicine is added. */
function AddMedicineForm({ branch, visitId, onAdded, editing, onEdited }: { branch: string; visitId: number; onAdded: () => void; editing?: PrescriptionItem | null; onEdited?: () => void }) {
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
    defaultValues: editing
      ? { medicineId: editing.medicineId, dose: splitMl(editing.dose).pattern, days: editing.days, quantity: autoQuantity(editing) === editing.quantity ? null : editing.quantity, instructions: editing.instructions ?? '', givenHere: editing.givenHere }
      : { dose: '1-0-1', days: 5, quantity: null, instructions: 'After food', givenHere: false },
  });
  const dose = watch('dose') ?? '';
  const days = Number(watch('days'));
  const medicineId = Number(watch('medicineId'));
  const instructions = watch('instructions') ?? '';
  // A syrup is given in ml; the pharmacy hands over a bottle, so the quantity is 1 unless typed.
  const [ml, setMl] = useState(editing ? splitMl(editing.dose).ml : '5');
  const liquid = meds.data?.medicines.find((m) => m.id === medicineId)?.form === 'syrup';
  const auto = liquid ? 1 : suggestedQuantity(dose, days);
  const chosen = meds.data?.medicines.find((m) => m.id === medicineId);
  // Never more than the pharmacy has (the server refuses it too).
  const wanted = Number(watch('quantity')) || auto || 0;
  const short = !!chosen && wanted > chosen.stock;

  return (
    <form
      noValidate
      // One line on a computer screen: [each dose (ml)] dose, instructions, days, quantity.
      className={`grid grid-cols-2 gap-3 ${liquid ? 'sm:grid-cols-7' : 'sm:grid-cols-6'}`}
      onSubmit={handleSubmit(async (values) => {
        try {
          const body = liquid ? { ...values, dose: `${ml} ml · ${values.dose}`.slice(0, 40), quantity: values.quantity ?? 1 } : values;
          if (editing) {
            await api.patch(`/b/${branch}/prescription-items/${editing.id}`, { dose: body.dose, days: body.days, quantity: body.quantity ?? null, instructions: body.instructions ?? '' });
            toast.success(`${editing.medicineName} changed`);
            onAdded();
            onEdited?.();
            return;
          }
          const r = await api.post<{ quantity: number }>(`/b/${branch}/visits/${visitId}/prescription`, body);
          toast.success(`${chosen?.name ?? 'Medicine'} added · ${r.quantity} ${chosen ? FORM_UNIT[chosen.form] : ''}`);
          reset({ dose: values.dose, days: values.days, quantity: null, instructions: values.instructions ?? '', givenHere: false });
          onAdded();
        } catch (e) {
          if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof PrescriptionItemFormValues, { message: m[0] });
          else setError('root', { message: errorMessage(e) });
        }
      })}
    >
      <div className="col-span-2 sm:col-span-full" data-shortcut="alt+m">
        <div className="mb-2 text-sm font-medium">
          {editing ? (
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">Editing</span>
              {editing.medicineName} {editing.strength && <span className="font-normal text-muted">{editing.strength}</span>}
            </span>
          ) : (
            <>
              Add drug <span aria-hidden className="text-critical">*</span>
            </>
          )}
        </div>
        {editing ? (
          <p className="text-xs text-muted">Change the dose, days, quantity or instruction below. To give a different drug, remove this one and add the other.</p>
        ) : (
        <Combobox
          aria-label="Medicine"
          aria-invalid={!!errors.medicineId}
          options={meds.data?.medicines ?? []}
          value={medicineId || null}
          onChange={(id) => setValue('medicineId', (id ?? undefined) as number, { shouldValidate: id != null })}
          getKey={medicineKey}
          getLabel={medicineLabel}
          placeholder={meds.data?.medicines.length === 0 ? 'No medicines — add them in Inventory' : 'Search drug…   (Alt+M)'}
          // No stock at all: the pharmacy could not give it, so it cannot be prescribed.
          isDisabled={(m) => m.stock === 0}
          emptyText="No medicine with that name"
          renderOption={medicineOption}
        />
        )}
        {errors.medicineId && <p className="mt-1 text-xs font-medium text-critical">{errors.medicineId.message}</p>}
      </div>

      {liquid && (
        <Field required label="Each dose (ml)" htmlFor="rx-ml">
          <NativeSelect id="rx-ml" value={ml} onChange={(e) => setMl(e.target.value)}>
            {SYRUP_ML.map((x) => (
              <option key={x} value={x}>
                {x} ml
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <DoseInput value={dose} onChange={(d) => setValue('dose', d, { shouldValidate: d !== '' })} choices={withRemembered(START_DOSES, used.data?.doses).filter((d) => !liquid || !/ml/i.test(d))} error={errors.dose?.message} />
      <InstructionInput value={instructions} onChange={(x) => setValue('instructions', x)} choices={withRemembered(INSTRUCTIONS, used.data?.instructions)} />
      <Field required label="Days" htmlFor="rx-days" error={errors.days?.message}>
        <Input id="rx-days" inputMode="numeric" {...register('days', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} />
      </Field>
      <Field label="Qty" htmlFor="rx-qty" error={errors.quantity?.message} hint={liquid ? 'Auto: 1 bottle' : auto != null ? `Auto: ${auto}${chosen ? ` · ${chosen.stock} in stock` : ''}` : 'Type it'}>
        <Input id="rx-qty" inputMode="numeric" placeholder={auto != null ? String(auto) : ''} {...register('quantity', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })} />
      </Field>

      <label className={`col-span-2 flex min-h-10 items-center gap-2.5 text-sm sm:col-span-full ${editing ? 'hidden' : ''}`}>
        <input type="checkbox" className="size-5 accent-[var(--color-primary)]" {...register('givenHere')} />
        <span>
          <span className="font-medium">Give here in the hospital</span>
          <span className="text-muted"> — an injection or drip: the nurse gives each dose and ticks it on the “Doses to give” page.</span>
        </span>
      </label>

      <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-full">
        <div className="text-xs text-muted">
          {chosen && (
            <>
              {chosen.name}: {formatRupees(chosen.pricePaise)} × {auto ?? '?'} = <b className="text-ink">{auto != null ? formatRupees(chosen.pricePaise * auto) : '—'}</b>
              {short && <span className="ml-2 rounded bg-critical-soft px-1.5 py-0.5 font-semibold text-critical">Only {chosen.stock} in stock: lower the quantity</span>}
            </>
          )}
          {errors.root && <span className="text-critical">{errors.root.message}</span>}
        </div>
        <div className="flex gap-2">
          {editing && (
            <Button type="button" variant="outline" onClick={() => onEdited?.()}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || short}>
            {editing ? <Pencil /> : <Plus />} {isSubmitting ? 'Saving…' : editing ? 'Save change' : 'Add to prescription'}
          </Button>
        </div>
      </div>
    </form>
  );
}
