import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientInputSchema, type Patient, type PatientFormValues, type PatientInput } from '@platform/shared';
import { Button, Field, Input, NativeSelect, Textarea } from '@platform/ui';
import { ApiError, errorMessage } from '@/api/client';
import { ConditionsPicker } from './Conditions';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const emptyToNull = (v: unknown) => (v === '' ? null : v);

/** Add + edit patient. Same Zod schema as the API, so the browser and server agree on every rule. */
export function PatientForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Patient;
  submitLabel: string;
  onSubmit: (values: PatientInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues, unknown, PatientInput>({
    resolver: zodResolver(patientInputSchema),
    defaultValues: {
      name: initial?.name ?? '',
      phone: initial?.phone?.replace(/^\+91/, '') ?? '',
      email: initial?.email ?? '',
      gender: initial?.gender ?? null,
      dob: initial?.dob ?? '',
      ageYears: initial?.ageYears ?? null,
      bloodGroup: initial?.bloodGroup ?? '',
      weightKg: initial?.weightKg ?? null,
      address: initial?.address ?? '',
      conditions: initial?.conditions ?? '',
      emergencyContactName: initial?.emergencyContactName ?? '',
      emergencyContactPhone: initial?.emergencyContactPhone?.replace(/^\+91/, '') ?? '',
    },
  });

  async function submit(values: PatientInput) {
    try {
      await onSubmit(values);
    } catch (err) {
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
      <div className="sm:col-span-2">
        <Field label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
        </Field>
      </div>
      <Field label="Mobile number" htmlFor="phone" error={errors.phone?.message} hint="10 digits, +91 is added for you">
        <Input id="phone" inputMode="tel" placeholder="98765 43210" aria-invalid={!!errors.phone} {...register('phone')} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message} hint="Optional">
        <Input id="email" type="email" placeholder="name@example.com" aria-invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field label="Date of birth" htmlFor="dob" error={errors.dob?.message}>
        <Input id="dob" type="date" {...register('dob')} />
      </Field>
      <Field label="Age" hint="Only if date of birth is unknown" htmlFor="ageYears" error={errors.ageYears?.message}>
        <Input id="ageYears" inputMode="numeric" {...register('ageYears', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })} />
      </Field>
      <Field label="Gender" htmlFor="gender">
        <NativeSelect id="gender" {...register('gender', { setValueAs: emptyToNull })}>
          <option value="">Not specified</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </NativeSelect>
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
      <Field label="Weight (kg)" htmlFor="weightKg" error={errors.weightKg?.message}>
        <Input
          id="weightKg"
          inputMode="decimal"
          placeholder="e.g. 62.5"
          aria-invalid={!!errors.weightKg}
          {...register('weightKg', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
        />
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
