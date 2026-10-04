import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DoctorSettings as DoctorSettingsData, DoctorSettingsInput, DoctorSettingsPerson } from '@platform/shared';
import { Button, Card, CardHeader, cn, Field, NativeSelect, Skeleton, toast } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';

/** Ticked by hand (Doctor-role staff are doctors without a tick). */
const tickedOf = (people: DoctorSettingsPerson[]) => people.filter((p) => p.isDoctor && !p.isDoctorRole).map((p) => p.userId);

/** Settings → Branch settings: who sees patients in this branch (whatever their role) and the default doctor of new OP visits. */
export function DoctorSettings({ branch, branchName }: { branch: string; branchName: string }) {
  const qc = useQueryClient();
  const key = ['doctor-settings', branch];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => api.get<DoctorSettingsData>(`/b/${branch}/doctor-settings`) });
  const [ticked, setTicked] = useState<number[]>([]);
  const [defaultId, setDefaultId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!data) return;
    setTicked(tickedOf(data.people));
    setDefaultId(data.defaultDoctorUserId);
  }, [data]);

  if (isLoading) return <Skeleton className="mb-4 h-64" />;
  if (error || !data) return <Card className="mb-4 p-4 text-sm text-critical">{errorMessage(error)}</Card>;

  const saved = tickedOf(data.people);
  const changed = defaultId !== data.defaultDoctorUserId || ticked.length !== saved.length || ticked.some((id) => !saved.includes(id));
  const doctors = data.people.filter((p) => p.isDoctorRole || ticked.includes(p.userId));

  function toggle(userId: number) {
    setFieldErrors({});
    if (ticked.includes(userId)) {
      setTicked(ticked.filter((id) => id !== userId));
      if (defaultId === userId) setDefaultId(null); // the default doctor must be one of the doctors
    } else {
      setTicked([...ticked, userId]);
    }
  }

  async function save() {
    setSaving(true);
    setFieldErrors({});
    try {
      const body: DoctorSettingsInput = { doctorUserIds: ticked, defaultDoctorUserId: defaultId };
      qc.setQueryData(key, await api.put<DoctorSettingsData>(`/b/${branch}/doctor-settings`, body));
      qc.invalidateQueries({ queryKey: ['doctors', branch] }); // the new-visit form and the doctor filters pick it up at once
      toast.success('Doctors saved', { description: `Used at ${branchName} from now on.` });
    } catch (e) {
      if (e instanceof ApiError && e.fields) setFieldErrors(e.fields);
      else toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader title={`Doctors · ${branchName}`} />
      <p className="px-4 pt-3 text-sm text-muted">Tick everyone who sees patients here. A doctor can also be the owner or a branch admin.</p>
      <ul className="mt-2 divide-y divide-border border-y border-border">
        {data.people.map((p) => {
          const checked = p.isDoctorRole || ticked.includes(p.userId);
          // Someone ticked earlier whose role has since lost prescriptions can still be unticked.
          const disabled = p.isDoctorRole || (!p.canPrescribe && !checked);
          const hint = p.isDoctorRole ? 'Has the Doctor role — always a doctor here' : !p.canPrescribe ? `Can't write prescriptions with this role, so can't be a doctor${checked ? ' — untick to save' : ''}` : null;
          return (
            <li key={p.userId}>
              <label className={cn('flex min-h-11 items-center gap-3 px-4 py-2', disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-subtle/40')}>
                <input
                  type="checkbox"
                  className="size-5 shrink-0 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`${p.name} (${p.roleName}) sees patients as a doctor${hint ? `. ${hint}` : ''}`}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(p.userId)}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm font-medium', disabled && !checked && 'text-muted')}>{p.name}</span>
                  <span className="block text-xs text-muted">
                    {p.roleName}
                    {hint && ` · ${hint}`}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {fieldErrors.doctorUserIds && <p className="px-4 pt-3 text-xs font-medium text-critical">{fieldErrors.doctorUserIds[0]}</p>}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <Field
          label="Default doctor"
          htmlFor="default-doctor"
          error={fieldErrors.defaultDoctorUserId?.[0]}
          hint="New OP visits are given to this doctor unless the front desk picks another."
          className="sm:w-80"
        >
          <NativeSelect
            id="default-doctor"
            value={defaultId ?? ''}
            aria-invalid={!!fieldErrors.defaultDoctorUserId}
            onChange={(e) => {
              setFieldErrors({});
              setDefaultId(e.target.value ? Number(e.target.value) : null);
            }}
          >
            <option value="">None</option>
            {doctors.map((d) => (
              <option key={d.userId} value={d.userId}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Button className="sm:mt-6" disabled={!changed || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save doctors'}
        </Button>
      </div>
    </Card>
  );
}
