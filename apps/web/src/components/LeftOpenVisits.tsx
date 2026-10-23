import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { CalendarClock } from 'lucide-react';
import type { LeftOpenVisit } from '@platform/shared';
import { Button, buttonVariants, Card, CardHeader, ConfirmDialog, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { VisitStatusBadge } from './Visits';

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * Earlier days' visits the doctor never finished: they left the day's list at midnight, so they wait here.
 * Bring to today (a new token today; only when nothing was done on it yet), open it, or close it (went home, not seen).
 */
export function LeftOpenVisits({ branch }: { branch: string }) {
  const qc = useQueryClient();
  const canBring = useCan('patient.create');
  const canClose = useCan('patient.edit');
  const [closing, setClosing] = useState<LeftOpenVisit | null>(null);
  const { data } = useQuery({ queryKey: ['visits', branch, 'left-open'], queryFn: () => api.get<{ visits: LeftOpenVisit[] }>(`/b/${branch}/visits/left-open`), refetchOnWindowFocus: 'always' });
  const done = (message: string) => {
    toast.success(message);
    qc.invalidateQueries({ queryKey: ['visits', branch] });
    setClosing(null);
  };
  const bring = useMutation({
    mutationFn: (v: LeftOpenVisit) => api.post(`/b/${branch}/visits/${v.id}/bring-to-today`),
    onSuccess: (_, v) => done(`${v.patientName} is in today's queue with a new token`),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const close = useMutation({
    mutationFn: (v: LeftOpenVisit) => api.patch(`/b/${branch}/visits/${v.id}`, { status: 'cancelled' }),
    onSuccess: (_, v) => done(`${v.patientName}'s visit of ${fmtDay(v.visitDate)} is closed`),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const visits = data?.visits ?? [];
  if (!visits.length) return null;
  return (
    <Card className="mb-4 border-warning">
      <CardHeader
        title={`Left open from earlier days (${visits.length})`}
        description="Not finished on their day. Bring to today gives a new token at the end of today's queue; close the visit if the patient went home without being seen."
      />
      <div className="divide-y divide-border">
        {visits.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-warning">
              <CalendarClock className="size-4" /> {fmtDay(v.visitDate)}
            </span>
            <span className="min-w-40 flex-1">
              <span className="font-medium">{v.patientName}</span>
              <span className="ml-2 font-mono text-xs text-muted">{v.opNo}</span>
              {v.complaint && <span className="block truncate text-xs text-muted">{v.complaint}</span>}
            </span>
            <VisitStatusBadge status={v.status} />
            <div className="flex flex-wrap gap-1.5">
              <Link to={`/${branch}/visits/${v.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                Open
              </Link>
              {canBring && v.movable && (
                <Button size="sm" disabled={bring.isPending} onClick={() => bring.mutate(v)}>
                  Bring to today
                </Button>
              )}
              {canClose && (
                <Button size="sm" variant="outline" onClick={() => setClosing(v)}>
                  Close – not seen
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!closing}
        onOpenChange={(o) => !o && setClosing(null)}
        title={`Close ${closing?.patientName}'s visit?`}
        description="The visit is marked cancelled. A visit with a bill or a pharmacy sale cannot be closed: open it and finish it at the counter."
        cancelLabel="Go back"
        confirmLabel="Close the visit"
        pending={close.isPending}
        onConfirm={() => closing && close.mutate(closing)}
      />
    </Card>
  );
}
