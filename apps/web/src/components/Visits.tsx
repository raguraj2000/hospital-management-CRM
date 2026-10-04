import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MoreHorizontal, Pencil, Trash2, XCircle } from 'lucide-react';
import { opToken, visitInputSchema, type Doctor, type DoctorsResponse, type OpVisit, type VisitFormValues, type VisitInput, type VisitStatus } from '@platform/shared';
import { Badge, Button, cn, ConfirmDelete, Dialog, Field, Input, Menu, MenuContent, MenuItem, MenuTrigger, NativeSelect, Skeleton, Textarea, toast, type Tone } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';

export const statusTone: Record<VisitStatus, Tone> = { waiting: 'warning', completed: 'positive', cancelled: 'neutral' };
export const statusLabel: Record<VisitStatus, string> = { waiting: 'Waiting', completed: 'Completed', cancelled: 'Cancelled' };

/** Everything that shows visits refreshes after a change. */
function useVisitInvalidate(branch: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['visits', branch] });
    qc.invalidateQueries({ queryKey: ['visit', branch] }); // the visit's own page
    qc.invalidateQueries({ queryKey: ['patient-visits', branch] });
    qc.invalidateQueries({ queryKey: ['patient-lab', branch] }); // a deleted visit's tests leave the patient's Lab tab
    qc.invalidateQueries({ queryKey: ['patient-bills', branch] });
    qc.invalidateQueries({ queryKey: ['patient', branch] }); // weight may have changed
    qc.invalidateQueries({ queryKey: ['dashboard', branch] });
  };
}

/** "BP 130/85 · Pulse 78 · 99.4°F · SpO₂ 97% · 71.2 kg" -- only what was measured. */
export function vitalsSummary(v: Pick<OpVisit, 'bpSystolic' | 'bpDiastolic' | 'pulse' | 'temperatureF' | 'spo2' | 'weightKg'>): string | null {
  const parts = [
    v.bpSystolic != null && v.bpDiastolic != null ? `BP ${v.bpSystolic}/${v.bpDiastolic}` : null,
    v.pulse != null ? `Pulse ${v.pulse}` : null,
    v.temperatureF != null ? `${v.temperatureF}°F` : null,
    v.spo2 != null ? `SpO₂ ${v.spo2}%` : null,
    v.weightKg != null ? `${v.weightKg} kg` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export function useDoctors(branch: string) {
  return useQuery({ queryKey: ['doctors', branch], queryFn: () => api.get<DoctorsResponse>(`/b/${branch}/doctors`), staleTime: 5 * 60_000 });
}

/** "Token 9 · OP-261003-009": how a visit is named in messages. The token is what staff call out. */
export function visitLabel(v: { opNo: string; token?: number | null }): string {
  const token = v.token ?? opToken(v.opNo);
  return token != null ? `Token ${token} · ${v.opNo}` : v.opNo;
}

/** "Token 9" pill, shown next to the OP no. Nothing if the OP no. carries no token. */
export function TokenBadge({ opNo, token = opToken(opNo), className }: { opNo: string; token?: number | null; className?: string }) {
  if (token == null) return null;
  return (
    <Badge tone="brand" className={cn('font-semibold tabular-nums', className)}>
      Token {token}
    </Badge>
  );
}

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return (
    <Badge tone={statusTone[status]} dot>
      {statusLabel[status]}
    </Badge>
  );
}

/** Complete / edit / cancel / delete for one visit (each shown only if the role allows). */
export function VisitActions({ branch, visit, label }: { branch: string; visit: OpVisit; label: string }) {
  const canEdit = useCan('patient.edit');
  const canDelete = useCan('patient.delete');
  const invalidate = useVisitInvalidate(branch);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const setStatus = useMutation({
    mutationFn: (status: VisitStatus) => api.patch(`/b/${branch}/visits/${visit.id}`, { status }),
    onSuccess: (_d, status) => {
      invalidate();
      toast.success(`${visitLabel(visit)} marked ${statusLabel[status].toLowerCase()}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/b/${branch}/visits/${visit.id}`),
    onSuccess: () => {
      invalidate();
      setDeleting(false);
      toast.success(`${visitLabel(visit)} deleted`);
    },
  });

  if (!canEdit && !canDelete) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      {canEdit && visit.status === 'waiting' && (
        <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate('completed')}>
          <CheckCircle2 className="text-positive" /> Complete
        </Button>
      )}
      <Menu>
        <MenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${label}`}>
            <MoreHorizontal />
          </Button>
        </MenuTrigger>
        <MenuContent align="end">
          {canEdit && (
            <MenuItem onSelect={() => setEditing(true)}>
              <Pencil /> Edit visit & vitals
            </MenuItem>
          )}
          {canEdit && visit.status !== 'waiting' && <MenuItem onSelect={() => setStatus.mutate('waiting')}>Move back to waiting</MenuItem>}
          {canEdit && visit.status === 'waiting' && (
            <MenuItem onSelect={() => setStatus.mutate('cancelled')}>
              <XCircle /> Cancel visit
            </MenuItem>
          )}
          {canDelete && (
            <MenuItem destructive onSelect={() => setDeleting(true)}>
              <Trash2 /> Delete visit
            </MenuItem>
          )}
        </MenuContent>
      </Menu>

      <Dialog open={editing} onOpenChange={setEditing} title={`Edit ${visitLabel(visit)}`} description={label}>
        <VisitForm
          branch={branch}
          initial={visit}
          submitLabel="Save visit"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await api.patch(`/b/${branch}/visits/${visit.id}`, values);
            invalidate();
            setEditing(false);
            toast.success(`${visitLabel(visit)} saved`);
          }}
        />
      </Dialog>
      <ConfirmDelete
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${visitLabel(visit)}?`}
        description={`This OP visit for ${label} is removed from the lists. It stays in the audit trail.`}
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

/** "New OP visit": the server sets today's date, the next OP number and with it the token. */
export function NewVisitForm({ branch, patientId, onDone, onCancel }: { branch: string; patientId: number; onDone: (v: OpVisit) => void; onCancel: () => void }) {
  const invalidate = useVisitInvalidate(branch);
  return (
    <VisitForm
      branch={branch}
      submitLabel="Start OP visit"
      onCancel={onCancel}
      onSubmit={async (values) => {
        const { visit } = await api.post<{ visit: OpVisit }>(`/b/${branch}/patients/${patientId}/visits`, values);
        invalidate();
        // Stays up longer: the front desk reads the token out to the patient.
        toast.success(visitLabel(visit), { description: "OP visit started. Tell the patient their token. Added to today's OP list as waiting.", duration: 12_000 });
        onDone(visit);
      }}
    />
  );
}

const num = (v: unknown) => (v === '' || v == null ? null : Number(v));

type VitalName = 'bpSystolic' | 'bpDiastolic' | 'pulse' | 'temperatureF' | 'spo2' | 'weightKg';
const VITALS: { name: VitalName; label: string; placeholder: string; decimal?: boolean }[] = [
  { name: 'bpSystolic', label: 'BP upper (mmHg)', placeholder: '120' },
  { name: 'bpDiastolic', label: 'BP lower (mmHg)', placeholder: '80' },
  { name: 'pulse', label: 'Pulse (/min)', placeholder: '72' },
  { name: 'temperatureF', label: 'Temp (°F)', placeholder: '98.6', decimal: true },
  { name: 'spo2', label: 'SpO₂ (%)', placeholder: '98' },
  { name: 'weightKg', label: 'Weight (kg)', placeholder: '62.5', decimal: true },
];

interface VisitFormProps {
  branch: string;
  initial?: OpVisit;
  submitLabel: string;
  onSubmit: (values: VisitInput) => Promise<void>;
  onCancel: () => void;
}

/** Doctor + complaint + vitals + notes. Same Zod rules as the API. */
export function VisitForm(props: VisitFormProps) {
  const doctors = useDoctors(props.branch);
  // The form starts only once the doctors are known: the select then opens on the right doctor
  // (a new visit: the branch's default) and a late answer can never reset what the user picked.
  // (If the list can't be loaded the form opens anyway, without a doctor, rather than waiting for the retries.)
  if (doctors.isPending && doctors.failureCount === 0) return <Skeleton className="h-96" />;
  return <VisitFields {...props} doctors={doctors.data?.doctors} defaultDoctorUserId={doctors.data?.defaultDoctorUserId ?? null} />;
}

function VisitFields({ initial, submitLabel, onSubmit, onCancel, doctors, defaultDoctorUserId }: VisitFormProps & { doctors?: Doctor[]; defaultDoctorUserId: number | null }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VisitFormValues, unknown, VisitInput>({
    resolver: zodResolver(visitInputSchema),
    defaultValues: {
      // Editing keeps the visit's own doctor; a new visit starts on the branch's default (still changeable).
      doctorUserId: initial ? initial.doctorUserId : defaultDoctorUserId,
      complaint: initial?.complaint ?? '',
      notes: initial?.notes ?? '',
      bpSystolic: initial?.bpSystolic ?? null,
      bpDiastolic: initial?.bpDiastolic ?? null,
      pulse: initial?.pulse ?? null,
      temperatureF: initial?.temperatureF ?? null,
      spo2: initial?.spo2 ?? null,
      weightKg: initial?.weightKg ?? null,
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSubmit(values);
        } catch (e) {
          if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof VisitFormValues, { message: m[0] });
          else setError('root', { message: errorMessage(e) });
        }
      })}
    >
      <Field
        label="Doctor"
        htmlFor="visit-doctor"
        error={errors.doctorUserId?.message}
        hint={doctors && !doctors.length ? 'No doctors in this branch yet — add them in Settings.' : undefined}
      >
        <NativeSelect id="visit-doctor" {...register('doctorUserId', { setValueAs: num })}>
          <option value="">Not assigned yet</option>
          {doctors?.map((d) => (
            <option key={d.userId} value={d.userId}>
              {d.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Complaint / reason for visit" htmlFor="complaint" error={errors.complaint?.message}>
        <Textarea id="complaint" rows={2} autoFocus={!initial} placeholder="e.g. Fever for 3 days" {...register('complaint')} />
      </Field>
      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">
          Vitals <span className="font-normal text-muted">(optional)</span>
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {VITALS.map((v) => (
            <Field key={v.name} label={v.label} htmlFor={`vital-${v.name}`} error={errors[v.name]?.message}>
              <Input
                id={`vital-${v.name}`}
                inputMode={v.decimal ? 'decimal' : 'numeric'}
                placeholder={v.placeholder}
                aria-invalid={!!errors[v.name]}
                {...register(v.name, { setValueAs: num })}
              />
            </Field>
          ))}
        </div>
      </fieldset>
      <Field label="Notes" htmlFor="visit-notes" error={errors.notes?.message}>
        <Textarea id="visit-notes" rows={2} {...register('notes')} />
      </Field>
      {errors.root && <p className="text-sm text-critical">{errors.root.message}</p>}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
