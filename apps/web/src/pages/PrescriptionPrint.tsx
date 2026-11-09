import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router';
import { prettyDose, type OpVisit, type PrescriptionItem, type PrescriptionNote } from '@platform/shared';
import { api, errorMessage } from '@/api/client';
import { useMe } from '@/state/auth';
import { PrintFacts, PrintSheet, usePrintHeader } from '@/components/PrintSheet';
import { useAutoPrint } from '@/components/useAutoPrint';
import { printDateTime } from '@/components/printFormat';
import { vitalsSummary } from '@/components/Visits';
import { NOTE_WORD, withNotes } from '@/components/PrescriptionNotes';

type VisitData = { visit: OpVisit; patient: { name: string; uhid: string; gender: string | null; ageYears: number | null; phone: string | null } };

/** A4 prescription of one OP visit: patient, vitals, complaint, the medicines with the doctor's notes, the doctor's signature. */
export function PrescriptionPrint() {
  const { branch, visitId } = useParams();
  const { data: me } = useMe();
  const allowed = !!me?.branches.find((b) => b.slug === branch)?.permissions.includes('patient.view');
  const visit = useQuery({ queryKey: ['visit', branch, visitId], queryFn: () => api.get<VisitData>(`/b/${branch}/visits/${visitId}`), enabled: allowed, staleTime: 0 });
  const rx = useQuery({ queryKey: ['prescription', branch, visitId], queryFn: () => api.get<{ items: PrescriptionItem[]; notes: PrescriptionNote[] }>(`/b/${branch}/visits/${visitId}/prescription`), enabled: allowed, staleTime: 0 });
  const header = usePrintHeader(branch, allowed);
  const ready = !!visit.data && !!rx.data && !!header.data;
  const printable = ready && rx.data!.items.length + rx.data!.notes.length > 0;
  useAutoPrint(printable, !me || !allowed || !!visit.error || !!rx.error || !!header.error || (ready && !printable));

  if (!me) return <Navigate to="/login" replace />;
  if (!allowed) return <p className="p-8 text-sm">No access.</p>;
  if (visit.isLoading || rx.isLoading || header.isLoading) return <p className="p-8 text-sm">Loading…</p>;
  if (!ready) return <p className="p-8 text-sm text-red-700">{errorMessage(visit.error ?? rx.error ?? header.error)}</p>;
  const v = visit.data!.visit;
  const p = visit.data!.patient;
  const vitals = vitalsSummary(v);
  const rows = withNotes(rx.data!.items, rx.data!.notes);
  let n = 0;

  return (
    <PrintSheet
      header={header.data!.header}
      title="Prescription"
      tabTitle={`Prescription - ${p.name}`}
      back
      canPrint={printable}
      signature={false}
      share={{ phone: p.phone, subject: `Prescription - ${p.name}`, message: `Hello ${p.name}, your prescription from ${header.data!.header.title || 'the hospital'} (OP No. ${v.opNo}).` }}
    >
      <PrintFacts
        facts={[
          ['Patient', p.name],
          ['OP No.', v.token != null ? `Token ${v.token} · ${v.opNo}` : v.opNo],
          ['UHID', p.uhid],
          ['Date & time', printDateTime(v.createdAt)],
          ['Age / Sex', [p.ageYears != null ? `${p.ageYears} Y` : '', p.gender ? p.gender[0]!.toUpperCase() + p.gender.slice(1) : ''].filter(Boolean).join(' / ') || '—'],
          ['Doctor', v.doctorName ?? '—'],
        ]}
      />
      {(vitals || v.complaint) && (
        <div className="mb-4 space-y-1">
          {vitals && (
            <div>
              <b>Vitals:</b> {vitals}
            </div>
          )}
          {v.complaint && (
            <div>
              <b>Complaint:</b> {v.complaint}
            </div>
          )}
        </div>
      )}

      <div className="mb-1 text-[20px] font-bold italic">℞</div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[#3f4a45]">No medicines on this prescription.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-[#111]">
              <th className="w-8 py-1.5 text-left">#</th>
              <th className="py-1.5 text-left">Medicine</th>
              <th className="py-1.5 text-left">Dose</th>
              <th className="py-1.5 text-right">Days</th>
              <th className="py-1.5 text-right">Qty</th>
              <th className="py-1.5 pl-3 text-left">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              r.type === 'item' ? (
                <tr key={`i${r.item.id}`} className="border-b border-[#ccc]">
                  <td className="py-1.5 align-top">{++n}</td>
                  <td className="py-1.5 align-top font-semibold">
                    {r.item.medicineName} {r.item.strength}
                    {r.item.givenHere && <span className="ml-1 text-[11px] font-normal">(given at the hospital)</span>}
                  </td>
                  <td className="py-1.5 align-top">{prettyDose(r.item.dose)}</td>
                  <td className="py-1.5 text-right align-top tabular-nums">{r.item.days}</td>
                  <td className="py-1.5 text-right align-top tabular-nums">{r.item.quantity}</td>
                  <td className="py-1.5 pl-3 align-top">{r.item.instructions}</td>
                </tr>
              ) : (
                <tr key={`n${r.note.id}`}>
                  <td />
                  <td colSpan={5} className="py-1 italic">
                    {NOTE_WORD[r.note.kind]}: {r.note.text}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}

      <div className="closing mt-16 flex justify-end">
        <div className="w-[60mm] border-t border-[#111] pt-1 text-center text-[12px]">
          {v.doctorName && <div className="font-semibold">{v.doctorName}</div>}
          Doctor&apos;s signature
        </div>
      </div>
    </PrintSheet>
  );
}
