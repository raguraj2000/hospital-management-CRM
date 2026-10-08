import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PrintHeader } from '@platform/shared';
import { api } from '@/api/client';
import { ReportHeader } from './ReportHeader';

/** The branch's letterhead for a printed paper. */
export const usePrintHeader = (branch: string | undefined, enabled: boolean) =>
  useQuery({ queryKey: ['print-header', branch], queryFn: () => api.get<{ header: PrintHeader }>(`/b/${branch}/print-header`), enabled });

const SHEET_CSS = `
  .print-page, .print-page * { color-scheme: light; }
  @page { size: A4; margin: 10mm; }
  @media print {
    .print-page { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: #fff !important; }
    .no-print { display: none !important; }
    .sheet { width: auto !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
    .print-page tr, .closing { break-inside: avoid; }
  }
`;

/** The line the hospital signs on, bottom right. */
export const PrintSignature = () => (
  <div className="mt-16 flex justify-end">
    <div className="w-[60mm] border-t border-[#111] pt-1 text-center text-[12px]">Authorised signature</div>
  </div>
);

/**
 * An A4 paper: the Print bar (screen only), the letterhead, a title, the content, and the signature line.
 * `back`: a Back button, for papers that are also opened as a page. `signature={false}`: the paper places PrintSignature itself.
 */
export function PrintSheet({
  header,
  title,
  tabTitle,
  signature = true,
  back,
  canPrint = true,
  children,
}: {
  header: PrintHeader;
  title: string;
  tabTitle?: string;
  signature?: boolean;
  back?: boolean;
  canPrint?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (tabTitle) document.title = tabTitle;
  }, [tabTitle]);
  return (
    <div className="print-page min-h-dvh bg-[#dfe5e1] text-[13px] text-[#111]">
      <style>{SHEET_CSS}</style>
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[#b7c3bd] bg-white px-4 py-2.5">
        {back && (
          <button onClick={() => window.history.back()} className="rounded-md border border-[#1f6b4f] px-4 py-2 text-base font-medium text-[#1f6b4f]">
            ← Back
          </button>
        )}
        <span className="flex-1" />
        <button onClick={() => window.print()} disabled={!canPrint} className="rounded-md bg-[#1f6b4f] px-5 py-2 text-base font-semibold text-white disabled:opacity-50">
          Print
        </button>
      </div>
      <div className="sheet mx-auto my-6 w-[210mm] max-w-full bg-white px-[11mm] py-[9mm] shadow">
        <ReportHeader header={header} />
        <div className="mb-3 text-center text-[15px] font-semibold text-[#1f6b4f]">{title}</div>
        {children}
        {signature && <PrintSignature />}
      </div>
    </div>
  );
}

/** The boxed block of "Label: value" pairs at the top of a paper, two per row. */
export function PrintFacts({ facts }: { facts: [string, ReactNode][] }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-[#111] px-3 py-2">
      {facts.map(([label, value]) => (
        <div key={label}>
          <b>{label}:</b> {value}
        </div>
      ))}
    </div>
  );
}
