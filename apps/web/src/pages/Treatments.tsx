import { CourseSittingsToday } from '@/components/Courses';
import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { CheckCheck, CheckCircle2, Syringe, Undo2, RefreshCw } from 'lucide-react';
import { FORM_UNIT, indiaDay, prettyDose, type DueSitting, type TreatmentDose, type TreatmentList } from '@platform/shared';
import { Avatar, Badge, Button, Card, CardHeader, cn, Dialog, EmptyState, Field, Input, PageHeader, Pager, Skeleton, Table, Tabs, TabsList, TabsTrigger, TBody, TD, TH, THead, toast, TR, usePaged } from '@platform/ui';
import { api, errorMessage } from '@/core/api/client';
import { ConditionBadges } from '@/components/Conditions';
import { fmtDay, fmtTime } from '@/components/format';
import { useBranch, useCan, useModuleOn } from '@/core/auth';
import { ListSearch, textMatch } from '@/components/ListSearch';

/** "1 tablet" / "½ tablet" / "" for a typed dose. */
const amountText = (d: TreatmentDose) => (d.amount ? `${prettyDose(d.amount)} ${FORM_UNIT[d.form]}` : d.dose);

/** The nurse's list: every dose to give in the hospital today (and the ones missed on the last days), ticked when given. */
/** "Auto refresh" on this page: remembered on this computer, off at first. */
const AUTO_KEY = 'hms-treatments-auto-refresh';
const AUTO_EVERY_MS = 60_000;

export function Treatments() {
  const { branch } = useParams();
  const current = useBranch();
  const canGive = useCan('treatment.give');
  const qc = useQueryClient();
  // Auto refresh (off unless ticked; remembered on this computer): both lists every minute.
  const [auto, setAutoState] = useState(() => {
    try {
      return localStorage.getItem(AUTO_KEY) === '1';
    } catch {
      return false;
    }
  });
  const setAuto = (on: boolean) => {
    setAutoState(on);
    try {
      localStorage.setItem(AUTO_KEY, on ? '1' : '0');
    } catch {
      /* private window: this time only */
    }
  };
  // Refresh: this list and the course sittings, together.
  const [refreshing, setRefreshing] = useState(false);
  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([qc.refetchQueries({ queryKey: ['treatments', branch] }), qc.refetchQueries({ queryKey: ['treatments-due', branch] })]).finally(() => setRefreshing(false));
  };
  const [date, setDate] = useState('');
  const [giving, setGiving] = useState<TreatmentDose | null>(null);
  const [givingAll, setGivingAll] = useState(false);
  const [q, setQ] = useState('');
  // Two tabs, each with its count (the same "Treatments due today" as the side menu, split in two).
  const [params, setParams] = useSearchParams();
  // Shares the course list's request (same key): no second call.
  const coursesOn = useModuleOn('courses');
  const due = useQuery({ queryKey: ['treatments-due', branch], queryFn: () => api.get<{ today: string; sittings: DueSitting[] }>(`/b/${branch}/treatments/due`), enabled: coursesOn, refetchInterval: auto ? AUTO_EVERY_MS : false, refetchOnWindowFocus: false });
  const sittingsLeft = (due.data?.sittings ?? []).filter((s) => (s.status === 'planned' || s.status === 'started' || s.status === 'missed') && indiaDay(s.dueAt) <= due.data!.today).length;
  const { data, isLoading, error } = useQuery({
    queryKey: ['treatments', branch, date],
    queryFn: () => api.get<TreatmentList>(`/b/${branch}/treatments${date ? `?date=${date}` : ''}`),
    // No polling unless Auto refresh is ticked: the nurse presses Refresh when she wants the latest.
    refetchInterval: auto ? AUTO_EVERY_MS : false,
    refetchOnWindowFocus: false,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['treatments', branch] });
    qc.invalidateQueries({ queryKey: ['prescription', branch] }); // the visit page counts the doses given
  };
  const undo = useMutation({
    mutationFn: (d: TreatmentDose) => api.post(`/b/${branch}/treatments/${d.id}/undo`),
    onSuccess: (_r, d) => {
      refresh();
      toast.success(`${d.medicineName} for ${d.patientName}: back to not given`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const found = (d: TreatmentDose) => textMatch(q, d.patientName, d.patientUhid, d.medicineName);
  const doses = (data?.doses ?? []).filter(found);
  const missed = (data?.missed ?? []).filter(found);
  const missedLeft = missed.filter((d) => !d.givenAt).length;
  // Opens on the list that has something to do (the course sittings when both have).
  const tab = !coursesOn || params.get('tab') === 'doses' || (params.get('tab') == null && sittingsLeft === 0 && (data?.doses.length ?? 0) > 0) ? 'doses' : 'courses';
  const left = doses.filter((d) => !d.givenAt).length;
  // "Mark all" leaves out a medicine the patient did not buy: there is nothing to give.
  const toGive = doses.filter((d) => !d.givenAt && d.itemStatus !== 'declined');
  const isToday = !!data && data.date === data.today;
  const future = !!data && data.date > data.today;

  return (
    <div>
      <PageHeader
        title="Today's treatments"
        description={data ? `Course sittings and medicines given in the hospital · ${fmtDay(data.date)} · ${current?.name}` : current?.name}
        actions={
          <>
            <ListSearch className="sm:w-56" label="Search the patients" placeholder="Patient or medicine…" value={q} onChange={setQ} />
            <Input type="date" aria-label="Day" className="w-auto" value={data?.date ?? date} onChange={(e) => setDate(e.target.value)} />
            {date && (
              <Button variant="ghost" onClick={() => setDate('')}>
                Today
              </Button>
            )}
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium" title="Gets the latest list every minute by itself">
              <input type="checkbox" role="switch" className="size-4 accent-[var(--color-primary)]" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
              Auto refresh
            </label>
            <Button variant="outline" onClick={refreshAll} disabled={refreshing} title="Get the latest list">
              <RefreshCw className={refreshing ? 'animate-spin' : undefined} /> Refresh
            </Button>
          </>
        }
      />
      <Tabs value={tab} onValueChange={(t) => setParams(t === 'courses' ? {} : { tab: t }, { replace: true })}>
        <TabsList className="mb-4 h-11 max-w-full overflow-x-auto">
          {coursesOn && (
            <TabsTrigger value="courses" className="h-9 px-4 text-base">
              Course sittings <CountPill n={sittingsLeft} />
            </TabsTrigger>
          )}
          <TabsTrigger value="doses" className="h-9 px-4 text-base">
            Medicines to give <CountPill n={left + missedLeft} tone={missedLeft ? 'critical' : undefined} />
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'courses' && current && <CourseSittingsToday branch={current.slug} autoRefreshMs={auto ? AUTO_EVERY_MS : false} search={q} />}

      {tab !== 'doses' ? null : error ? (
        <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>
      ) : isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-4">
          {missed.length > 0 && (
            <DoseTable
              title={`Missed on earlier days (${missed.length})`}
              description="Not ticked on their day. Give them now, or leave them if the patient did not come."
              tone="critical"
              doses={missed}
              branch={branch!}
              showDay
              canGive={canGive}
              onGive={setGiving}
              onUndo={(d) => undo.mutate(d)}
            />
          )}
          {doses.length === 0 ? (
            <Card>
              <EmptyState icon={Syringe} title={q ? `Nobody matches “${q}”` : isToday ? 'No treatments to give today' : 'No treatments on this day'} description="The doctor ticks “Give here in the hospital” on a medicine to put it on this list." />
            </Card>
          ) : (
            <DoseTable
              title={isToday ? `Today (${left} of ${doses.length} still to give)` : `${fmtDay(data.date)} (${doses.length})`}
              description={future ? 'A later day: these can be ticked when that day comes.' : undefined}
              tone="brand"
              doses={doses}
              branch={branch!}
              canGive={canGive && !future}
              onGive={setGiving}
              onUndo={(d) => undo.mutate(d)}
              action={
                canGive && !future && toGive.length > 1 && (
                  <Button variant="outline" onClick={() => setGivingAll(true)}>
                    <CheckCheck /> Mark all {toGive.length} as given
                  </Button>
                )
              }
            />
          )}
        </div>
      )}
      {giving && <GiveDialog branch={branch!} dose={giving} onClose={() => setGiving(null)} onGiven={refresh} />}
      {givingAll && <GiveAllDialog branch={branch!} doses={toGive} onClose={() => setGivingAll(false)} onGiven={refresh} />}
    </div>
  );
}

function DoseTable({
  title,
  description,
  tone,
  doses,
  branch,
  showDay,
  canGive,
  onGive,
  onUndo,
  action,
}: {
  title: string;
  description?: string;
  tone: 'brand' | 'critical';
  doses: TreatmentDose[];
  branch: string;
  showDay?: boolean;
  canGive: boolean;
  onGive: (d: TreatmentDose) => void;
  onUndo: (d: TreatmentDose) => void;
  action?: ReactNode;
}) {
  const { rows, pager } = usePaged(doses);
  return (
    <Card>
      <CardHeader title={title} description={description} icon={Syringe} iconTone={tone} action={action} />
      <Table>
        <THead>
          <tr>
            <TH>When</TH>
            <TH>Patient</TH>
            <TH>Medicine</TH>
            <TH>Status</TH>
            <TH />
          </tr>
        </THead>
        <TBody>
          {rows.map((d) => (
            <TR key={d.id} className={d.givenAt ? 'opacity-70' : ''}>
              <TD className="whitespace-nowrap">
                <div className="text-base font-semibold">{d.slot}</div>
                {showDay && <div className="text-xs font-medium text-critical">{fmtDay(d.dueDate)}</div>}
              </TD>
              <TD>
                <Link to={`/${branch}/visits/${d.visitId}`} className="flex items-center gap-2.5">
                  <Avatar name={d.patientName} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium hover:underline">{d.patientName}</span>
                    <span className="block font-mono text-[11px] text-muted">
                      {d.patientUhid} · {d.opNo}
                    </span>
                  </span>
                </Link>
                <ConditionBadges conditions={d.patientConditions} className="mt-1" />
              </TD>
              <TD>
                <div className="font-medium">
                  {d.medicineName} {d.strength && <span className="text-muted">{d.strength}</span>}
                </div>
                <div className="text-sm text-muted">
                  {amountText(d)}
                  {d.instructions && ` · ${d.instructions}`}
                </div>
                {d.itemStatus === 'pending' && !d.givenAt && <div className="text-xs font-medium text-warning">Not collected from the pharmacy yet</div>}
                {d.itemStatus === 'declined' && <div className="text-xs font-medium text-critical">The patient did not buy this medicine</div>}
              </TD>
              <TD>
                {d.givenAt ? (
                  <>
                    <Badge tone="positive" dot>
                      Given {fmtTime(d.givenAt)}
                    </Badge>
                    <div className="mt-0.5 text-xs text-muted">
                      {d.givenByName}
                      {d.note && ` · ${d.note}`}
                    </div>
                  </>
                ) : (
                  <Badge tone="warning" dot>
                    To give
                  </Badge>
                )}
              </TD>
              <TD className="text-right">
                {canGive &&
                  (d.givenAt ? (
                    <Button size="sm" variant="ghost" onClick={() => onUndo(d)}>
                      <Undo2 /> Undo
                    </Button>
                  ) : (
                    <Button onClick={() => onGive(d)}>
                      <CheckCircle2 /> Given
                    </Button>
                  ))}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Pager {...pager} />
    </Card>
  );
}

/** Every dose still to give on the day, in one step: the list is shown first so nothing is ticked blindly. */
function GiveAllDialog({ branch, doses, onClose, onGiven }: { branch: string; doses: TreatmentDose[]; onClose: () => void; onGiven: () => void }) {
  const giveAll = useMutation({
    mutationFn: async () => {
      let done = 0;
      try {
        for (const d of doses) {
          await api.post(`/b/${branch}/treatments/${d.id}/give`, { note: '' });
          done++;
        }
      } finally {
        if (done) onGiven();
      }
      return done;
    },
    onSuccess: (done) => {
      toast.success(`${done} doses marked as given`);
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={`Mark all ${doses.length} as given?`} description="Only if every one of these has really been given. Each can be undone afterwards.">
      <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
        {doses.map((d) => (
          <li key={d.id}>
            <span className="font-medium">{d.patientName}</span> · {d.medicineName} {d.strength} · {d.slot}
          </li>
        ))}
      </ul>
      {giveAll.error && <p className="mt-3 text-sm text-critical">Stopped: {errorMessage(giveAll.error)} The ones before it are ticked.</p>}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={giveAll.isPending} onClick={() => giveAll.mutate()}>
          <CheckCheck /> {giveAll.isPending ? 'Saving…' : 'Yes, all given'}
        </Button>
      </div>
    </Dialog>
  );
}

/** Confirm one dose, with an optional note. */
function GiveDialog({ branch, dose, onClose, onGiven }: { branch: string; dose: TreatmentDose; onClose: () => void; onGiven: () => void }) {
  const [note, setNote] = useState('');
  const give = useMutation({
    mutationFn: () => api.post(`/b/${branch}/treatments/${dose.id}/give`, { note }),
    onSuccess: () => {
      onGiven();
      toast.success(`${dose.medicineName} given to ${dose.patientName}`);
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={`Given to ${dose.patientName}?`} description={`${dose.medicineName}${dose.strength ? ` ${dose.strength}` : ''} · ${amountText(dose)} · ${dose.slot}, ${fmtDay(dose.dueDate)}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          give.mutate();
        }}
      >
        <Field label="Note" htmlFor="dose-note" error={give.error ? errorMessage(give.error) : undefined}>
          <Input id="dose-note" autoFocus maxLength={200} placeholder="e.g. Left arm. No reaction." value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={give.isPending}>
            <CheckCircle2 /> {give.isPending ? 'Saving…' : 'Yes, given'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** The number on a tab: how many still to do there. */
function CountPill({ n, tone }: { n: number; tone?: 'critical' }) {
  if (!n) return null;
  return <span className={cn('rounded-full px-1.5 text-xs leading-5 font-semibold tabular-nums', tone === 'critical' ? 'bg-critical text-white' : 'bg-primary text-primary-foreground')}>{n}</span>;
}
