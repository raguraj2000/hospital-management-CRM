import { useLayoutEffect, useRef } from 'react';
import logo from '../assets/print/logo.png';
import '../styles/print-doc.css';

export interface PrintHeaderData {
  name: string;
  address: string;
  phone: string;
  doctors: { name: string; degree: string; role: string }[];
}

/**
 * The hospital letterhead printed at the top of every paper document: logo,
 * Tamil name and address, and the doctors. "compact" is the narrow version
 * for the 80 mm pharmacy receipt. Put it inside an element with class
 * "print-doc" so the report fonts apply.
 */
export function PrintHeader({ header, compact }: { header: PrintHeaderData; compact?: boolean }) {
  if (compact) {
    return (
      <div className="pd-hosp-compact">
        <img src={logo} alt="" />
        <span className="ta pd-name">{header.name}</span>
        <span className="ta pd-addr">{header.address}</span>
        {header.phone && <span className="pd-addr">Ph: {header.phone}</span>}
      </div>
    );
  }
  return <FullHeader header={header} />;
}

/** Like the paper template: the hospital name stays on one line, shrinking (down to 18px) if it doesn't fit. */
function FullHeader({ header }: { header: PrintHeaderData }) {
  const nameRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    function fit() {
      const el = nameRef.current;
      if (!el?.parentElement) return;
      el.style.fontSize = '';
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.parentElement.clientWidth && size > 18) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    }
    fit();
    // Measure again once the report fonts have loaded (they change the width).
    document.fonts?.ready.then(fit);
  }, [header.name]);

  return (
    <>
      <header className="pd-hosp">
        <img src={logo} alt="Hospital logo" />
        <div className="pd-hname">
          <span ref={nameRef} className="ta pd-name">
            {header.name}
          </span>
          <span className="ta pd-addr">{header.address}</span>
          {header.phone && <span className="pd-addr">Ph: {header.phone}</span>}
        </div>
        {header.doctors.length > 0 && <div className="pd-vrule" />}
        <div className="pd-docs">
          {header.doctors.map((d, i) => (
            <div key={i}>
              {i > 0 && <hr />}
              <div className="pd-doc">
                <span className="ta dn">{d.name}</span>
                <span className="dd">{d.degree}</span>
                <br />
                <span className="ta dr">{d.role}</span>
              </div>
            </div>
          ))}
        </div>
      </header>
      <div className="pd-rule" />
    </>
  );
}
