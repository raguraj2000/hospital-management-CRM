import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ClipboardList, Search } from 'lucide-react';
import type { OpVisitRow } from '@platform/shared';
import { Avatar, buttonVariants, Card, cn, EmptyState, Input, NativeSelect, PageHeader, Skeleton, Table, TBody, TD, TH, THead, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useBranch } from '@/state/auth';
import { useDoctors, VisitActions, VisitStatusBadge, vitalsSummary } from '@/components/Visits';

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** The day's OP list for this branch, in token order (the waiting queue). Visits are started from a patient's page. */
export function OpVisits() {
  const { branch } = useParams();
  const current = useBranch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? '';
  const doctorId = params.get('doctor') ?? '';
  const doctors = useDoctors(branch!);
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['visits', branch, date, doctorId],
    queryFn: () =>
      api.get<{ date: string; visits: OpVisitRow[] }>(`/b/${branch}/visits?${new URLSearchParams({ ...(date ? { date } : {}), ...(doctorId ? { doctor: doctorId } : {}) })}`),
    refetchInterval: 30_000, // the front desk's list stays current without reloading
  });

  const visits = data?.visits ?? [];
  const waiting = visits.filter((v) => v.status === 'waiting').length;
  const completed = visits.filter((v) => v.status === 'completed').length;

  return (
    <div>
      <PageHeader
        title="OP visits"
        description={data ? `${fmtDay(data.date)} · ${current?.name}` : current?.name}
        actions={
          <>
            <Input
              type="date"
              aria-label="Day"
              value={data?.date ?? date}
              onChange={(e) => setParam('date', e.target.value)}
              className="w-auto"
            />
            <NativeSelect aria-label="Doctor" value={doctorId} onChange={(e) => setParam('doctor', e.target.value)} className="w-auto min-w-40">
              <option value="">All doctors</option>
              {doctors.data?.doctors.map((d) => (
                <option key={d.userId} value={d.userId}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
            <Link to={`/${branch}/patients`} className={buttonVariants()}>
              <Search /> Find patient
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-lg border border-border bg-surface px-3 py-1.5">
          Total <b className="ml-1 tabular-nums">{visits.length}</b>
        </span>
        <span className="rounded-lg border border-border bg-surface px-3 py-1.5">
          Waiting <b className="ml-1 text-warning tabular-nums">{waiting}</b>
        </span>
        <span className="rounded-lg border border-border bg-surface px-3 py-1.5">
          Completed <b className="ml-1 text-positive tabular-nums">{completed}</b>
        </span>
      </div>

      <Card>
        {error ? (
          <p className="p-6 text-sm text-critical">{errorMessage(error)}</p>
        ) : isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : visits.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No OP visits on this day" description="Open a patient and press “New OP visit” to add them to the list." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Token</TH>
                <TH>Patient</TH>
                <TH className="hidden lg:table-cell">Doctor</TH>
                <TH className="hidden md:table-cell">Complaint & vitals</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {visits.map((v) => (
                <TR key={v.id} onOpen={() => navigate(`/${branch}/visits/${v.id}`)}>
                  <TD className="whitespace-nowrap">
                    {/* The row's real link: keyboard, screen readers, open in a new tab. */}
                    <Link to={`/${branch}/visits/${v.id}`} className="inline-block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                      {v.token != null && (
                        <>
                          <span className="block text-xs font-medium text-muted">Token</span>
                          {/* Still waiting = strong; seen or cancelled = faded, so the queue reads at a glance. */}
                          <span className={cn('block text-3xl leading-none font-bold tabular-nums', v.status === 'waiting' ? 'text-ink' : 'text-muted')}>{v.token}</span>
                        </>
                      )}
                      <span className="mt-1 block font-mono text-xs text-muted">{v.opNo}</span>
                    </Link>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={v.patientName} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{v.patientName}</span>
                        <span className="block font-mono text-[11px] text-muted">{v.patientUhid}</span>
                      </span>
                    </div>
                  </TD>
                  <TD className="hidden whitespace-nowrap lg:table-cell">{v.doctorName ?? <span className="text-muted">Not assigned</span>}</TD>
                  <TD className="hidden max-w-xs md:table-cell">
                    <div className="truncate">{v.complaint ?? <span className="text-muted">—</span>}</div>
                    {vitalsSummary(v) && <div className="truncate text-xs text-muted tabular-nums">{vitalsSummary(v)}</div>}
                  </TD>
                  <TD>
                    <VisitStatusBadge status={v.status} />
                  </TD>
                  <TD>
                    <VisitActions branch={branch!} visit={v} label={v.patientName} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
