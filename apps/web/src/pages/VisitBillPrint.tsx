import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router';
import { billCharges, type BillPaymentMode, type VisitBillPrint as VisitBillData } from '@platform/shared';
import { api, errorMessage } from '@/api/client';
import { useMe } from '@/state/auth';
import { PrintSheet, PrintSignature } from '@/components/PrintSheet';
import { useAutoPrint } from '@/components/useAutoPrint';
import { printDateTime, printDay, printMoney } from '@/components/printFormat';
import { modeLabel } from '@/components/format';


/**
 * ONE printed A4 bill for a visit: consultation & lab (its OP bills) and medicines (its pharmacy sales),
 * one grand total. Own page, no app menus; the print dialog opens by itself once it has loaded.
 */
export function VisitBillPrint() {
  const { branch, visitId } = useParams();
  const { data: me } = useMe();
  const allowed = me?.branches.find((b) => b.slug === branch)?.permissions.some((p) => p === 'billing.receive' || p === 'pharmacy.sell' || p === 'patient.view');
  const { data, isLoading, error } = useQuery({
    queryKey: ['visit-bill-print', branch, visitId],
    queryFn: () => api.get<VisitBillData>(`/b/${branch}/visits/${visitId}/combined-bill`),
    enabled: !!allowed,
    staleTime: 0, // always the latest payments
  });
  const bills = data?.bills ?? [];
  const sales = data?.sales ?? [];
  const printable = bills.length + sales.length > 0;
  // The moment money was last taken for this visit (else when the bill was made).
  const billedAt = [...bills.flatMap((b) => b.payments.map((x) => x.receivedAt)), ...sales.map((x) => x.createdAt)].sort().at(-1) ?? bills.map((b) => b.createdAt).sort().at(-1);
  useAutoPrint(!!data && printable, !!data && !printable);

  if (!me) return <Navigate to="/login" replace />;
  if (!allowed) return <p className="p-8 text-sm">No access.</p>;
  if (isLoading) return <p className="p-8 text-sm">Loading…</p>;
  if (!data) return <p className="p-8 text-sm text-red-700">{errorMessage(error)}</p>;

  const t = data.totals;
  // Consultation & lab: every charge of every OP bill of the visit, in bill order.
  const charges: [string, number][] = [];
  for (const b of bills) {
    if (b.consultationFeePaise > 0 || b === bills[0]) charges.push(['Consultation fee', b.consultationFeePaise]);
    for (const l of b.lines) if (l.labOrderId != null) charges.push([`Lab: ${l.description}`, l.amountPaise]);
    for (const x of billCharges(b)) charges.push([x.description, x.amountPaise]);
  }
  const discountPaise = bills.reduce((s, b) => s + b.discountPaise, 0);
  const billNos = [...bills.map((b) => b.billNo), ...sales.map((s) => s.saleNo)];
  const medicineLines = sales.flatMap((s) => s.lines);
  const paid = (Object.keys(modeLabel) as BillPaymentMode[]).filter((m) => t.paidByMode[m] > 0);

  return (
    <PrintSheet header={data.header} title="Bill" tabTitle={`Bill - ${data.patient.name}`} back canPrint={printable} signature={false}>
        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-[#111] px-3 py-2">
          <div>
            <b>Patient:</b> {data.patient.name}
          </div>
          <div>
            <b>Date &amp; time:</b> {printDateTime(billedAt) || printDay(data.visit.visitDate)}
          </div>
          <div>
            <b>UHID:</b> {data.patient.uhid}
          </div>
          <div>
            <b>Token · OP No.:</b> {data.visit.token != null ? `${data.visit.token} · ` : ''}
            {data.visit.opNo}
          </div>
          <div>
            <b>Doctor:</b> {data.visit.doctorName ?? '—'}
          </div>
          <div>
            <b>Bill No.:</b> {billNos.join(', ') || '—'}
          </div>
        </div>

        {!printable && <p className="py-10 text-center text-[#3f4a45]">Nothing has been billed for this visit yet.</p>}

        {bills.length > 0 && (
          <table className="mb-4 w-full border-collapse">
            <thead>
              <tr className="border-y border-[#111]">
                <th className="w-10 py-1.5 text-left">#</th>
                <th className="py-1.5 text-left">Consultation &amp; lab</th>
                <th className="py-1.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {charges.map(([d, a], i) => (
                <tr key={i} className="border-b border-[#ccc]">
                  <td className="py-1.5">{i + 1}</td>
                  <td className="py-1.5">{d}</td>
                  <td className="py-1.5 text-right tabular-nums">{printMoney(a)}</td>
                </tr>
              ))}
              {discountPaise > 0 && (
                <tr className="border-b border-[#ccc]">
                  <td />
                  <td className="py-1.5 text-right">Discount</td>
                  <td className="py-1.5 text-right tabular-nums">− {printMoney(discountPaise)}</td>
                </tr>
              )}
              <tr className="font-semibold">
                <td />
                <td className="py-1.5 text-right">Consultation &amp; lab total</td>
                <td className="py-1.5 text-right tabular-nums">{printMoney(bills.reduce((s, b) => s + b.totalPaise, 0))}</td>
              </tr>
            </tbody>
          </table>
        )}

        {medicineLines.length > 0 && (
          <table className="mb-4 w-full border-collapse">
            <thead>
              <tr className="border-y border-[#111]">
                <th className="py-1.5 text-left">Medicines</th>
                <th className="py-1.5 text-left">Batch</th>
                <th className="py-1.5 text-left">Expiry</th>
                <th className="py-1.5 text-right">Qty</th>
                <th className="py-1.5 text-right">Rate (₹)</th>
                <th className="py-1.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {medicineLines.map((l, i) => (
                <tr key={i} className="border-b border-[#ccc]">
                  <td className="py-1.5">
                    {l.medicineName} {l.strength}
                  </td>
                  <td className="py-1.5 font-mono text-[12px]">{l.batchNo}</td>
                  <td className="py-1.5">{printDay(l.expiryDate)}</td>
                  <td className="py-1.5 text-right tabular-nums">{l.quantity}</td>
                  <td className="py-1.5 text-right tabular-nums">{printMoney(l.unitPricePaise)}</td>
                  <td className="py-1.5 text-right tabular-nums">{printMoney(l.amountPaise)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td colSpan={5} className="py-1.5 text-right">
                  Medicines total
                </td>
                <td className="py-1.5 text-right tabular-nums">{printMoney(sales.reduce((s, x) => s + x.totalPaise, 0))}</td>
              </tr>
            </tbody>
          </table>
        )}

        {printable && (
          <div className="closing">
            <table className="ml-auto w-[90mm] border-collapse">
              <tbody>
                <tr className="border-t-2 border-[#111] text-[15px] font-bold">
                  <td className="py-2">Grand total</td>
                  <td className="py-2 text-right tabular-nums">₹ {printMoney(t.grandTotalPaise)}</td>
                </tr>
                {paid.length === 0 ? (
                  <tr>
                    <td className="py-1">Paid</td>
                    <td className="py-1 text-right tabular-nums">₹ {printMoney(0)}</td>
                  </tr>
                ) : (
                  paid.map((m) => (
                    <tr key={m}>
                      <td className="py-1">Paid by {modeLabel[m]}</td>
                      <td className="py-1 text-right tabular-nums">₹ {printMoney(t.paidByMode[m])}</td>
                    </tr>
                  ))
                )}
                <tr className="border-t border-[#111] font-semibold">
                  <td className="py-1.5">Balance due</td>
                  <td className="py-1.5 text-right tabular-nums">₹ {printMoney(t.balancePaise)}</td>
                </tr>
              </tbody>
            </table>
            <PrintSignature />
          </div>
        )}
    </PrintSheet>
  );
}
