// The doctor's next step on the consultation screen: the slim "What next?" bar at the bottom.
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { FlaskConical, Hourglass, Pill, Stethoscope } from 'lucide-react';
import { formatRupees, type OpVisit, type PrescriptionItem, type VisitSendResponse, type VisitSendTo } from '@platform/shared';
import { Button, cn, toast } from '@platform/ui';
import { api, errorMessage } from '@/core/api/client';
import { useCan } from '@/core/auth';
import { useVisitLab } from './VisitLab';
import { tokenName, useCallNext, useVisitInvalidate } from './Visits';
import { KeyHint } from './Shortcuts';
import { isUndone, withUndo } from '@/components/undo';

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const SENT: Record<VisitSendTo, string> = { lab: 'sent to the lab', counter: 'sent to pharmacy & billing', waiting: 'moved back to waiting' };

/**
 * Sticky bar at the bottom of the visit: what happens to this patient now. Each choice sends the patient
 * and calls the doctor's next one in. `nudge` changes when a medicine or a test was just added: the bar
 * is brought into view and lights up, so the next step is never missed.
 */
/** Send this patient on (lab, counter, back to waiting); the doctor's next patient is called in and opened. */
export function useVisitSend(branch: string, visit: OpVisit, patientName: string) {
  const navigate = useNavigate();
  const invalidate = useVisitInvalidate(branch);
  const who = tokenName({ ...visit, patientName });
  return useMutation({
    // Sent after 5 seconds: Undo on the toast keeps the patient here.
    mutationFn: (to: VisitSendTo) => withUndo(`${who}: ${SENT[to].replace('moved back to waiting', 'back to waiting')}`, () => api.post<VisitSendResponse>(`/b/${branch}/visits/${visit.id}/send`, { to, callNext: true })),
    onSuccess: ({ visit: sent, next }, to) => {
      invalidate();
      // Already paid and nothing to give at the counter: the visit is done.
      const description = sent.status === 'completed' ? `${who}: visit completed, nothing to collect.` : `${who} ${SENT[to]}.`;
      if (next) {
        toast.success(next.reason === 'lab_ready' ? `Back from lab: ${tokenName(next.visit)}, result ready` : `Next: ${tokenName(next.visit)}`, { description, duration: 10_000 });
        navigate(`/${branch}/visits/${next.visit.id}`);
      } else {
        toast.success('No more patients waiting', { description, duration: 10_000 });
        navigate(`/${branch}/visits`);
      }
    },
    onError: (e) => {
      if (isUndone(e)) return;
      invalidate();
      toast.error(errorMessage(e));
    },
  });
}

export function WhatNextBar({ branch, visit, patientName, consultationFeePaise, nudge }: { branch: string; visit: OpVisit; patientName: string; consultationFeePaise: number; nudge: number }) {
  const canEdit = useCan('patient.edit'); // the same permission as changing a visit's status
  const navigate = useNavigate();
  const invalidate = useVisitInvalidate(branch);
  const start = useCallNext(branch, { stay: true });
  // The same queries (and cache) as the Prescription and Lab tests cards: the counts follow every add / remove at once.
  const rx = useQuery({ queryKey: ['prescription', branch, visit.id], queryFn: () => api.get<{ items: PrescriptionItem[] }>(`/b/${branch}/visits/${visit.id}/prescription`), enabled: canEdit });
  const lab = useVisitLab(branch, visit.id, canEdit);

  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!nudge) return;
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setLit(true);
    const timer = setTimeout(() => setLit(false), 2500);
    return () => clearTimeout(timer);
  }, [nudge]);

  const who = tokenName({ ...visit, patientName });
  const send = useMutation({
    // Sent after 5 seconds: Undo on the toast keeps the patient here.
    mutationFn: (to: VisitSendTo) => withUndo(`${who}: ${SENT[to].replace('moved back to waiting', 'back to waiting')}`, () => api.post<VisitSendResponse>(`/b/${branch}/visits/${visit.id}/send`, { to, callNext: true })),
    onSuccess: ({ visit: sent, next }, to) => {
      invalidate();
      // Already paid and nothing to give at the counter: the visit is done.
      const description = sent.status === 'completed' ? `${who}: visit completed, nothing to collect.` : `${who} ${SENT[to]}.`;
      if (next) {
        toast.success(next.reason === 'lab_ready' ? `Back from lab: ${tokenName(next.visit)}, result ready` : `Next: ${tokenName(next.visit)}`, { description, duration: 10_000 });
        navigate(`/${branch}/visits/${next.visit.id}`);
      } else {
        toast.success('No more patients waiting', { description, duration: 10_000 });
        navigate(`/${branch}/visits`);
      }
    },
    onError: (e) => {
      if (isUndone(e)) return;
      invalidate();
      toast.error(errorMessage(e));
    },
  });

  // With the doctor: the steps on the page end in the send button, and the Lab tab sends to the lab.
  if (!canEdit || (visit.status !== 'waiting' && visit.status !== 'at_lab')) return null;

  const medicines = rx.data ? rx.data.items.filter((i) => i.status === 'pending').length : visit.medicineCount;
  const orders = lab.data?.orders.filter((o) => o.status !== 'cancelled');
  const tests = orders ? orders.length : visit.lab.ordered + visit.lab.sampleCollected + visit.lab.completed;
  const testsToDo = orders ? orders.filter((o) => o.status !== 'completed').length : visit.lab.ordered + visit.lab.sampleCollected;
  const resultReady = tests > 0 && testsToDo === 0;

  // One slim row. Above the phone's bottom menu; at the bottom edge on wider screens.
  const shell = cn(
    'sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-6 flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-md transition-shadow md:bottom-4 md:flex-row md:items-center md:justify-between',
    lit && 'ring-2 ring-brand/50',
  );

  {
    const atLab = visit.status === 'at_lab';
    return (
      <div ref={ref} className={shell} role="region" aria-label="What next">
        <div className="min-w-0 text-sm">
          <span className="font-semibold">{atLab ? (resultReady ? `${who} is back from the lab — result ready` : `${who} is at the lab`) : `${who} is waiting`}</span>
          {atLab && !resultReady && <span className="text-muted"> · {tests - testsToDo} of {tests} results ready</span>}
        </div>
        <Button data-shortcut="alt+c" disabled={start.isPending} onClick={() => start.mutate({ visitId: visit.id })}>
          <Stethoscope /> {start.isPending ? 'Starting…' : 'Start consultation'} <KeyHint>Alt+C</KeyHint>
        </Button>
      </div>
    );
  }
}

/** On the Lab tab: the ordered tests are done at the lab now; the patient comes back in when the result is ready. */
export function SendToLab({ branch, visit, patientName }: { branch: string; visit: OpVisit; patientName: string }) {
  const canEdit = useCan('patient.edit');
  const lab = useVisitLab(branch, visit.id, canEdit);
  const send = useVisitSend(branch, visit, patientName);
  if (!canEdit || visit.status !== 'with_doctor') return null;
  const toDo = (lab.data?.orders ?? []).filter((o) => o.status !== 'cancelled' && o.status !== 'completed').length;
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted">{toDo ? `${plural(toDo, 'test')} ordered. Send the patient to the lab; they come back in when the result is ready.` : 'Order a test above, then send the patient to the lab.'}</span>
      <Button data-shortcut="alt+l" className="h-11 px-5 text-base" disabled={send.isPending || toDo === 0} onClick={() => send.mutate('lab')}>
        <FlaskConical /> Send to lab{toDo ? ` (${plural(toDo, 'test')})` : ''} <KeyHint>Alt+L</KeyHint>
      </Button>
    </div>
  );
}
