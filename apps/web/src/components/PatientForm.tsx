import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { GENDER_LABEL, GENDERS, patientInputSchema, type Patient, type PatientFormValues, type PatientInput, ageInfo } from '@platform/shared';
import { Button, Field, Input, NativeSelect, Textarea } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { ageOf } from '@/pages/Patients';
import { ConditionsPicker } from './Conditions';
import { isUndone } from '@/components/undo';
import { clearDraft, DraftBar, readDraft, saveDraft } from './drafts';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const emptyToNull = (v: unknown) => (v === '' ? null : v);
const phoneDigits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
/** The order this browser's date box expects, e.g. "mm/dd/yyyy" or "dd/mm/yyyy". */
const DATE_ORDER = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
  .formatToParts(new Date(2000, 0, 1))
  .map((p) => (p.type === 'day' ? 'dd' : p.type === 'month' ? 'mm' : p.type === 'year' ? 'yyyy' : p.value))
  .join('');

/** Add + edit patient. Same Zod schema as the API, so the browser and server agree on every rule. */
export function PatientForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onUseExisting,
  prefill,
}: {
  initial?: Patient;
  /** A new patient: what was already typed in the search (the mobile number or the name). */
  prefill?: { phone?: string; name?: string };
  /** Given: a patient already registered with the typed number can be picked instead of making a second record. */
  onUseExisting?: (p: Patient) => void;
  submitLabel: string;
  onSubmit: (values: PatientInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { branch } = useParams();
  // A new patient only: what is typed is kept as a draft (per branch) until it is saved.
  const draftKey = !initial && branch ? `patient:${branch}` : null;
  const [restored, setRestored] = useState(() => {
    const d = draftKey ? readDraft<PatientFormValues>(draftKey) : null;
    if (!d) return null;
    // The search says another number or name: that is another patient, not this draft.
    if (prefill?.phone && d.values.phone && phoneDigits(d.values.phone) !== phoneDigits(prefill.phone)) return null;
    if (prefill?.name && d.values.name && d.values.name.trim().toLowerCase() !== prefill.name.trim().toLowerCase()) return null;
    return d;
  });
  const blank: PatientFormValues = {
    name: initial?.name ?? prefill?.name ?? '',
    phone: initial?.phone?.replace(/^\+91/, '') ?? phoneDigits(prefill?.phone),
      email: initial?.email ?? '',
      gender: initial?.gender ?? null,
      dob: initial?.dob ?? '',
      ageYears: initial ? ageOf(initial) : null,
      bloodGroup: initial?.bloodGroup ?? '',
      weightKg: initial?.weightKg ?? null,
      heightCm: initial?.heightCm ?? null,
      address: initial?.address ?? '',
      conditions: initial?.conditions ?? '',
      emergencyContactName: initial?.emergencyContactName ?? '',
      emergencyContactPhone: initial?.emergencyContactPhone?.replace(/^\+91/, '') ?? '',
  };
  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues, unknown, PatientInput>({
    resolver: zodResolver(patientInputSchema),
    defaultValues: restored ? { ...blank, ...restored.values } : blank,
  });
  // Every change goes to the draft (only while the switch is on: saveDraft checks it).
  useEffect(() => {
    if (!draftKey) return;
    const sub = watch((values) => saveDraft(draftKey, values));
    return () => sub.unsubscribe();
  }, [draftKey, watch]);

  // Same mobile number as someone already registered: most often the same person typed in twice.
  const digits = phoneDigits(watch('phone'));
  const same = useQuery({
    queryKey: ['patients', branch, 'same-phone', digits],
    queryFn: () => api.get<{ patients: Patient[] }>(`/b/${branch}/patients?${new URLSearchParams({ q: digits, limit: '5' })}`),
    enabled: !!branch && digits.length === 10,
    staleTime: 10_000,
  });
  const sameNumber = digits.length === 10 ? (same.data?.patients ?? []).filter((p) => p.id !== initial?.id) : [];

  // A baby under one year: the age box holds 0, so the months (or days) are said under it.
  const born = ageInfo({ dob: watch('dob') || null, ageYears: null });
  const baby = born && born.years < 1 ? born.text : null;

  async function submit(values: PatientInput) {
    try {
      await onSubmit(values);
      if (draftKey) clearDraft(draftKey);
    } catch (err) {
      if (isUndone(err)) return; // Undo pressed: nothing was saved, the form stays as typed
      // Server-side rule broken? Show it on the right field.
      if (err instanceof ApiError && err.fields) {
        for (const [field, msgs] of Object.entries(err.fields)) setError(field as keyof PatientFormValues, { message: msgs[0] });
      } else {
        setError('root', { message: errorMessage(err) });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-2">
      {draftKey && (
        <div className="sm:col-span-2">
          <DraftBar
            restoredAt={restored?.at ?? null}
            onClear={() => {
              clearDraft(draftKey);
              setRestored(null);
              reset({ ...blank, name: '', phone: '' });
            }}
          />
        </div>
      )}
      <div className="sm:col-span-2">
        <Field required label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        </Field>
      </div>
      <Field label="Mobile number" htmlFor="phone" error={errors.phone?.message} hint="10 digits, +91 is added for you">
        <Input id="phone" inputMode="tel" placeholder="98765 43210" aria-invalid={!!errors.phone} {...register('phone')} />
      </Field>
      <Field label="Gender" htmlFor="gender">
        <NativeSelect id="gender" {...register('gender', { setValueAs: emptyToNull })}>
          <option value="">Not specified</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {GENDER_LABEL[g]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {sameNumber.length > 0 && (
        <div role="alert" className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm sm:col-span-2">
          <div className="font-semibold">This mobile number is already registered</div>
          <p className="text-xs text-muted">If it is the same person, use their record instead of making a second one. A family member with the same number can still be registered.</p>
          <ul className="mt-2 space-y-1.5">
            {sameNumber.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <Link to={`/${branch}/patients/${p.id}`} className="min-w-0 truncate hover:underline">
                  <span className="font-medium">{p.name}</span> <span className="font-mono text-xs text-muted">{p.uhid}</span>
                  {ageOf(p) != null && <span className="text-xs text-muted"> · {ageOf(p)} yrs</span>}
                  {p.gender && <span className="text-xs text-muted capitalize"> · {p.gender}</span>}
                </Link>
                {onUseExisting && (
                  <Button type="button" size="sm" variant="outline" onClick={() => onUseExisting(p)}>
                    Use this patient
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Field label="Date of birth" hint={DATE_ORDER} htmlFor="dob" error={errors.dob?.message}>
        <Input
          id="dob"
          type="date"
          {...register('dob', {
            // Picking the date fills in the age (whole years); the age can still be typed over.
            onChange: (e) => {
              const age = ageOf({ dob: e.target.value || null, ageYears: null });
              if (age != null && age >= 0 && age <= 130) setValue('ageYears', age, { shouldDirty: true, shouldValidate: true });
            },
          })}
        />
      </Field>
      <Field label="Age" hint={baby ? `${baby} old (from the date of birth)` : 'Filled in from the date of birth. Type it if the date is unknown.'} htmlFor="ageYears" error={errors.ageYears?.message}>
        <Input id="ageYears" inputMode="numeric" {...register('ageYears', { setValueAs: (v) => (v === '' || v == null ? null : Math.floor(Number(v))) })} />
      </Field>
      <Field label="Height (cm)" htmlFor="heightCm" error={errors.heightCm?.message}>
        <Input id="heightCm" inputMode="decimal" placeholder="e.g. 165" aria-invalid={!!errors.heightCm} {...register('heightCm', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })} />
      </Field>
      <Field label="Weight (kg)" htmlFor="weightKg" error={errors.weightKg?.message}>
        <Input
          id="weightKg"
          inputMode="decimal"
          placeholder="e.g. 62.5"
          aria-invalid={!!errors.weightKg}
          {...register('weightKg', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
        />
      </Field>
      <Field label="Blood group" htmlFor="bloodGroup">
        <NativeSelect id="bloodGroup" {...register('bloodGroup')}>
          <option value="">Unknown</option>
          {BLOOD_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message} hint="Optional">
        <Input id="email" type="email" placeholder="name@example.com" aria-invalid={!!errors.email} {...register('email')} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address" htmlFor="address" error={errors.address?.message}>
          <Textarea id="address" rows={2} placeholder="House, street, town" {...register('address')} />
        </Field>
      </div>

      <div className="border-t border-border pt-4 sm:col-span-2">
        <div className="text-sm font-semibold">Long-term conditions</div>
        <p className="mb-2 text-xs text-muted">Shown in red to the doctor at every visit. Optional.</p>
        <ConditionsPicker value={watch('conditions') ?? ''} onChange={(c) => setValue('conditions', c, { shouldDirty: true })} />
        {errors.conditions && <p className="mt-1 text-xs font-medium text-critical">{errors.conditions.message}</p>}
      </div>

      <div className="border-t border-border pt-4 sm:col-span-2">
        <div className="text-sm font-semibold">Emergency contact</div>
        <p className="text-xs text-muted">Who to call if something happens. Optional.</p>
      </div>
      <Field label="Contact name" htmlFor="emergencyContactName" error={errors.emergencyContactName?.message}>
        <Input id="emergencyContactName" placeholder="e.g. Ramesh (husband)" {...register('emergencyContactName')} />
      </Field>
      <Field label="Contact phone" htmlFor="emergencyContactPhone" error={errors.emergencyContactPhone?.message}>
        <Input
          id="emergencyContactPhone"
          inputMode="tel"
          placeholder="98765 43210"
          aria-invalid={!!errors.emergencyContactPhone}
          {...register('emergencyContactPhone')}
        />
      </Field>
      {errors.root && <p className="text-sm text-critical sm:col-span-2">{errors.root.message}</p>}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
