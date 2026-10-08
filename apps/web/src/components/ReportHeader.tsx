import type { PrintHeader } from '@platform/shared';

/**
 * The branch letterhead printed on lab reports (and later bills), in the style of a
 * paper letterhead: logo | name + address | rule | doctors. Always light/green, also in dark mode.
 */
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
