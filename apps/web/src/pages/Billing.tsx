import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Banknote, CreditCard, FilePlus2, Printer, ReceiptText, Smartphone, Truck, Users, Wallet } from 'lucide-react';
import { formatRupees, toPaise, type BillListRow, type BillPaymentMode, type DayReport, type OpBill } from '@platform/shared';
import { Avatar, Badge, Button, buttonVariants, Card, CardHeader, Dialog, EmptyState, Field, Input, PageHeader, Pager, Skeleton, StatCard, Table, Tabs, TabsContent, TabsList, TabsTrigger, TBody, TD, TH, THead, toast, TR, usePaged } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useBranch, useCan } from '@/state/auth';
import { CheckoutList, useCheckoutQueue } from '@/components/Checkout';
import { billLabel, billTone, fmtDate, fmtDay, fmtTime, modeLabel } from '@/components/format';
import { PrintLink, printInPlace } from '@/components/print';
import { formatPhone } from './Patients';
import { PaymentModeSelect } from '@/components/PaymentModeSelect';

interface ToBill {
  visitId: number;
  opNo: string;
  token: number | null;
  visitDate: string;
  patientName: string;
  patientUhid: string;
  doctorName: string | null;
  hasBill: boolean;
  unbilledLabPaise: number;
  unbilledLabCount: number;
}

const TABS = ['todo', 'pending', 'completed', 'report'] as const;

export function Billing() {
  const { branch } = useParams();
  const current = useBranch();
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t === params.get('tab')) ?? 'todo';
  // With pharmacy.sell too, this counter takes the visit's whole payment (checkout cards); otherwise it bills consultation + lab, as before.
  const fullCheckout = useCan('pharmacy.sell');
  const checkout = useCheckoutQueue(branch, fullCheckout);
  const toBill = useQuery({ queryKey: ['to-bill', branch], queryFn: () => api.get<{ visits: ToBill[]; today: string }>(`/b/${branch}/billing/to-bill`), refetchInterval: 20_000, enabled: !fullCheckout });
  const due = useQuery({ queryKey: ['bills-due', branch], queryFn: () => api.get<{ bills: BillListRow[] }>(`/b/${branch}/bills`), refetchInterval: 20_000 });
  const waiting = fullCheckout ? (checkout.data?.queue.length ?? 0) : (toBill.data?.visits.length ?? 0);

  return (
    <div>
      <PageHeader
        title="Billing"
        description={fullCheckout ? `Collect consultation, lab and medicines in one payment at ${current?.name}.` : `Consultation and lab bills at ${current?.name}. Medicines are paid at the pharmacy counter.`}
      />
      <Tabs value={tab} onValueChange={(t) => setParams(t === 'todo' ? {} : { tab: t }, { replace: true })}>
        <TabsList className="mb-4">
          <TabsTrigger value="todo">To collect {waiting > 0 && <Badge tone="warning">{waiting}</Badge>}</TabsTrigger>
          <TabsTrigger value="pending">Pending payments {!!due.data?.bills.length && <Badge tone="critical">{due.data.bills.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="completed">Completed payments</TabsTrigger>
          <TabsTrigger value="report">Daily report</TabsTrigger>
        </TabsList>
        <TabsContent value="todo">{fullCheckout ? <CheckoutList branch={branch!} /> : <ToBillCard branch={branch!} data={toBill.data?.visits} today={toBill.data?.today} loading={toBill.isLoading} />}</TabsContent>
        <TabsContent value="pending">
          <PendingPayments branch={branch!} data={due.data?.bills} loading={due.isLoading} error={due.error} />
        </TabsContent>
        <TabsContent value="completed">
          <CompletedPayments branch={branch!} />
        </TabsContent>
        <TabsContent value="report">
          <DayReportView branch={branch!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToBillCard({ branch, data, today, loading }: { branch: string; data?: ToBill[]; today?: string; loading: boolean }) {
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
        <div className="text-sm font-semibold">Visits to bill</div>
        <div className="text-xs text-muted">Create the bill: consultation fee + ordered lab tests.</div>
      </div>
      {loading ? (
        <Skeleton className="m-4 h-16" />
      ) : !data?.length ? (
        <p className="px-4 py-6 text-center text-sm text-muted">Every visit is billed.</p>
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
                      {v.visitDate !== today && <span className="block text-xs font-medium text-warning">Visit of {fmtDay(v.visitDate)}</span>}
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

// ---------------------------------------------------------------- pending payments

/** Where the receipt of one payment prints from. */
export const receiptUrl = (branch: string, billId: number, paymentId: number) => `/${branch}/billing/${billId}/receipts/${paymentId}/print`;

/** Every bill with a balance due. "Receive" takes the money and prints the receipt. */
function PendingPayments({ branch, data, loading, error }: { branch: string; data?: BillListRow[]; loading: boolean; error: unknown }) {
  const navigate = useNavigate();
  const [receiving, setReceiving] = useState<BillListRow | null>(null);
  const total = (data ?? []).reduce((s, b) => s + b.totalPaise - b.paidPaise, 0);
  const { rows, pager } = usePaged(data ?? []);
  return (
    <Card>
      <CardHeader
        title="Pending payments"
        description="Bills not fully paid yet, newest first."
        icon={Wallet}
        iconTone="critical"
        action={!!data?.length && <span className="text-base font-semibold tabular-nums">{formatRupees(total)} due</span>}
      />
      {loading ? (
        <Skeleton className="m-4 h-16" />
      ) : error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
      ) : !data?.length ? (
        <EmptyState icon={ReceiptText} title="Nothing pending" description="All bills are fully paid." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Bill</TH>
              <TH>Patient</TH>
              <TH className="hidden text-right md:table-cell">Bill total</TH>
              <TH className="hidden text-right md:table-cell">Paid</TH>
              <TH className="text-right">Balance due</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {rows.map((b) => (
              <TR key={b.id} onOpen={() => navigate(`/${branch}/billing/${b.id}`)}>
                <TD>
                  <Link to={`/${branch}/billing/${b.id}`} className="font-mono text-xs font-medium text-brand hover:underline">
                    {b.billNo}
                  </Link>
                  <div className="text-[11px] text-muted">
                    {fmtDate(b.createdAt)} · {b.opNo}
                  </div>
                </TD>
                <TD>
                  <div className="font-medium">{b.patientName}</div>
                  <div className="text-[11px] text-muted">
                    <span className="font-mono">{b.patientUhid}</span>
                    {b.patientPhone && ` · ${formatPhone(b.patientPhone)}`}
                  </div>
                </TD>
                <TD className="hidden text-right tabular-nums md:table-cell">{formatRupees(b.totalPaise)}</TD>
                <TD className="hidden text-right tabular-nums md:table-cell">{formatRupees(b.paidPaise)}</TD>
                <TD className="text-right">
                  <div className="text-base font-semibold tabular-nums">{formatRupees(b.totalPaise - b.paidPaise)}</div>
                  <Badge tone={billTone[b.status]} dot>
                    {billLabel[b.status]}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <Button size="sm" onClick={() => setReceiving(b)}>
                    <Wallet /> Receive
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Pager {...pager} />
      {receiving && <ReceiveDialog branch={branch} bill={receiving} onClose={() => setReceiving(null)} />}
    </Card>
  );
}

/** The fully paid bills of a day (today unless another day is picked), each with its bill to print again. */
function CompletedPayments({ branch }: { branch: string }) {
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  // Keyed under "bills-due": every payment already refreshes that.
  const { data, isLoading, error } = useQuery({ queryKey: ['bills-due', branch, 'paid', date], queryFn: () => api.get<{ bills: BillListRow[]; date: string }>(`/b/${branch}/bills?status=paid${date ? `&date=${date}` : ''}`), refetchInterval: 20_000 });
  const bills = data?.bills ?? [];
  const { rows, pager } = usePaged(bills, data?.date);
  return (
    <Card>
      <CardHeader
        title="Completed payments"
        description={data ? `Fully paid bills of ${fmtDay(data.date)}, newest first.` : 'Fully paid bills, newest first.'}
        icon={ReceiptText}
        iconTone="positive"
        action={
          <div className="flex items-center gap-3">
            {bills.length > 0 && <span className="hidden text-base font-semibold tabular-nums sm:inline">{formatRupees(bills.reduce((s, b) => s + b.paidPaise, 0))}</span>}
            <Input type="date" aria-label="Day" className="w-auto" value={data?.date ?? date} onChange={(e) => setDate(e.target.value)} />
          </div>
        }
      />
      {isLoading ? (
        <Skeleton className="m-4 h-16" />
      ) : error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
      ) : !bills.length ? (
        <EmptyState icon={ReceiptText} title="No completed payments on this day" description="Bills show here once they are paid in full." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Bill</TH>
              <TH>Patient</TH>
              <TH className="text-right">Paid</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {rows.map((b) => (
              <TR key={b.id} onOpen={() => navigate(`/${branch}/billing/${b.id}`)}>
                <TD>
                  <Link to={`/${branch}/billing/${b.id}`} className="font-mono text-xs font-medium text-brand hover:underline">
                    {b.billNo}
                  </Link>
                  <div className="text-[11px] text-muted">
                    {fmtTime(b.createdAt)} · {b.token != null && `Token ${b.token} · `}
                    {b.opNo}
                  </div>
                </TD>
                <TD>
                  <div className="font-medium">{b.patientName}</div>
                  <div className="text-[11px] text-muted">
                    <span className="font-mono">{b.patientUhid}</span>
                    {b.patientPhone && ` · ${formatPhone(b.patientPhone)}`}
                  </div>
                </TD>
                <TD className="text-right">
                  <div className="text-base font-semibold tabular-nums">{formatRupees(b.paidPaise)}</div>
                  <Badge tone="positive" dot>
                    Paid
                  </Badge>
                </TD>
                <TD className="text-right">
                  {/* The whole visit on one paper: consultation, lab and (for the pharmacy counter) medicines. */}
                  <PrintLink href={`/${branch}/visits/${b.visitId}/bill/print`} aria-label={`Print bill ${b.billNo}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                    <Printer /> Print
                  </PrintLink>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Pager {...pager} />
    </Card>
  );
}

/** Take money on one bill; the receipt prints as soon as it is recorded. */
function ReceiveDialog({ branch, bill, onClose }: { branch: string; bill: BillListRow; onClose: () => void }) {
  const qc = useQueryClient();
  const balance = bill.totalPaise - bill.paidPaise;
  const [amount, setAmount] = useState(String(balance / 100));
  const [mode, setMode] = useState<BillPaymentMode>('cash');
  const paise = toPaise(Number(amount) || 0);
  const pay = useMutation({
    mutationFn: () => api.post<{ bill: OpBill }>(`/b/${branch}/bills/${bill.id}/payments`, { amountPaise: paise, mode }),
    onSuccess: ({ bill: paid }) => {
      for (const k of ['bills-due', 'bill', 'to-bill', 'collection', 'checkout-queue', 'checkout', 'visit-bills', 'patient-bills', 'patient-lab', 'lab-report', 'dashboard']) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success(paid.status === 'paid' ? `Fully paid · ${paid.billNo}` : `${formatRupees(paise)} received · ${formatRupees(paid.balancePaise)} still due`);
      onClose();
      printInPlace(receiptUrl(branch, paid.id, paid.payments.at(-1)!.id));
    },
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title="Receive payment" description={`${bill.patientName} · bill ${bill.billNo} · ${formatRupees(balance)} due`}>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          pay.mutate();
        }}
      >
        <Field required label="Amount (₹)" htmlFor="receive-amount" error={pay.error ? errorMessage(pay.error) : undefined}>
          <Input id="receive-amount" autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field required label="Paid by" htmlFor="receive-mode">
          <PaymentModeSelect id="receive-mode" value={mode} onChange={setMode} />
        </Field>
        <div className="col-span-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pay.isPending || paise <= 0}>
            <Printer /> {pay.isPending ? 'Saving…' : `Receive ${formatRupees(paise)} & print receipt`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- daily report

const MODES = [
  { key: 'cash', icon: Banknote },
  { key: 'upi', icon: Smartphone },
  { key: 'card', icon: CreditCard },
] as const;

function DayReportView({ branch }: { branch: string }) {
  const [date, setDate] = useState('');
  // Keyed under "collection": every payment and sale already refreshes that.
  const { data, isLoading, error } = useQuery({ queryKey: ['collection', branch, 'day-report', date], queryFn: () => api.get<DayReport>(`/b/${branch}/billing/day-report${date ? `?date=${date}` : ''}`) });
  const { rows: receipts, pager } = usePaged(data?.receipts ?? [], data?.date);
  if (error) return <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>;
  const b = data?.billed;
  const billed: [string, number][] = b
    ? [
        ['Consultation', b.consultationPaise],
        ['Lab tests', b.labPaise],
        ['Other charges', b.otherPaise],
        ['Discount given', -b.discountPaise],
        ['Pharmacy', b.pharmacyPaise],
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input type="date" aria-label="Day" className="w-auto" value={data?.date ?? date} onChange={(e) => setDate(e.target.value)} />
          {date && (
            <Button variant="ghost" onClick={() => setDate('')}>
              Today
            </Button>
          )}
        </div>
        <PrintLink href={`/${branch}/billing/day-report/print${data ? `?date=${data.date}` : ''}`} className={buttonVariants({ variant: 'outline' })}>
          <Printer /> Print report
        </PrintLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} tone="positive" label="Total received" value={formatRupees(data?.totalPaise ?? 0)} footnote="Bills + pharmacy" loading={isLoading} />
        {MODES.map((m) => (
          <StatCard
            key={m.key}
            icon={m.icon}
            tone="brand"
            label={modeLabel[m.key]}
            value={formatRupees((data?.bills[m.key] ?? 0) + (data?.pharmacy[m.key] ?? 0))}
            footnote={`Bills ${formatRupees(data?.bills[m.key] ?? 0)} · Pharmacy ${formatRupees(data?.pharmacy[m.key] ?? 0)}`}
            loading={isLoading}
          />
        ))}
        <StatCard icon={Users} label="OP visits" value={data?.visits.total ?? 0} footnote={data ? `New patients ${data.visits.newPatients} · Lab tests ${data.labTests}` : undefined} loading={isLoading} />
        <StatCard icon={ReceiptText} tone="critical" label="Still due on this day's bills" value={formatRupees(data?.pendingDayPaise ?? 0)} footnote={data ? `All bills: ${formatRupees(data.pendingAllPaise)} due` : undefined} loading={isLoading} />
        <StatCard icon={Truck} tone="warning" label="Paid to vendors" value={formatRupees(data?.vendorPaidPaise ?? 0)} footnote="Money going out" loading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="Billed" description="What the day's bills and sales were for." />
          <dl className="divide-y divide-border text-sm">
            {billed
              .filter(([label, amount]) => amount !== 0 || label === 'Consultation' || label === 'Pharmacy')
              .map(([label, amount]) => (
                <div key={label} className="flex justify-between px-4 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="tabular-nums">{formatRupees(amount)}</dd>
                </div>
              ))}
            <div className="flex justify-between px-4 py-2.5 text-base font-semibold">
              <dt>Total billed</dt>
              <dd className="tabular-nums">{formatRupees(billed.reduce((s, [, amount]) => s + amount, 0))}</dd>
            </div>
          </dl>
          {!!data?.visits.byDoctor.length && (
            <dl className="divide-y divide-border border-t border-border text-sm">
              {data.visits.byDoctor.map((d) => (
                <div key={d.doctorName ?? 'none'} className="flex justify-between px-4 py-2.5">
                  <dt className="text-muted">{d.doctorName ?? 'No doctor assigned'}</dt>
                  <dd className="tabular-nums">
                    {d.count} visit{d.count === 1 ? '' : 's'}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Receipts" description="Every amount received on this day, in time order." />
          {isLoading ? (
            <Skeleton className="m-4 h-24" />
          ) : !data?.receipts.length ? (
            <EmptyState icon={ReceiptText} title="Nothing received on this day" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Time</TH>
                  <TH>Receipt</TH>
                  <TH>Patient</TH>
                  <TH>Mode</TH>
                  <TH className="text-right">Amount</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {receipts.map((r) => {
                  const print = r.kind === 'bill' ? receiptUrl(branch, r.billId!, r.paymentId!) : `/${branch}/pharmacy/sales/${r.saleId}/print`;
                  return (
                    <TR key={`${r.kind}-${r.paymentId ?? r.saleId}`}>
                      <TD className="whitespace-nowrap text-muted tabular-nums">{fmtTime(r.at)}</TD>
                      <TD className="font-mono text-xs">{r.no}</TD>
                      <TD>{r.patientName ?? <span className="text-muted">Pharmacy sale</span>}</TD>
                      <TD>{modeLabel[r.mode]}</TD>
                      <TD className="text-right font-medium tabular-nums">{formatRupees(r.amountPaise)}</TD>
                      <TD className="text-right">
                        <PrintLink href={print} aria-label={`Print ${r.no}`} className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}>
                          <Printer />
                        </PrintLink>
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
    </div>
  );
}
