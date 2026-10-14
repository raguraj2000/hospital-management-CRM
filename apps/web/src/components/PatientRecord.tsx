// On the doctor's visit page: what this patient came for before (date, time, reason) and what they still owe.
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { formatRupees, type OpVisit, type PatientBills } from '@platform/shared';
import { Badge, Button, Card, CardHeader } from '@platform/ui';
import { api } from '@/api/client';
import { fmtDateTime } from './format';

const SHORT = 2;
const PAGE = 10;

export function PatientRecord({ branch, patientId, visitId }: { branch: string; patientId: number; visitId: number }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const visits = useQuery({ queryKey: ['patient-visits', branch, patientId, 'record'], queryFn: () => api.get<{ visits: OpVisit[] }>(`/b/${branch}/patients/${patientId}/visits`), staleTime: 0 });
  const bills = useQuery({ queryKey: ['patient-bills', branch, patientId], queryFn: () => api.get<PatientBills>(`/b/${branch}/patients/${patientId}/bills`), staleTime: 0 });
  const earlier = (visits.data?.visits ?? []).filter((v) => v.id !== visitId && v.status !== 'cancelled');
  const due = (bills.data?.bills ?? []).filter((b) => b.balancePaise > 0);
  const duePaise = due.reduce((s, b) => s + b.balancePaise, 0);
  if (!earlier.length && !due.length) return null;
  // Closed: the last two visits. Opened: all of them, ten to a page.
  const shown = open ? earlier.slice(page * PAGE, (page + 1) * PAGE) : earlier.slice(0, SHORT);
  const pages = Math.ceil(earlier.length / PAGE);
  const dueOfVisit = (id: number) => due.filter((b) => b.visitId === id).reduce((s, b) => s + b.balancePaise, 0);

  return (
    <Card className="mb-4">
      <CardHeader
        title="Earlier visits"
        description="When the patient came, and what for."
        icon={History}
        action={duePaise > 0 && <Badge tone="critical">Balance due {formatRupees(duePaise)}</Badge>}
      />
      <ul className="divide-y divide-border">
        {/* Money owed on this very visit (a part payment taken earlier today). */}
        {dueOfVisit(visitId) > 0 && (
          <li className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span className="font-medium">This visit</span>
            <Badge tone="critical">Due {formatRupees(dueOfVisit(visitId))}</Badge>
          </li>
        )}
        {shown.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <Link to={`/${branch}/visits/${v.id}`} className="min-w-0 hover:underline">
              <span className="font-medium tabular-nums">{fmtDateTime(v.createdAt)}</span>
              <span className="text-muted"> · {v.complaint ?? 'No reason noted'}</span>
              {v.doctorName && <span className="text-xs text-muted"> · {v.doctorName}</span>}
            </Link>
            {dueOfVisit(v.id) > 0 && <Badge tone="critical">Due {formatRupees(dueOfVisit(v.id))}</Badge>}
          </li>
        ))}
      </ul>
      {earlier.length > SHORT && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-sm">
          <Button variant="ghost" size="sm" onClick={() => { setOpen(!open); setPage(0); }}>
            {open ? <ChevronUp /> : <ChevronDown />} {open ? 'Show only the last 2' : `Show all ${earlier.length} visits`}
          </Button>
          {open && pages > 1 && (
            <span className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Newer
              </Button>
              <span className="text-xs text-muted tabular-nums">
                {page * PAGE + 1}–{Math.min(earlier.length, (page + 1) * PAGE)} of {earlier.length}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                Older
              </Button>
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
