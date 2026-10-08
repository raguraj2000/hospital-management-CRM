// Printed papers of the billing counter: the receipt for one payment, and the day's report.
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { receiptNo, type DayReport, type OpBill } from '@platform/shared';
import { api, errorMessage } from '@/api/client';
import { modeLabel } from '@/components/format';
import { printDateTime, printDay, printMoney } from '@/components/printFormat';
import { PrintFacts, PrintSheet, usePrintHeader } from '@/components/PrintSheet';
import { useAutoPrint } from '@/components/useAutoPrint';
import { useMe } from '@/state/auth';

function useAllowed(branch: string | undefined, ...permissions: string[]) {
  const { data: me } = useMe();
  return { me, allowed: !!me?.branches.find((b) => b.slug === branch)?.permissions.some((p) => permissions.includes(p)) };
}

/** What every print page shows before its paper is ready; null = go on and print. */
function waiting(me: unknown, allowed: boolean, loading: boolean, error: unknown): ReactNode | null {
  if (!me) return <Navigate to="/login" replace />;
  if (!allowed) return <p className="p-8 text-sm">No access.</p>;
  if (loading) return <p className="p-8 text-sm">Loading…</p>;
  if (error) return <p className="p-8 text-sm text-red-700">{errorMessage(error)}</p>;
  return null;
}

const Line = ({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) => (
  <tr className={strong ? 'border-t-2 border-[#111] text-[15px] font-bold' : 'border-b border-[#ccc]'}>
    <td className="py-1.5">{label}</td>
    <td className="py-1.5 text-right tabular-nums">{printMoney(amount)}</td>
  </tr>
);

/** Receipt for ONE payment taken on an OP bill: what was received, and what is still due. */
export function ReceiptPrint() {
  const { branch, billId, paymentId } = useParams();
  const { me, allowed } = useAllowed(branch, 'billing.receive', 'patient.view');
  const bill = useQuery({ queryKey: ['bill', branch, billId], queryFn: () => api.get<{ bill: OpBill }>(`/b/${branch}/bills/${billId}`), enabled: allowed, staleTime: 0 });
  const header = usePrintHeader(branch, allowed);
  const b = bill.data?.bill;
  const nth = b ? b.payments.findIndex((p) => String(p.id) === paymentId) : -1;
  const missing = !!b && nth < 0;
  useAutoPrint(!!b && !!header.data && !missing, !me || !allowed || !!bill.error || !!header.error || missing);

  const wait = waiting(me, allowed, bill.isLoading || header.isLoading, bill.error ?? header.error);
  if (wait) return wait;
  if (!b || !header.data || missing) return <p className="p-8 text-sm text-red-700">Receipt not found.</p>;
  const payment = b.payments[nth]!;
  const before = b.payments.slice(0, nth).reduce((s, p) => s + p.amountPaise, 0);
  const no = receiptNo(b.billNo, nth + 1);

  return (
    <PrintSheet header={header.data.header} title="RECEIPT" tabTitle={`Receipt ${no} - ${b.patientName}`}>
      <PrintFacts
        facts={[
          ['Patient', b.patientName],
          ['Receipt No.', no],
          ['UHID', b.patientUhid],
          ['Date & time', printDateTime(payment.receivedAt)],
          ['OP No.', b.opNo],
          ['Bill No.', b.billNo],
        ]}
      />
      <p className="mb-4 text-[14px] leading-relaxed">
        Received with thanks from <b>{b.patientName}</b> the sum of <b>₹ {printMoney(payment.amountPaise)}</b> by <b>{modeLabel[payment.mode]}</b> towards bill {b.billNo}.
      </p>
      <table className="ml-auto w-[90mm] border-collapse">
        <tbody>
          <Line label="Bill total (₹)" amount={b.totalPaise} />
          {before > 0 && <Line label="Paid earlier" amount={before} />}
          <Line label="Received now" amount={payment.amountPaise} strong />
          <Line label="Balance due" amount={Math.max(0, b.totalPaise - before - payment.amountPaise)} />
        </tbody>
      </table>
    </PrintSheet>
  );
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-4 break-inside-avoid">
    <h2 className="mb-1 border-b border-[#111] pb-0.5 text-[13px] font-bold uppercase">{title}</h2>
    {children}
  </section>
);

/** The day on one paper (?date=YYYY-MM-DD, default today). */
export function DayReportPrint() {
  const { branch } = useParams();
  const [params] = useSearchParams();
  const date = params.get('date') ?? '';
  const { me, allowed } = useAllowed(branch, 'billing.receive');
  const report = useQuery({ queryKey: ['day-report', branch, date], queryFn: () => api.get<DayReport>(`/b/${branch}/billing/day-report${date ? `?date=${date}` : ''}`), enabled: allowed, staleTime: 0 });
  const header = usePrintHeader(branch, allowed);
  useAutoPrint(!!report.data && !!header.data, !me || !allowed || !!report.error || !!header.error);

  const wait = waiting(me, allowed, report.isLoading || header.isLoading, report.error ?? header.error);
  if (wait) return wait;
  const r = report.data!;
  const received = (m: 'cash' | 'upi' | 'card') => r.bills[m] + r.pharmacy[m];
  const billedTotal = r.billed.consultationPaise + r.billed.labPaise + r.billed.otherPaise - r.billed.discountPaise + r.billed.pharmacyPaise;

  return (
    <PrintSheet header={header.data!.header} title={`DAILY REPORT — ${printDay(r.date)}`} tabTitle={`Daily report ${r.date}`}>
      <div className="grid grid-cols-2 gap-x-8">
        <Section title="Patients">
          <table className="w-full border-collapse">
            <tbody>
              {[
                ['OP visits', r.visits.total],
                ['Completed', r.visits.completed],
                ['Cancelled', r.visits.cancelled],
                ['New patients registered', r.visits.newPatients],
                ['Lab tests ordered', r.labTests],
                ...r.visits.byDoctor.map((d) => [`Seen by ${d.doctorName ?? 'no doctor assigned'}`, d.count] as [string, number]),
              ].map(([label, n]) => (
                <tr key={label} className="border-b border-[#ccc]">
                  <td className="py-1">{label}</td>
                  <td className="py-1 text-right tabular-nums">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Billed (₹)">
          <table className="w-full border-collapse">
            <tbody>
              <Line label="Consultation" amount={r.billed.consultationPaise} />
              <Line label="Lab tests" amount={r.billed.labPaise} />
              {r.billed.otherPaise > 0 && <Line label="Other charges" amount={r.billed.otherPaise} />}
              {r.billed.discountPaise > 0 && <Line label="Discount given" amount={-r.billed.discountPaise} />}
              <Line label="Pharmacy" amount={r.billed.pharmacyPaise} />
              <Line label="Total billed" amount={billedTotal} strong />
            </tbody>
          </table>
        </Section>
        <Section title="Received (₹)">
          <table className="w-full border-collapse">
            <tbody>
              <Line label="Cash" amount={received('cash')} />
              <Line label="UPI" amount={received('upi')} />
              <Line label="Card" amount={received('card')} />
              <Line label="Total received" amount={r.totalPaise} strong />
            </tbody>
          </table>
        </Section>
        <Section title="Other (₹)">
          <table className="w-full border-collapse">
            <tbody>
              <Line label="Still due on this day's bills" amount={r.pendingDayPaise} />
              <Line label="Still due on all bills" amount={r.pendingAllPaise} />
              <Line label="Paid to vendors" amount={r.vendorPaidPaise} />
            </tbody>
          </table>
        </Section>
      </div>
      <Section title={`Receipts (${r.receipts.length})`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#111] text-left">
              <th className="py-1">Time</th>
              <th className="py-1">Receipt / sale no.</th>
              <th className="py-1">Patient</th>
              <th className="py-1">Mode</th>
              <th className="py-1 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {r.receipts.map((x) => (
              <tr key={`${x.kind}-${x.paymentId ?? x.saleId}`} className="border-b border-[#ccc]">
                <td className="py-1 whitespace-nowrap">{printDateTime(x.at).split(', ')[1]}</td>
                <td className="py-1">{x.no}</td>
                <td className="py-1">{x.patientName ?? (x.kind === 'pharmacy' ? 'Pharmacy sale' : '—')}</td>
                <td className="py-1">{modeLabel[x.mode]}</td>
                <td className="py-1 text-right tabular-nums">{printMoney(x.amountPaise)}</td>
              </tr>
            ))}
            {r.receipts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-2 text-center">
                  Nothing received on this day.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>
    </PrintSheet>
  );
}
