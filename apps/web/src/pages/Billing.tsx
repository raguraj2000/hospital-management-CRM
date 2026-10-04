import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { Banknote, CreditCard, FilePlus2, Pill, ReceiptText, Smartphone, Truck, Wallet } from 'lucide-react';
import { formatRupees, type BillListRow, type Collection, type OpBill } from '@platform/shared';
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, Skeleton, StatCard, Table, Tabs, TabsContent, TabsList, TabsTrigger, TBody, TD, TH, THead, toast, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useBranch, useCan } from '@/state/auth';

export const billTone = { unpaid: 'warning', part_paid: 'brand', paid: 'positive' } as const;
export const billLabel = { unpaid: 'Unpaid', part_paid: 'Part paid', paid: 'Paid' } as const;

interface ToBill {
  visitId: number;
  opNo: string;
  token: number | null;
  patientName: string;
  patientUhid: string;
  doctorName: string | null;
  hasBill: boolean;
  unbilledLabPaise: number;
  unbilledLabCount: number;
}

export function Billing() {
  const { branch } = useParams();
  const current = useBranch();
  const toBill = useQuery({ queryKey: ['to-bill', branch], queryFn: () => api.get<{ visits: ToBill[] }>(`/b/${branch}/billing/to-bill`), refetchInterval: 20_000 });
  const due = useQuery({ queryKey: ['bills-due', branch], queryFn: () => api.get<{ bills: BillListRow[] }>(`/b/${branch}/bills`), refetchInterval: 20_000 });
  const col = useQuery({ queryKey: ['collection', branch], queryFn: () => api.get<Collection>(`/b/${branch}/billing/collection`) });
  const waiting = (toBill.data?.visits.length ?? 0) + (due.data?.bills.length ?? 0);

  return (
    <div>
      <PageHeader title="Billing" description={`Consultation and lab bills at ${current?.name}. Medicines are paid at the pharmacy counter.`} />
      <Tabs defaultValue="todo">
        <TabsList className="mb-4">
          <TabsTrigger value="todo">To collect {waiting > 0 && <Badge tone="warning">{waiting}</Badge>}</TabsTrigger>
          <TabsTrigger value="today">Today's collection</TabsTrigger>
        </TabsList>
        <TabsContent value="todo" className="space-y-4">
          <ToBillCard branch={branch!} data={toBill.data?.visits} loading={toBill.isLoading} />
          <DueBillsCard branch={branch!} data={due.data?.bills} loading={due.isLoading} error={due.error} />
        </TabsContent>
        <TabsContent value="today">
          <CollectionView data={col.data} loading={col.isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToBillCard({ branch, data, loading }: { branch: string; data?: ToBill[]; loading: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canOpenVisit = useCan('patient.view'); // the visit page needs it
  const create = useMutation({
    mutationFn: (v: ToBill) => api.post<{ bill: OpBill }>(`/b/${branch}/visits/${v.visitId}/bills`),
    onSuccess: ({ bill }) => {
      qc.invalidateQueries({ queryKey: ['to-bill', branch] });
      qc.invalidateQueries({ queryKey: ['bills-due', branch] });
      qc.invalidateQueries({ queryKey: ['patient-bills', branch] });
      navigate(`/${branch}/billing/${bill.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Card>
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">Today's visits not billed yet</div>
        <div className="text-xs text-muted">Create the bill: consultation fee + ordered lab tests.</div>
      </div>
      {loading ? (
        <Skeleton className="m-4 h-16" />
      ) : !data?.length ? (
        <p className="px-4 py-6 text-center text-sm text-muted">Every visit today is billed.</p>
      ) : (
        <Table>
          <TBody>
            {data.map((v) => (
              <TR key={v.visitId} onOpen={canOpenVisit ? () => navigate(`/${branch}/visits/${v.visitId}`) : undefined}>
                <TD>
                  <Link to={`/${branch}/visits/${v.visitId}`} className="flex items-center gap-2.5">
                    <Avatar name={v.patientName} size="sm" />
                    <span>
                      <span className="block font-medium hover:underline">{v.patientName}</span>
                      <span className="block font-mono text-[11px] text-muted">
                        {v.token != null && <span className="font-sans font-medium text-ink">Token {v.token} · </span>}
                        {v.opNo} · {v.patientUhid}
                      </span>
                    </span>
                  </Link>
                </TD>
                <TD className="hidden text-muted md:table-cell">{v.doctorName ?? ''}</TD>
                <TD className="text-muted">
                  {v.hasBill ? `${v.unbilledLabCount} new lab test${v.unbilledLabCount > 1 ? 's' : ''}` : 'Consultation'}
                  {!v.hasBill && v.unbilledLabCount > 0 && ` + ${v.unbilledLabCount} lab`}
                </TD>
                <TD className="text-right">
                  <Button size="sm" disabled={create.isPending} onClick={() => create.mutate(v)}>
                    <FilePlus2 /> Create bill
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function DueBillsCard({ branch, data, loading, error }: { branch: string; data?: BillListRow[]; loading: boolean; error: unknown }) {
  const navigate = useNavigate();
  return (
    <Card>
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">Bills with balance due</div>
      </div>
      {loading ? (
        <Skeleton className="m-4 h-16" />
      ) : error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
      ) : !data?.length ? (
        <EmptyState icon={ReceiptText} title="Nothing due" description="All bills are fully paid." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Bill</TH>
              <TH>Patient</TH>
              <TH className="text-right">Balance</TH>
              <TH>Status</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {data.map((b) => (
              <TR key={b.id} onOpen={() => navigate(`/${branch}/billing/${b.id}`)}>
                <TD>
                  <Link to={`/${branch}/billing/${b.id}`} className="font-mono text-xs font-medium text-brand hover:underline">
                    {b.billNo}
                  </Link>
                  <div className="text-[11px] text-muted">
                    {b.token != null && `Token ${b.token} · `}
                    {b.opNo}
                  </div>
                </TD>
                <TD>
                  <div className="font-medium">{b.patientName}</div>
                  <div className="font-mono text-[11px] text-muted">{b.patientUhid}</div>
                </TD>
                <TD className="text-right tabular-nums">
                  <div className="font-semibold">{formatRupees(b.totalPaise - b.paidPaise)}</div>
                  <div className="text-xs text-muted">of {formatRupees(b.totalPaise)}</div>
                </TD>
                <TD>
                  <Badge tone={billTone[b.status]} dot>
                    {billLabel[b.status]}
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function CollectionView({ data, loading }: { data?: Collection; loading: boolean }) {
  const modes = [
    { key: 'cash', label: 'Cash', icon: Banknote },
    { key: 'upi', label: 'UPI', icon: Smartphone },
    { key: 'card', label: 'Card', icon: CreditCard },
  ] as const;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} tone="positive" label="Total received today" value={formatRupees(data?.totalPaise ?? 0)} footnote="Bills + pharmacy" loading={loading} />
        {modes.map((m) => (
          <StatCard
            key={m.key}
            icon={m.icon}
            tone="brand"
            label={m.label}
            value={formatRupees((data?.bills[m.key] ?? 0) + (data?.pharmacy[m.key] ?? 0))}
            footnote={`Bills ${formatRupees(data?.bills[m.key] ?? 0)} · Pharmacy ${formatRupees(data?.pharmacy[m.key] ?? 0)}`}
            loading={loading}
          />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={ReceiptText} label="OP bills" value={formatRupees(Object.values(data?.bills ?? {}).reduce((s, x) => s + x, 0))} loading={loading} />
        <StatCard icon={Pill} tone="violet" label="Pharmacy" value={formatRupees(Object.values(data?.pharmacy ?? {}).reduce((s, x) => s + x, 0))} loading={loading} />
        <StatCard icon={Truck} tone="critical" label="Paid to vendors today" value={formatRupees(data?.vendorPaidPaise ?? 0)} footnote="Money going out" loading={loading} />
      </div>
    </div>
  );
}
