import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router';
import type { LabReport, LabReportTest } from '@platform/shared';
import { api, ApiError, errorMessage } from '@/api/client';
import { useMe } from '@/state/auth';
import { ReportHeader } from '@/components/ReportHeader';
import { useAutoPrint } from '@/components/useAutoPrint';
import { printDateTime } from '@/components/printFormat';

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

/**
 * Printable A4 lab report (own page, no app menus). Layout follows a paper lab report:
 * letterhead, patient box, results by department with H/L flags, signatures.
 * One report for every test that has results. The print dialog opens by itself once it has loaded.
 */
export function LabReportPrint() {
  const { branch, visitId } = useParams();
  const { data: me } = useMe();
  const allowed = me?.branches.find((b) => b.slug === branch)?.permissions.some((p) => p === 'lab.view' || p === 'lab.order');
  const { data, isLoading, error } = useQuery({
    // ?print=1: the server refuses (402) until the lab charges are paid or an admin released it.
    queryKey: ['lab-report', branch, visitId, 'print'],
    queryFn: () => api.get<LabReport>(`/b/${branch}/visits/${visitId}/lab-report?print=1`),
    enabled: !!allowed,
    retry: false,
  });
  const canRelease = me?.branches.find((b) => b.slug === branch)?.permissions.includes('settings.manage');

  useEffect(() => {
    if (data) document.title = `Lab Report - ${data.patient.name}`;
  }, [data]);
  // Only tests with results print. (Nothing to print, "Payment pending" or an error: no print dialog.)
  // Only finished tests are a report: values typed but not yet "Save & complete" stay in the lab.
  const tests = (data?.tests ?? []).filter((t) => t.status === 'completed' && t.parameters.some((p) => p.value.trim()));
  const printable = tests.length > 0;
  useAutoPrint(!error && printable, !me || !allowed || !!error || (!!data && !printable));

  if (!me) return <Navigate to="/login" replace />;
  if (!allowed) return <p className="p-8 text-sm">No access to lab reports in this branch.</p>;
  if (isLoading) return <p className="p-8 text-sm">Loading…</p>;
  if (error instanceof ApiError && error.code === 'unpaid') return <Unpaid message={error.message} branch={branch!} visitId={visitId!} canRelease={!!canRelease} />;
  if (error || !data) return <p className="p-8 text-sm text-red-700">{errorMessage(error)}</p>;

  const pending = data.tests.filter((t) => t.status !== 'completed').length;
  const h = data.header;

  return (
    <div className="lab-print min-h-dvh bg-[#dfe5e1] text-[13px] text-[#111]">
      <style>{`
        .lab-print, .lab-print * { color-scheme: light; }
        @page { size: A4; margin: 8mm 10mm 12mm; }
        @media print {
          .lab-print { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .sheet { width: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
          .rt tr, .cgrp, .closing { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[#b7c3bd] bg-white px-4 py-2.5">
        <button onClick={() => window.history.back()} className="rounded-md border border-[#1f6b4f] px-3 py-1.5 text-sm font-medium text-[#1f6b4f]">
          ← Back
        </button>
        <span className="font-semibold text-[#1f6b4f]">{h.title}</span>
        <span className="flex-1" />
        {pending > 0 && <span className="rounded bg-[#fff3d1] px-2 py-1 text-xs font-medium text-[#6b4500]">{pending} test{pending > 1 ? 's' : ''} not completed yet</span>}
        <button onClick={() => window.print()} disabled={!printable} className="rounded-md bg-[#1f6b4f] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          Print
        </button>
      </div>

      <Sheet data={data} tests={tests} />
    </div>
  );
}

/** The A4 sheet: letterhead, patient box, results, signatures. */
function Sheet({ data, tests }: { data: LabReport; tests: LabReportTest[] }) {
  const p = data.patient;
  const h = data.header;
  const sampleAt = data.tests.map((t) => t.sampleCollectedAt).filter(Boolean).sort()[0];
  const reportAt = data.tests.map((t) => t.completedAt).filter(Boolean).sort().at(-1);
  return (
    <div className="sheet mx-auto my-6 min-h-[297mm] w-[210mm] bg-white px-[11mm] py-[9mm] shadow">
      <ReportHeader header={h} />
      <div className="mb-2 text-center text-[14px] font-semibold text-[#1f6b4f]">Laboratory Report</div>

      {/* patient box */}
      <div className="mb-2.5 grid grid-cols-[1.25fr_1fr] gap-x-6 gap-y-[3px] rounded-md border border-[#111] px-3 py-[7px]">
        <Kv k="Patient Name" v={p.name} />
        <Kv k="UHID" v={p.uhid} />
        <Kv k="Age / Sex" v={[p.age != null ? `${p.age} Y` : '', p.gender ? p.gender[0]!.toUpperCase() + p.gender.slice(1) : ''].filter(Boolean).join(' / ')} />
        <Kv k="Bill Date" v={printDateTime(data.billedAt) || fmt(data.visit.visitDate)} />
        <Kv k="Mobile" v={p.phone?.replace(/^\+91/, '') ?? ''} />
        <Kv k="Sample Date" v={printDateTime(sampleAt)} />
        <Kv k="Referred By" v={data.visit.doctorName ?? ''} />
        <Kv k="Report Date" v={printDateTime(reportAt ?? new Date().toISOString())} />
        <Kv k="OP No." v={data.visit.opNo} />
        <Kv k="Bill No." v={data.billNo ?? ''} />
      </div>

      {tests.length === 0 ? (
        <p className="no-print py-10 text-center text-[#3f4a45]">No completed results yet. Enter the results and press "Save & complete" in the lab.</p>
      ) : (
        <PanelResults tests={tests} />
      )}

      <div className="closing">
        {tests.length > 0 && <div className="mt-[18px] text-center tracking-[.5px]">************ End of the Report ************</div>}
        <div className="mt-[26px] flex justify-between">
          <Sign image={h.leftSignImage} name={h.leftSignName} title={h.leftSignTitle || 'Lab Technician'} align="left" />
          <Sign image={h.rightSignImage} name={h.rightSignName} title={h.rightSignTitle} align="right" />
        </div>
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[30mm_1fr] gap-1">
      <b className="font-semibold">{k}</b>
      <span>: {v}</span>
    </div>
  );
}

function PanelResults({ tests }: { tests: LabReportTest[] }) {
  const departments = [...new Set(tests.map((t) => t.department))];
  return (
    <table className="rt w-full table-fixed border-collapse">
      <colgroup>
        <col className="w-[34%]" />
        <col className="w-[27%]" />
        <col className="w-[21%]" />
        <col className="w-[18%]" />
      </colgroup>
      <thead>
        <tr>
          {['Test', 'Methodology', 'Result', 'Ref-Range'].map((x) => (
            <th key={x} className="border-b border-[#111] px-1 py-1.5 text-left text-[13px] font-semibold">
              {x}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {departments.map((d) => [
          <tr key={d}>
            <td colSpan={4} className="pt-3 pb-1 text-center font-bold">
              {d}
            </td>
          </tr>,
          ...tests
            .filter((t) => t.department === d)
            .flatMap((t) => [
              <tr key={`g${t.orderId}`}>
                <td colSpan={4} className="pt-[9px] font-bold">
                  {t.name}
                </td>
              </tr>,
              ...t.parameters
                .filter((x) => x.value.trim())
                .map((x) => {
                  const numeric = /\d/.test(x.value);
                  return (
                    <tr key={x.id}>
                      <td className="px-1 py-[3px] align-top">{x.name}</td>
                      <td className="px-1 py-[3px] align-top">{x.method}</td>
                      <td className={`px-1 py-[3px] align-top ${x.flag || /^\s*(positive|reactive)/i.test(x.value) ? 'font-bold' : ''}`}>
                        {x.value} {numeric && x.type === 'number' && x.unit}
                        {(x.flag === 'H' || x.flag === 'L') && <span className="ml-1 text-[11px] font-bold text-[#b3261e] print:text-black">{x.flag}</span>}
                      </td>
                      <td className="px-1 py-[3px] align-top">{x.refRange}</td>
                    </tr>
                  );
                }),
            ]),
        ])}
      </tbody>
    </table>
  );
}

function Sign({ image, name, title, align }: { image: string | null | undefined; name: string; title: string; align: 'left' | 'right' }) {
  return (
    <div className={`w-[62mm] ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <div className={`flex h-[18mm] items-end ${align === 'right' ? 'justify-end' : 'justify-start'}`}>{image && <img src={image} alt="" className="max-h-[18mm] max-w-full" />}</div>
      <div className="my-1 border-t border-[#111]" />
      {name && <div className="font-semibold">{name}</div>}
      {title && <div className="text-[11.5px] text-[#3f4a45]">{title}</div>}
    </div>
  );
}

/** Lab charges not paid: point to Billing; owner/branch admin may release with a reason. */
function Unpaid({ message, branch, visitId, canRelease }: { message: string; branch: string; visitId: string; canRelease: boolean }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-[#e6c56b] bg-[#fff8e6] p-6 text-[#4a3500]">
      <h1 className="text-lg font-semibold">Payment pending</h1>
      <p className="mt-1 text-sm">{message}</p>
      <a href={`/${branch}/visits/${visitId}`} className="mt-4 inline-block rounded-md bg-[#1f6b4f] px-4 py-2 text-sm font-semibold text-white">
        Open the visit to bill it
      </a>
      {canRelease && (
        <form
          className="mt-6 border-t border-[#e6c56b] pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            try {
              await api.post(`/b/${branch}/visits/${visitId}/lab-release`, { reason });
              await qc.invalidateQueries({ queryKey: ['lab-report', branch, visitId] });
            } catch (x) {
              setErr(errorMessage(x));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="release-reason" className="text-sm font-medium">
            Admin: release before payment (reason is logged)
          </label>
          <input id="release-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Emergency, will pay tomorrow" className="mt-2 h-9 w-full rounded-md border border-[#d9b75a] bg-white px-3 text-sm" />
          {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
          <button disabled={busy || reason.trim().length < 3} className="mt-2 rounded-md border border-[#1f6b4f] px-3 py-1.5 text-sm font-medium text-[#1f6b4f] disabled:opacity-50">
            Release report
          </button>
        </form>
      )}
    </div>
  );
}
