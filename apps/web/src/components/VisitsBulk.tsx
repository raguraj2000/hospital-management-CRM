// Many OP visits at once: the doctor had to leave (move all to another doctor), or the day is over (delete the
// visits nobody saw). The server decides what may change; this bar only sends the selection and shows the answer.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, UserRoundCog, X } from 'lucide-react';
import type { VisitsBulkResult } from '@platform/shared';
import { Button, ConfirmDialog, Dialog, NativeSelect, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

export function VisitsBulkBar({ branch, selected, doctors, onClear }: { branch: string; selected: number[]; doctors: { userId: number; name: string }[]; onClear: () => void }) {
  const qc = useQueryClient();
  const canMove = useCan('patient.edit');
  const canDelete = useCan('patient.delete');
  const [doctor, setDoctor] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [skipped, setSkipped] = useState<{ title: string; rows: VisitsBulkResult['skipped'] } | null>(null);

  const after = (r: VisitsBulkResult, did: string) => {
    if (r.done.length) toast.success(`${plural(r.done.length, 'visit')} ${did}`);
    if (r.skipped.length) setSkipped({ title: `${plural(r.skipped.length, 'visit')} left as they were`, rows: r.skipped });
    else if (!r.done.length) toast.info('Nothing changed');
    qc.invalidateQueries({ queryKey: ['visits', branch] });
    setConfirmDelete(false);
    onClear();
  };
  const move = useMutation({
    mutationFn: () => api.post<VisitsBulkResult>(`/b/${branch}/visits/change-doctor`, { visitIds: selected, doctorUserId: doctor === 'none' ? null : Number(doctor) }),
    onSuccess: (r) => after(r, `moved to ${doctor === 'none' ? '“not assigned”' : (doctors.find((d) => String(d.userId) === doctor)?.name ?? 'the doctor')}`),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.post<VisitsBulkResult>(`/b/${branch}/visits/delete`, { visitIds: selected }),
    onSuccess: (r) => after(r, 'deleted'),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      {selected.length > 0 && (
        <div role="region" aria-label="Selected visits" className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand bg-brand-soft px-4 py-2.5 shadow-sm">
          <b className="mr-1 tabular-nums">{plural(selected.length, 'visit')} selected</b>
          {canMove && (
            <>
              <NativeSelect aria-label="Move to doctor" value={doctor} onChange={(e) => setDoctor(e.target.value)} className="w-auto min-w-44">
                <option value="">Move to doctor…</option>
                {doctors.map((d) => (
                  <option key={d.userId} value={d.userId}>
                    {d.name}
                  </option>
                ))}
                <option value="none">Not assigned</option>
              </NativeSelect>
              <Button disabled={!doctor || move.isPending} onClick={() => move.mutate()}>
                <UserRoundCog /> Move
              </Button>
            </>
          )}
          {canDelete && (
            <Button variant="danger" disabled={remove.isPending} onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete
            </Button>
          )}
          <Button variant="ghost" className="ml-auto" onClick={onClear}>
            <X /> Clear
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${plural(selected.length, 'visit')}?`}
        description="Only visits where nothing was done yet are deleted. A visit with tests, medicines, charges or a bill stays: move it to another doctor instead."
        cancelLabel="Go back"
        confirmLabel="Delete"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />

      <Dialog open={!!skipped} onOpenChange={(o) => !o && setSkipped(null)} title={skipped?.title ?? ''} description="These were not changed, and why:">
        <ul className="divide-y divide-border">
          {skipped?.rows.map((s) => (
            <li key={s.id} className="py-2">
              <span className="font-medium">{s.patientName}</span> <span className="font-mono text-xs text-muted">{s.opNo}</span>
              <span className="block text-sm text-muted">{s.reason}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
