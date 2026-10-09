// The Bills and Lab tabs of the patient page: everything for one patient over all their visits.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { ClipboardEdit, FlaskConical, Pill, Printer, Receipt, ReceiptText, Scale, Wallet } from 'lucide-react';
import { formatRupees, type PatientBills, type PatientLabOrder } from '@platform/shared';
import { Badge, Button, buttonVariants, Card, EmptyState, Input, Skeleton, StatCard, Table, TBody, TD, TH, THead, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { PrintLink } from '@/components/print';
import { LabResultReady } from '@/components/VisitLab';
import { useCan } from '@/state/auth';
import { TokenBadge } from '@/components/Visits';
import { billLabel, billTone, fmtDate, fmtDateTime, inDays, istDay, labLabel, labTone, modeLabel } from '@/components/format';


// staleTime 0: payments and releases also happen in other browser tabs (print pages); coming back refetches.
export function usePatientBills(branch: string | undefined, id: string | undefined) {
  return useQuery({ queryKey: ['patient-bills', branch, id], queryFn: () => api.get<PatientBills>(`/b/${branch}/patients/${id}/bills`), staleTime: 0 });
}
export function usePatientLab(branch: string | undefined, id: string | undefined) {
  return useQuery({ queryKey: ['patient-lab', branch, id], queryFn: () => api.get<{ orders: PatientLabOrder[] }>(`/b/${branch}/patients/${id}/lab-orders`), staleTime: 0 });
}

/** The From / To days chosen on the patient page; an empty end is open. */
export interface DayRange {
  from: string;
  to: string;
}
const sum = (ns: number[]) => ns.reduce((a, n) => a + n, 0);

/** The patient's bills inside the chosen days, with the totals of just those bills. */
export function billsInDays(data: PatientBills, { from, to }: DayRange): PatientBills {
  if (!from && !to) return data;
  const bills = data.bills.filter((b) => inDays(b.billDate, from, to));
  const pharmacy = data.pharmacy && data.pharmacy.filter((s) => inDays(istDay(s.createdAt), from, to));
  return {
    bills,
    pharmacy,
    summary: {
      billedPaise: sum(bills.map((b) => b.totalPaise)),
      paidPaise: sum(bills.map((b) => b.paidPaise)),
      balancePaise: sum(bills.map((b) => b.balancePaise)),
      pharmacyPaise: pharmacy && sum(pharmacy.map((s) => s.totalPaise)),
    },
  };
}
/** The patient's lab tests of the visits inside the chosen days. */
export const labInDays = (orders: PatientLabOrder[], { from, to }: DayRange) => orders.filter((o) => inDays(o.visitDate, from, to));

/** From / To days for the Visits, Bills and Lab tabs of the patient page. */
export function DayRangeFilter({ value, onChange }: { value: DayRange; onChange: (v: DayRange) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="range-from" className="text-muted">
        From
      </label>
      <Input id="range-from" type="date" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} className="w-auto" />
      <label htmlFor="range-to" className="text-muted">
        To
      </label>
      <Input id="range-to" type="date" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className="w-auto" />
      {(value.from || value.to) && (
        <Button variant="ghost" size="sm" onClick={() => onChange({ from: '', to: '' })}>
          Clear
        </Button>
      )}
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="text-sm font-semibold">{title}</div>
      {description && <div className="text-xs text-muted">{description}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- bills

export function PatientBillsTab({ branch, query, range }: { branch: string; query: UseQueryResult<PatientBills>; range: DayRange }) {
  const navigate = useNavigate();
  const canOpenBill = useCan('billing.receive'); // the bill page needs it
  const canPrintSale = useCan('pharmacy.sell'); // the pharmacy bill print page needs it
  const { data, isLoading, error } = query;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Card>
          <div className="space-y-3 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
        </Card>
      </div>
    );
  }
  if (error || !data) return <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>;
  if (!data.bills.length && !data.pharmacy?.length) {
    return (
      <Card>
        <EmptyState icon={Receipt} title="No bills yet" description="Consultation, lab and pharmacy bills of this patient will appear here." />
      </Card>
    );
  }
  const { bills, pharmacy, summary } = billsInDays(data, range);
  if (!bills.length && !pharmacy?.length) {
    return (
      <Card>
        <EmptyState icon={Receipt} title="No bills in these dates" description="Change or clear the dates to see other bills." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ReceiptText} label="Total billed" value={formatRupees(summary.billedPaise)} footnote={`${bills.length} OP bill${bills.length === 1 ? '' : 's'} · consultation + lab`} />
        <StatCard icon={Wallet} tone="positive" label="Paid" value={formatRupees(summary.paidPaise)} footnote="Received on OP bills" />
        <StatCard
          icon={Scale}
          tone={summary.balancePaise > 0 ? 'warning' : 'neutral'}
          label="Balance due"
          value={<span className={summary.balancePaise > 0 ? 'text-warning' : undefined}>{formatRupees(summary.balancePaise)}</span>}
          footnote={summary.balancePaise > 0 ? 'Still to collect' : 'Nothing due'}
        />
        {summary.pharmacyPaise != null && <StatCard icon={Pill} tone="violet" label="Pharmacy total" value={formatRupees(summary.pharmacyPaise)} footnote="Medicines, paid at the counter" />}
      </div>

      <Card>
        <SectionTitle title="OP bills" description="Consultation and lab tests." />
        {!bills.length ? (
          <p className="px-4 py-6 text-center text-sm text-muted">No OP bills yet.</p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Bill no.</TH>
                <TH>Date</TH>
                <TH>Token · OP no.</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Paid</TH>
                <TH className="text-right">Balance</TH>
                <TH>Status</TH>
                {canOpenBill && <TH />}
              </tr>
            </THead>
            <TBody>
              {bills.map((b) => (
                <TR key={b.id} onOpen={canOpenBill ? () => navigate(`/${branch}/billing/${b.id}`) : undefined}>
                  <TD className="whitespace-nowrap">
                    {canOpenBill ? (
                      <Link to={`/${branch}/billing/${b.id}`} className="font-mono text-sm font-medium text-brand hover:underline">
                        {b.billNo}
                      </Link>
                    ) : (
                      <span className="font-mono text-sm font-medium">{b.billNo}</span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-muted">{fmtDate(b.billDate)}</TD>
                  <TD className="whitespace-nowrap">
                    <TokenBadge opNo={b.opNo} token={b.token} />
                    <span className="mt-1 block font-mono text-xs text-muted">{b.opNo}</span>
                  </TD>
                  <TD className="text-right tabular-nums">{formatRupees(b.totalPaise)}</TD>
                  <TD className="text-right tabular-nums">{formatRupees(b.paidPaise)}</TD>
                  <TD className={`text-right font-semibold tabular-nums ${b.balancePaise > 0 ? 'text-warning' : ''}`}>{formatRupees(b.balancePaise)}</TD>
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

      {pharmacy && (
        <Card>
          <SectionTitle title="Pharmacy" description="Medicines bought at the pharmacy counter (always paid in full)." />
          {!pharmacy.length ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No pharmacy bills yet.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Bill no.</TH>
                  <TH>Date</TH>
                  <TH>Paid by</TH>
                  <TH className="text-right">Amount</TH>
                  {canPrintSale && <TH className="text-right">Bill</TH>}
                </tr>
              </THead>
              <TBody>
                {pharmacy.map((s) => (
                  <TR key={s.id}>
                    <TD className="whitespace-nowrap">
                      <span className="font-mono text-sm font-medium">{s.saleNo}</span> {s.direct && <Badge tone="brand">Direct</Badge>}
                      {s.opNo && <span className="mt-1 block font-mono text-xs text-muted">{s.opNo}</span>}
                    </TD>
                    <TD className="whitespace-nowrap text-muted">{fmtDateTime(s.createdAt)}</TD>
                    <TD>
                      <Badge>{modeLabel[s.paymentMode]}</Badge>
                    </TD>
                    <TD className="text-right font-medium tabular-nums">{formatRupees(s.totalPaise)}</TD>
                    {canPrintSale && (
                      <TD className="text-right">
                        <a href={`/${branch}/pharmacy/sales/${s.id}/print`} target="_blank" rel="noopener" aria-label={`Print bill ${s.saleNo}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                          <Printer /> Print
                        </a>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- lab

export function PatientLabTab({ branch, query, range }: { branch: string; query: UseQueryResult<{ orders: PatientLabOrder[] }>; range: DayRange }) {
  const canEnter = useCan('lab.view'); // the results page needs it
  const canOrder = useCan('lab.order');
  const canPrint = canEnter || canOrder; // the report page takes either
  const { data, isLoading, error } = query;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <div className="border-b border-border px-4 py-3">
              <Skeleton className="h-6 w-56" />
            </div>
            <div className="space-y-3 p-4">{Array.from({ length: 2 }, (_, j) => <Skeleton key={j} className="h-8" />)}</div>
          </Card>
        ))}
      </div>
    );
  }
  if (error || !data) return <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>;
  if (!data.orders.length) {
    return (
      <Card>
        <EmptyState icon={FlaskConical} title="No lab tests yet" description="Tests a doctor orders from an OP visit will appear here." />
      </Card>
    );
  }

  const shown = labInDays(data.orders, range);
  if (!shown.length) {
    return (
      <Card>
        <EmptyState icon={FlaskConical} title="No lab tests in these dates" description="Change or clear the dates to see other tests." />
      </Card>
    );
  }

  // Newest visit first (the list comes newest first).
  const visitIds = [...new Set(shown.map((o) => o.visitId))];

  return (
    <div className="space-y-4">
      {visitIds.map((visitId) => {
        const orders = shown.filter((o) => o.visitId === visitId);
        const v = orders[0]!;
        const anyCompleted = orders.some((o) => o.status === 'completed');
        return (
          <Card key={visitId}>
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">Visit on {fmtDate(v.visitDate)}</span>
                <TokenBadge opNo={v.opNo} token={v.token} />
                <Link to={`/${branch}/visits/${visitId}`} className="font-mono text-xs font-medium text-brand hover:underline">
                  {v.opNo}
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canPrint && anyCompleted && !v.printAllowed && <Badge tone="warning">Payment pending</Badge>}
                {canEnter && (
                  <Link to={`/${branch}/lab/visits/${visitId}`} className={buttonVariants({ variant: 'outline' })}>
                    <ClipboardEdit /> Enter / view results
                  </Link>
                )}
                {canPrint && anyCompleted && (
                  <PrintLink href={`/${branch}/lab/visits/${visitId}/print`} className={buttonVariants({ variant: v.printAllowed ? 'default' : 'outline' })}>
                    <Printer /> Print report
                  </PrintLink>
                )}
              </div>
            </div>
            {/* The values, on screen: a doctor can read an earlier report without ordering the test again. */}
            {anyCompleted && canPrint && <LabResultReady branch={branch} visitId={visitId} />}
            <Table>
              <THead>
                <tr>
                  <TH>Test</TH>
                  <TH>Status</TH>
                  <TH>Ordered</TH>
                  <TH>Completed</TH>
                </tr>
              </THead>
              <TBody>
                {orders.map((o) => (
                  <TR key={o.id}>
                    <TD className={o.status === 'cancelled' ? 'text-muted line-through' : 'font-medium'}>{o.testName}</TD>
                    <TD>
                      <Badge tone={labTone[o.status]} dot>
                        {labLabel[o.status]}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-muted">{fmtDateTime(o.createdAt)}</TD>
                    <TD className="whitespace-nowrap text-muted">{o.completedAt ? fmtDateTime(o.completedAt) : '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        );
      })}
    </div>
  );
}
