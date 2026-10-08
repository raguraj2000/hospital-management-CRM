import { useDeferredValue, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ClipboardList, ClipboardPlus, DoorOpen, Search, UserPlus } from 'lucide-react';
import type { OpVisitRow, Patient, VisitQueue } from '@platform/shared';
import { Avatar, Badge, Button, buttonVariants, Card, cn, Dialog, EmptyState, Input, NativeSelect, PageHeader, Pager, Skeleton, Table, Tabs, TabsList, TabsTrigger, TBody, TD, TH, THead, TR, usePaged } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useBranch, useCan } from '@/state/auth';
import { ConditionBadges } from '@/components/Conditions';
import { NewVisitForm, tokenName, useCallNext, useDoctors, VisitActions, VisitStatusBadge, vitalsSummary } from '@/components/Visits';
import { ageOf, formatPhone } from './Patients';

/** The day's visits in four lists, so 100+ patients never mean scrolling past the finished ones. */
const SHOW: { key: 'queue' | 'counter' | 'done' | 'all'; label: string; tone: string; has: (v: OpVisitRow) => boolean }[] = [
  { key: 'queue', label: 'Queue', tone: 'text-warning', has: (v) => v.status === 'waiting' || v.status === 'with_doctor' || v.status === 'at_lab' },
  { key: 'counter', label: 'At pharmacy & billing', tone: 'text-brand', has: (v) => v.status === 'at_counter' },
  { key: 'done', label: 'Completed', tone: 'text-positive', has: (v) => v.status === 'completed' },
  { key: 'all', label: 'All', tone: '', has: () => true },
];
const EMPTY = { queue: 'Nobody is waiting, with the doctor or at the lab', counter: 'Nobody is at pharmacy & billing', done: 'No completed visits yet', all: 'No OP visits on this day' };

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** The day's OP list for this branch, in token order (the waiting queue). Visits are started from a patient's page. */
export function OpVisits() {
  const { branch } = useParams();
  const current = useBranch();
  const canCreate = useCan('patient.create');
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
      api.get<{ date: string; visits: OpVisitRow[]; queue: VisitQueue | null }>(
        `/b/${branch}/visits?${new URLSearchParams({ ...(date ? { date } : {}), ...(doctorId ? { doctor: doctorId } : {}) })}`,
      ),
    // The list stays current by itself (a result entered at the lab shows up without reloading):
    // every 20 s while the tab is visible, and whenever the window gets the focus back.
    refetchInterval: 20_000,
    refetchOnWindowFocus: 'always',
  });

  const visits = data?.visits ?? [];
  const show = SHOW.find((t) => t.key === params.get('show'))?.key ?? 'queue';
  const shown = visits.filter(SHOW.find((t) => t.key === show)!.has);
  const { rows, pager } = usePaged(shown, `${show}|${data?.date}|${doctorId}`);
  const queueDoctor = data?.queue?.doctorUserId != null ? doctors.data?.doctors.find((d) => d.userId === data.queue!.doctorUserId)?.name : undefined;

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
          </>
        }
      />

      {canCreate && <StartVisitSearch branch={branch!} />}

      {/* Only today has a queue (the server sends none for another day). */}
      {data?.queue && <QueueBanner branch={branch!} queue={data.queue} doctorName={queueDoctor} />}

      <Tabs value={show} onValueChange={(t) => setParam('show', t === 'queue' ? '' : t)}>
        <TabsList className="mb-4 h-11 max-w-full overflow-x-auto">
          {SHOW.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="h-9 px-4 text-base">
              {t.label} <b className={cn('tabular-nums', t.tone)}>{visits.filter(t.has).length}</b>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        {error ? (
          <p className="p-6 text-sm text-critical">{errorMessage(error)}</p>
        ) : isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : visits.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No OP visits on this day" description="Search the patient above and press “New OP visit” to add them to the list." />
        ) : shown.length === 0 ? (
          <EmptyState icon={ClipboardList} title={EMPTY[show]} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Token</TH>
                <TH>Patient</TH>
                <TH className="hidden lg:table-cell">Doctor</TH>
                <TH className="hidden md:table-cell">Complaint & vitals</TH>
                <TH>Where now</TH>
                <TH className="text-right">Actions</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {rows.map((v) => {
                const inside = v.status === 'with_doctor';
                // Still to be seen (or being seen) = strong; at the counter, done or cancelled = faded, so the queue reads at a glance.
                const active = v.status === 'waiting' || inside || v.status === 'at_lab';
                return (
                  <TR key={v.id} onOpen={() => navigate(`/${branch}/visits/${v.id}`)} className={cn(inside && 'bg-brand-soft [&>td]:bg-brand-soft')}>
                    <TD className={cn('whitespace-nowrap', inside && 'border-l-4 border-brand')}>
                      {/* The row's real link: keyboard, screen readers, open in a new tab. */}
                      <Link to={`/${branch}/visits/${v.id}`} className="inline-block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                        {v.token != null && (
                          <>
                            <span className="block text-xs font-medium text-muted">Token</span>
                            <span className={cn('block text-3xl leading-none font-bold tabular-nums', active ? 'text-ink' : 'text-muted')}>{v.token}</span>
                          </>
                        )}
                        <span className="mt-1 block font-mono text-xs text-muted">{v.opNo}</span>
                      </Link>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={v.patientName} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-base font-medium">{v.patientName}</span>
                          <span className="block font-mono text-[11px] text-muted">{v.patientUhid}</span>
                        </span>
                      </div>
                      <ConditionBadges conditions={v.patientConditions} className="mt-1.5" />
                    </TD>
                    <TD className="hidden whitespace-nowrap lg:table-cell">{v.doctorName ?? <span className="text-muted">Not assigned</span>}</TD>
                    <TD className="hidden max-w-xs md:table-cell">
                      <div className="truncate">{v.complaint ?? <span className="text-muted">—</span>}</div>
                      {vitalsSummary(v) && <div className="truncate text-xs text-muted tabular-nums">{vitalsSummary(v)}</div>}
                    </TD>
                    <TD>
                      <VisitStatusBadge status={v.status} labReady={v.labReady} />
                      <VisitProgress visit={v} />
                    </TD>
                    <TD>
                      <VisitActions branch={branch!} visit={v} label={v.patientName} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
        <Pager {...pager} />
      </Card>
    </div>
  );
}

/** Front desk: find the patient by name, UHID or phone and start their OP visit without leaving the list. */
function StartVisitSearch({ branch }: { branch: string }) {
  const [search, setSearch] = useState('');
  const [starting, setStarting] = useState<Patient | null>(null);
  const canPrescribe = useCan('prescription.write');
  const navigate = useNavigate();
  const q = useDeferredValue(search.trim());
  const { data, isFetching, error } = useQuery({
    queryKey: ['patients', branch, 'op-search', q],
    queryFn: () => api.get<{ patients: Patient[]; total: number }>(`/b/${branch}/patients?${new URLSearchParams({ q, limit: '8' })}`),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  });
  const found = q.length >= 2 ? data?.patients : undefined;

  return (
    <Card className="mb-4">
      <div className="relative p-3">
        <Search className="pointer-events-none absolute top-5.5 left-6 size-4 text-muted" />
        <Input
          type="search"
          aria-label="Search patient to start an OP visit"
          placeholder="Search patient by name, UHID or phone to start an OP visit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {q.length >= 2 &&
        (error ? (
          <p className="border-t border-border p-4 text-sm text-critical">{errorMessage(error)}</p>
        ) : !found ? (
          <div className="border-t border-border p-3">
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className={cn('border-t border-border transition-opacity', isFetching && 'opacity-60')}>
            <ul className="divide-y divide-border">
              {found.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={p.name} size="sm" />
                  <Link to={`/${branch}/patients/${p.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate text-base font-medium">{p.name}</span>
                    <ConditionBadges conditions={p.conditions} className="my-0.5" />
                    <span className="block truncate text-xs text-muted">
                      <span className="font-mono">{p.uhid}</span> · {p.phone ? formatPhone(p.phone) : 'No phone'}
                      {ageOf(p) != null && ` · ${ageOf(p)} yrs`}
                      {p.gender && <span className="capitalize"> · {p.gender}</span>}
                    </span>
                  </Link>
                  <Button size="sm" onClick={() => setStarting(p)}>
                    <ClipboardPlus /> New OP visit
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-sm text-muted">
              <span>
                {found.length === 0 ? 'No patient found with this name, UHID or phone.' : data!.total > found.length ? `Showing ${found.length} of ${data!.total} — type more to narrow down.` : 'Not the right person?'}
              </span>
              <Link to={`/${branch}/patients?add=1`} className={buttonVariants({ variant: 'brand', size: 'sm' })}>
                <UserPlus /> Register new patient
              </Link>
            </div>
          </div>
        ))}

      <Dialog
        open={!!starting}
        onOpenChange={(open) => !open && setStarting(null)}
        title="New OP visit"
        description={starting ? `${starting.name} · ${starting.uhid} — the token and OP number are assigned automatically.` : undefined}
      >
        {starting && (
          <NewVisitForm
            branch={branch}
            patientId={starting.id}
            onCancel={() => setStarting(null)}
            onDone={(visit, seenNow) => {
              // Stay on the list: the new token is in the toast and in the table, and the next patient can be searched.
              setStarting(null);
              setSearch('');
              // Unless the doctor is seeing this patient right now: then the visit opens.
              if (seenNow && canPrescribe) navigate(`/${branch}/visits/${visit.id}`);
            }}
          />
        )}
      </Dialog>
    </Card>
  );
}

/** Under the status: how far the lab tests are, and how many medicines were prescribed. */
function VisitProgress({ visit: v }: { visit: OpVisitRow }) {
  const tests = v.lab.ordered + v.lab.sampleCollected + v.lab.completed;
  const atLab = v.status === 'at_lab';
  return (
    <div className="mt-1 space-y-0.5 text-sm whitespace-nowrap">
      {tests > 0 &&
        (atLab && !v.labReady ? (
          <div className="font-medium text-violet">
            Lab: waiting for result ({v.lab.completed} of {tests})
          </div>
        ) : atLab ? (
          <div className="font-medium text-positive">Send the patient in before the next token</div>
        ) : (
          <div className="text-muted">
            Lab tests: {v.lab.completed} of {tests} ready
          </div>
        ))}
      {v.medicineCount > 0 && (
        <div className="text-muted">
          {v.medicineCount} medicine{v.medicineCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

/** Who is inside, who is next, and the one button to call them. The server decides who is next (same rule as the button). */
function QueueBanner({ branch, queue, doctorName }: { branch: string; queue: VisitQueue; doctorName?: string }) {
  const canEdit = useCan('patient.edit');
  const call = useCallNext(branch);
  const { withDoctor, next } = queue;
  // Someone is still inside with the doctor the next patient would go to: the doctor first chooses what happens
  // to them (on the visit page), which also calls the next patient. So the button here opens that visit instead.
  // (A next patient with no doctor chosen yet goes to the doctor whose queue this is.)
  const inside = next ? withDoctor.find((v) => v.doctorUserId === (next.visit.doctorUserId ?? queue.doctorUserId)) : withDoctor[0];
  const big = 'h-14 w-full px-6 text-lg md:w-auto';

  return (
    <Card className="mb-4 border-2 border-brand/30 p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted">Now with doctor{doctorName ? ` (${doctorName})` : ''}</div>
          {withDoctor.length === 0 ? (
            <div className="mt-1 text-xl font-semibold text-muted">No one is with the doctor</div>
          ) : (
            withDoctor.map((v) => (
              <Link key={v.id} to={`/${branch}/visits/${v.id}`} className="mt-1 block truncate text-xl font-bold text-brand hover:underline">
                {tokenName(v)}
              </Link>
            ))
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted">Next</div>
          {next ? (
            <>
              <div className="mt-1 truncate text-xl font-bold">{tokenName(next.visit)}</div>
              {next.reason === 'lab_ready' && (
                <Badge tone="positive" className="mt-1 bg-positive px-2.5 py-1 text-sm text-white">
                  Back from lab — result ready
                </Badge>
              )}
            </>
          ) : (
            <div className="mt-1 text-xl font-semibold text-muted">Nobody is waiting</div>
          )}
        </div>
        {canEdit && (
          <div className="md:text-right">
            {inside ? (
              <>
                <Link to={`/${branch}/visits/${inside.id}`} className={cn(buttonVariants(), big)}>
                  Open Token {inside.token ?? inside.opNo} — choose what next
                </Link>
                <p className="mt-1.5 text-sm text-muted">Finish with this patient first; that calls the next one in.</p>
              </>
            ) : (
              <>
                <Button className={big} disabled={!next || call.isPending} onClick={() => call.mutate({ doctorUserId: queue.doctorUserId })}>
                  <DoorOpen /> {next ? `Call next (Token ${next.visit.token ?? next.visit.opNo})` : 'Call next'}
                </Button>
                {!next && <p className="mt-1.5 text-sm text-muted">Nobody is waiting right now.</p>}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
