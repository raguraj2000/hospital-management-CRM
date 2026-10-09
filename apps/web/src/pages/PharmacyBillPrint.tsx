import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router';
import type { PharmacySaleDetail, PrintHeader } from '@platform/shared';
import { api, errorMessage } from '@/api/client';
import { useMe } from '@/state/auth';
import { PrintSheet } from '@/components/PrintSheet';
import { useAutoPrint } from '@/components/useAutoPrint';
import { modeLabel } from '@/components/format';
import { printDateTime, printDay, printMoney } from '@/components/printFormat';


/** A4 pharmacy bill with the branch letterhead: direct and prescription sales alike. */
export function PharmacyBillPrint() {
  const { branch, saleId } = useParams();
  const { data: me } = useMe();
  const allowed = me?.branches.find((b) => b.slug === branch)?.permissions.includes('pharmacy.sell');
  const { data, isLoading, error } = useQuery({
    queryKey: ['pharmacy-sale', branch, saleId],
    queryFn: () => api.get<{ sale: PharmacySaleDetail; header: PrintHeader }>(`/b/${branch}/pharmacy/sales/${saleId}`),
    enabled: !!allowed,
  });
  useAutoPrint(!!data);

  if (!me) return <Navigate to="/login" replace />;
  if (!allowed) return <p className="p-8 text-sm">No access.</p>;
  if (isLoading) return <p className="p-8 text-sm">Loading…</p>;
  if (!data) return <p className="p-8 text-sm text-red-700">{errorMessage(error)}</p>;
  const s = data.sale;

  return (
    <PrintSheet header={data.header} title="Pharmacy Bill" tabTitle={`Pharmacy Bill ${s.saleNo}`}>
        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-[#111] px-3 py-2">
          <div>
            <b>Patient:</b> {s.patient?.name ?? 'Walk-in customer'}
          </div>
          <div>
            <b>Bill No.:</b> {s.saleNo}
          </div>
          <div>{s.patient && <><b>UHID:</b> {s.patient.uhid}</>}</div>
          <div>
            <b>Date &amp; time:</b> {printDateTime(s.createdAt)}
          </div>
          {s.opNo && (
            <div>
              <b>OP No.:</b> {s.opNo}
            </div>
          )}
        </div>
        {s.lines.length === 0 ? (
          <p className="py-10 text-center text-[#3f4a45]">This bill has no medicines.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-y border-[#111]">
                <th className="py-1.5 text-left">Medicine</th>
                <th className="py-1.5 text-left">Batch</th>
                <th className="py-1.5 text-left">Expiry</th>
                <th className="py-1.5 text-right">Qty</th>
                <th className="py-1.5 text-right">Rate (₹)</th>
                <th className="py-1.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {s.lines.map((l, i) => (
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
              <tr className="border-t-2 border-[#111] text-[15px] font-bold">
                <td colSpan={5} className="py-2 text-right">
                  Total
                </td>
                <td className="py-2 text-right tabular-nums">{printMoney(s.totalPaise)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="py-1 text-right">
                  Paid by
                </td>
                <td className="py-1 text-right">{modeLabel[s.paymentMode]}</td>
              </tr>
            </tbody>
          </table>
        )}
    </PrintSheet>
  );
}
