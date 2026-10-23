import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router';
import type { BillPaymentMode, VisitBillPrint as VisitBillData } from '@platform/shared';
import { api, errorMessage } from '@/api/client';
import { useMe } from '@/state/auth';
import { PrintFacts, PrintSheet, PrintSignature } from '@/components/PrintSheet';
import { BillChargesTable } from '@/components/BillChargesTable';
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
  const billNos = [...bills.map((b) => b.billNo), ...sales.map((s) => s.saleNo)];
  const medicineLines = sales.flatMap((s) => s.lines);
  const medicineRoundOffPaise = sales.reduce((s, x) => s + x.roundOffPaise, 0);
  const paid = (Object.keys(modeLabel) as BillPaymentMode[]).filter((m) => t.paidByMode[m] > 0);

  return (
    <PrintSheet
      header={data.header}
      title="Bill"
      tabTitle={`Bill - ${data.patient.name}`}
      back
      canPrint={printable}
      signature={false}
      share={{
        phone: data.patient.phone,
        subject: `Bill ${billNos.join(', ')}`,
        message: `Hello ${data.patient.name}, your bill ${billNos.join(', ')} from ${data.header.title || 'the hospital'}: total ₹${t.grandTotalPaise / 100}, paid ₹${t.paidPaise / 100}${t.balancePaise ? `, balance due ₹${t.balancePaise / 100}` : ''}. Thank you.`,
      }}
    >
        <PrintFacts
          facts={[
            ['Patient', data.patient.name],
            ['Bill No.', billNos.join(', ') || '—'],
            ['UHID', data.patient.uhid],
            ['Date & time', printDateTime(billedAt) || printDay(data.visit.visitDate)],
            ['OP No.', data.visit.token != null ? `Token ${data.visit.token} · ${data.visit.opNo}` : data.visit.opNo],
            ...(data.visit.doctorName ? ([['Doctor', data.visit.doctorName]] as [string, string][]) : []),
          ]}
        />

        {!printable && <p className="py-10 text-center text-[#3f4a45]">Nothing has been billed for this visit yet.</p>}

        {bills.length > 0 && <BillChargesTable bills={bills} totalLabel={medicineLines.length > 0 ? 'Hospital charges total' : 'Charges total'} />}

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
              {medicineRoundOffPaise > 0 && (
                <tr>
                  <td colSpan={5} className="py-1.5 text-right">
                    Round off
                  </td>
                  <td className="py-1.5 text-right tabular-nums">+ {printMoney(medicineRoundOffPaise)}</td>
                </tr>
              )}
              <tr className="border-t border-[#111] font-semibold">
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
