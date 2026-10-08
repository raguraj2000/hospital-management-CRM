import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { CheckCircle2, Syringe, Undo2 } from 'lucide-react';
import { FORM_UNIT, type TreatmentDose, type TreatmentList } from '@platform/shared';
import { Avatar, Badge, Button, Card, CardHeader, Dialog, EmptyState, Field, Input, PageHeader, Pager, Skeleton, Table, TBody, TD, TH, THead, toast, TR, usePaged } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { ConditionBadges } from '@/components/Conditions';
import { fmtDay, fmtTime } from '@/components/format';
import { useBranch, useCan } from '@/state/auth';

/** "1 tablet" / "½ tablet" / "" for a typed dose. */
const amountText = (d: TreatmentDose) => (d.amount ? `${d.amount.replace('0.5', '½').replace('.5', '½')} ${FORM_UNIT[d.form]}` : d.dose);

/** The nurse's list: every dose to give in the hospital today (and the ones missed on the last days), ticked when given. */
export function Treatments() {
  const { branch } = useParams();
  const current = useBranch();
  const canGive = useCan('treatment.give');
  const qc = useQueryClient();
  const [date, setDate] = useState('');
  const [giving, setGiving] = useState<TreatmentDose | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['treatments', branch, date],
    queryFn: () => api.get<TreatmentList>(`/b/${branch}/treatments${date ? `?date=${date}` : ''}`),
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
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

  const doses = data?.doses ?? [];
  const left = doses.filter((d) => !d.givenAt).length;
  const isToday = !!data && data.date === data.today;
  const future = !!data && data.date > data.today;

  return (
    <div>
      <PageHeader
        title="Treatments"
        description={data ? `Medicines given in the hospital · ${fmtDay(data.date)} · ${current?.name}` : current?.name}
        actions={
          <>
            <Input type="date" aria-label="Day" className="w-auto" value={data?.date ?? date} onChange={(e) => setDate(e.target.value)} />
            {date && (
              <Button variant="ghost" onClick={() => setDate('')}>
                Today
              </Button>
            )}
          </>
        }
      />

      {error ? (
        <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>
      ) : isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-4">
          {data.missed.length > 0 && (
            <DoseTable
              title={`Missed on earlier days (${data.missed.length})`}
              description="Not ticked on their day. Give them now, or leave them if the patient did not come."
              tone="critical"
              doses={data.missed}
              branch={branch!}
              showDay
              canGive={canGive}
              onGive={setGiving}
              onUndo={(d) => undo.mutate(d)}
            />
          )}
          {doses.length === 0 ? (
            <Card>
              <EmptyState icon={Syringe} title={isToday ? 'No treatments to give today' : 'No treatments on this day'} description="The doctor ticks “Give here in the hospital” on a medicine to put it on this list." />
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
            />
          )}
        </div>
      )}
      {giving && <GiveDialog branch={branch!} dose={giving} onClose={() => setGiving(null)} onGiven={refresh} />}
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
}) {
  const { rows, pager } = usePaged(doses);
  return (
    <Card>
      <CardHeader title={title} description={description} icon={Syringe} iconTone={tone} />
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
        <Field label="Note (optional)" htmlFor="dose-note" error={give.error ? errorMessage(give.error) : undefined}>
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
