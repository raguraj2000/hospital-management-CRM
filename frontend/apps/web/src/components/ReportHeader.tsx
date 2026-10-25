import type { PrintHeader } from '@platform/shared';

/**
 * The branch letterhead printed on lab reports (and later bills), in the style of a
 * paper letterhead: logo | name + address | rule | doctors. Always light/green, also in dark mode.
 */
/** The logo large and faint behind the page (set in the print header). On paper it repeats on every page. */
export function ReportWatermark({ header }: { header: PrintHeader }) {
  if (!header.watermark || !header.logo) return null;
  return <img src={header.logo} alt="" aria-hidden className="report-watermark pointer-events-none absolute top-1/2 left-1/2 z-0 w-[62%] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]" />;
}

/** The footer line of the lab report. */
export function ReportFooter({ header }: { header: PrintHeader }) {
  if (!header.footer) return null;
  return <div className="mt-4 border-t border-[#1f6b4f] pt-1.5 text-center text-[11px] whitespace-pre-wrap text-[#3f4a45]">{header.footer}</div>;
}

export function ReportHeader({ header }: { header: PrintHeader }) {
  const doctors = header.doctors.filter((d) => d.name.trim());
  return (
    <div className="text-[#111]">
      <header className="grid items-center gap-3" style={{ gridTemplateColumns: header.logo ? '21mm minmax(0,1fr) auto max-content' : 'minmax(0,1fr) auto max-content' }}>
        {header.logo && <img src={header.logo} alt="" className="h-auto w-full" />}
        <div className="min-w-0">
          <div className="truncate text-[28px] leading-tight font-extrabold text-[#1f6b4f]" style={{ fontFamily: "'Nirmala UI','Latha',var(--font-sans)" }}>
            {header.title || 'Hospital name'}
          </div>
          {(header.address || header.phone) && (
            <div className="text-[14px]" style={{ fontFamily: "'Nirmala UI','Latha',var(--font-sans)" }}>
              {header.address}
              {header.phone && <span className={header.address ? 'ml-2 whitespace-nowrap' : 'whitespace-nowrap'}>{header.phone}</span>}
            </div>
          )}
        </div>
        {doctors.length > 0 && <div className="w-[1.5px] self-stretch bg-[#111]" />}
        {doctors.length > 0 && (
          <div className="min-w-0" style={{ fontFamily: "'Nirmala UI','Latha',var(--font-sans)" }}>
            {doctors.map((d, i) => (
              <div key={i}>
                {i > 0 && <hr className="my-1.5 border-0 border-t-[1.5px] border-[#111]" />}
                <div className="whitespace-nowrap">
                  <span className="text-[15px] font-bold text-[#1f6b4f]">{d.name}</span>
                  {d.degree && <span className="ml-1 text-[9.5px] font-semibold text-[#1f6b4f]">{d.degree}</span>}
                </div>
                {d.role && <div className="text-[12px] font-medium whitespace-nowrap text-[#1f6b4f]">{d.role}</div>}
              </div>
            ))}
          </div>
        )}
      </header>
      <div className="mt-2 mb-2.5 h-[2px] bg-[#1f6b4f]" />
    </div>
  );
}
