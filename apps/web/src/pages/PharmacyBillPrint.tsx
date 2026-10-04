import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router';
import type { PaymentMode, PharmacySaleDetail, PrintHeader } from '@platform/shared';
import { api, errorMessage } from '@/api/client';
import { useMe } from '@/state/auth';
import { ReportHeader } from '@/components/ReportHeader';
import { useAutoPrint } from '@/components/useAutoPrint';

const modeLabel: Record<PaymentMode, string> = { cash: 'Cash', upi: 'UPI', card: 'Card' };
const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
// Stored in UTC; the bill shows India time whatever the PC's clock is set to.
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
const money = (paise: number) => (paise / 100).toFixed(2);

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
  useEffect(() => {
    if (data) document.title = `Pharmacy Bill ${data.sale.saleNo}`;
  }, [data]);
  useAutoPrint(!!data);

  if (!me) return <Navigate to="/login" replace />;
  if (!allowed) return <p className="p-8 text-sm">No access.</p>;
  if (isLoading) return <p className="p-8 text-sm">Loading…</p>;
  if (!data) return <p className="p-8 text-sm text-red-700">{errorMessage(error)}</p>;
  const s = data.sale;

  return (
    <div className="ph-print min-h-dvh bg-[#dfe5e1] text-[13px] text-[#111]">
      <style>{`.ph-print, .ph-print * { color-scheme: light; } @page { size: A4; margin: 10mm; } @media print { .no-print { display:none !important } .sheet { box-shadow:none !important; margin:0 !important; width:auto !important; padding:0 !important } body, .ph-print { background:#fff !important } }`}</style>
      <div className="no-print sticky top-0 flex justify-end gap-2 border-b border-[#b7c3bd] bg-white px-4 py-2.5">
        <button onClick={() => window.print()} className="rounded-md bg-[#1f6b4f] px-4 py-1.5 text-sm font-semibold text-white">
          Print
        </button>
      </div>
      <div className="sheet mx-auto my-6 w-[210mm] max-w-full bg-white px-[11mm] py-[9mm] shadow">
        <ReportHeader header={data.header} />
        <div className="mb-3 text-center text-[15px] font-semibold text-[#1f6b4f]">Pharmacy Bill</div>
        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-[#111] px-3 py-2">
          <div>
            <b>Patient:</b> {s.patient?.name ?? 'Walk-in customer'}
          </div>
          <div>
            <b>Bill No.:</b> {s.saleNo}
          </div>
          <div>{s.patient && <><b>UHID:</b> {s.patient.uhid}</>}</div>
          <div>
            <b>Date:</b> {fmtDateTime(s.createdAt)}
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
                  <td className="py-1.5">{fmtDay(l.expiryDate)}</td>
                  <td className="py-1.5 text-right tabular-nums">{l.quantity}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(l.unitPricePaise)}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(l.amountPaise)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#111] text-[15px] font-bold">
                <td colSpan={5} className="py-2 text-right">
                  Total
                </td>
                <td className="py-2 text-right tabular-nums">{money(s.totalPaise)}</td>
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
        <div className="mt-16 flex items-end justify-between">
          <div className="text-[12px]">{s.soldByName && <>Sold by: {s.soldByName}</>}</div>
          <div className="w-[60mm] border-t border-[#111] pt-1 text-center text-[12px]">Authorised signature</div>
        </div>
      </div>
    </div>
  );
}
