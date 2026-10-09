import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { CheckCircle2, DoorOpen, MoreHorizontal, Pencil, Trash2, XCircle } from 'lucide-react';
import {
  opToken,
  visitInputSchema,
  type Doctor,
  type DoctorsResponse,
  type OpVisit,
  type VisitCallNextResponse,
  type VisitFormValues,
  type VisitInput,
  type VisitStatus,
} from '@platform/shared';
import { Badge, Button, cn, ConfirmDelete, Dialog, Field, Input, Menu, MenuContent, MenuItem, MenuTrigger, NativeSelect, Skeleton, Textarea, toast, type Tone } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { useCan, useMe } from '@/state/auth';

export const statusTone: Record<VisitStatus, Tone> = { waiting: 'warning', with_doctor: 'brand', at_lab: 'violet', at_counter: 'brand', completed: 'positive', cancelled: 'neutral' };
export const statusLabel: Record<VisitStatus, string> = {
  waiting: 'Waiting',
  with_doctor: 'With doctor',
  at_lab: 'At lab',
  at_counter: 'At pharmacy & billing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
/** Still in the hospital today: not completed, not cancelled. */
export const isOpenVisit = (status: VisitStatus) => status !== 'completed' && status !== 'cancelled';

/** "Token 6 — Ravi Kumar": how a patient is called out. */
export function tokenName(v: { opNo: string; token?: number | null; patientName: string }): string {
  const token = v.token ?? opToken(v.opNo);
  return `${token != null ? `Token ${token}` : v.opNo} — ${v.patientName}`;
}

/** Everything that shows visits refreshes after a change. */
export function useVisitInvalidate(branch: string) {
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

/** Where the patient is. At the lab with every result in = "Lab result ready" (they go back in before the next token). */
export function VisitStatusBadge({ status, labReady, className }: { status: VisitStatus; labReady?: boolean; className?: string }) {
  const ready = status === 'at_lab' && labReady;
  return (
    <Badge
      tone={ready ? 'positive' : statusTone[status]}
      dot
      // The two that need someone to act now are solid, so they stand out in a long list.
      className={cn('px-2.5 py-1 text-sm', status === 'with_doctor' && 'bg-brand text-brand-foreground', ready && 'bg-positive text-white', className)}
    >
      {ready ? 'Lab result ready' : statusLabel[status]}
    </Badge>
  );
}

/**
 * Call a patient in: the next one (the server picks: back from the lab with results first, then the lowest
 * token) or the one given. Whoever prescribes is taken to that visit, unless they are already on it (stay).
 */
export function useCallNext(branch: string, { stay = false }: { stay?: boolean } = {}) {
  const invalidate = useVisitInvalidate(branch);
  const navigate = useNavigate();
  const canPrescribe = useCan('prescription.write');
  return useMutation({
    mutationFn: (body: { visitId?: number; doctorUserId?: number | null }) => api.post<VisitCallNextResponse>(`/b/${branch}/visits/call-next`, body),
    onSuccess: ({ visit, previous, reason }) => {
      invalidate();
      const notes = [reason === 'lab_ready' ? 'Back from lab — result ready.' : null, previous ? `${tokenName(previous)} moved back to waiting.` : null].filter(Boolean);
      // Stays up longer: it is read out to the waiting room.
      toast.success(`${tokenName(visit)}, please go in`, { description: notes.length ? notes.join(' ') : undefined, duration: 10_000 });
      if (canPrescribe && !stay) navigate(`/${branch}/visits/${visit.id}`);
    },
    onError: (e) => {
      invalidate(); // the list on screen was out of date
      toast.error(errorMessage(e));
    },
  });
}

/** Call in / edit / complete / cancel / delete for one visit (each shown only if the role allows). */
export function VisitActions({ branch, visit, label, callIn = true }: { branch: string; visit: OpVisit; label: string; callIn?: boolean }) {
  const canEdit = useCan('patient.edit');
  const canDelete = useCan('patient.delete');
  const invalidate = useVisitInvalidate(branch);
  const call = useCallNext(branch);
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
      {canEdit && callIn && (visit.status === 'waiting' || visit.status === 'at_lab') && (
        <Button variant="outline" disabled={call.isPending} onClick={() => call.mutate({ visitId: visit.id })}>
          <DoorOpen className="text-brand" /> Call in
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
          {canEdit && isOpenVisit(visit.status) && (
            <MenuItem onSelect={() => setStatus.mutate('completed')}>
              <CheckCircle2 /> Mark completed
            </MenuItem>
          )}
          {canEdit && visit.status !== 'waiting' && <MenuItem onSelect={() => setStatus.mutate('waiting')}>Move back to waiting</MenuItem>}
          {canEdit && isOpenVisit(visit.status) && (
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

/**
 * "New OP visit": the server sets today's date, the next OP number and with it the token.
 * "See now" also sends the patient straight in to the doctor (no waiting step), for when nobody is waiting.
 * `onDone(visit, seenNow)`.
 */
export function NewVisitForm({ branch, patientId, onDone, onCancel }: { branch: string; patientId: number; onDone: (v: OpVisit, seenNow: boolean) => void; onCancel: () => void }) {
  const invalidate = useVisitInvalidate(branch);
  const canCallIn = useCan('patient.edit');

  async function create(values: VisitInput, seeNow: boolean) {
    const { visit } = await api.post<{ visit: OpVisit }>(`/b/${branch}/patients/${patientId}/visits`, values);
    try {
      if (seeNow) await api.post(`/b/${branch}/visits/call-next`, { visitId: visit.id });
    } catch (e) {
      // The visit exists; only the extra step failed. Say so instead of losing the visit.
      toast.error(`${visitLabel(visit)} was started, but: ${errorMessage(e)}`);
      seeNow = false;
    }
    invalidate();
    // Stays up longer: the front desk reads the token out to the patient.
    if (seeNow) toast.success(`${visitLabel(visit)}, please go in`, { description: 'Sent straight in to the doctor.', duration: 12_000 });
    else toast.success(visitLabel(visit), { description: "OP visit started. Tell the patient their token. Added to today's OP list as waiting.", duration: 12_000 });
    onDone(visit, seeNow);
  }

  return (
    <VisitForm
      branch={branch}
      submitLabel="Start OP visit"
      onCancel={onCancel}
      onSubmit={(values) => create(values, false)}
      onSeeNow={canCallIn ? (values) => create(values, true) : undefined}
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
  /** New visits only: a second button that starts the visit and sends the patient straight in. */
  onSeeNow?: (values: VisitInput) => Promise<void>;
  /** Extra fields under the doctor (the fee, on a new visit). */
  extra?: ReactNode;
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

function VisitFields({ branch, initial, submitLabel, onSubmit, onCancel, onSeeNow, extra, doctors, defaultDoctorUserId }: VisitFormProps & { doctors?: Doctor[]; defaultDoctorUserId: number | null }) {
  const { data: me } = useMe();
  // A doctor starting a visit themselves: it is theirs unless they pick someone else.
  const myself = doctors?.some((d) => d.userId === me?.user.id) ? me!.user.id : null;
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VisitFormValues, unknown, VisitInput>({
    resolver: zodResolver(visitInputSchema),
    defaultValues: {
      // Editing keeps the visit's own doctor; a new visit starts on the branch's default (still changeable).
      doctorUserId: initial ? initial.doctorUserId : (myself ?? defaultDoctorUserId),
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

  // "See now" puts the patient inside at once, so it waits while that doctor still has someone inside.
  const today = useQuery({ queryKey: ['visits', branch, '', ''], queryFn: () => api.get<{ visits: OpVisit[] }>(`/b/${branch}/visits?`), enabled: !!onSeeNow, staleTime: 0 });
  const doctorId = num(watch('doctorUserId'));
  const inside = today.data?.visits.find((v) => v.status === 'with_doctor' && v.doctorUserId === doctorId);
  const submitWith = (fn: (values: VisitInput) => Promise<void>) =>
    handleSubmit(async (values) => {
      try {
        await fn(values);
      } catch (e) {
        if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof VisitFormValues, { message: m[0] });
        else setError('root', { message: errorMessage(e) });
      }
    });

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submitWith(onSubmit)}>
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
      {extra}
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
        {onSeeNow && (
          <Button type="button" variant="outline" disabled={isSubmitting || !!inside} onClick={submitWith(onSeeNow)}>
            <DoorOpen /> See now
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
      {onSeeNow && (
        <p className="text-right text-xs text-muted">
          {inside ? `See now is off: ${visitLabel(inside)} is with this doctor. Finish that visit first.` : 'See now: no waiting, the patient goes straight in to the doctor.'}
        </p>
      )}
    </form>
  );
}
