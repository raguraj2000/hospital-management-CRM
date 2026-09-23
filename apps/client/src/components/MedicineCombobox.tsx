import { useEffect, useRef, useState } from 'react';

export interface MedicineComboboxOption {
  id: number;
  name: string;
  medical_code?: string | null;
  base_unit?: string;
  total_remaining?: number;
}

function describeOption(m: MedicineComboboxOption): string {
  const parts = [m.name];
  if (m.medical_code) parts.push(m.medical_code);
  if (m.total_remaining !== undefined) parts.push(`${m.total_remaining} ${m.base_unit ?? ''}`.trim());
  return parts.join(' | ');
}

/**
 * A searchable medicine picker: type to filter by name or batch code, or
 * click to browse the full list like a plain dropdown. Used everywhere a
 * medicine has to be picked one at a time (prescription lines, receive
 * stock) -- a plain <select> becomes unusable once a clinic has more than a
 * couple dozen medicines to scroll through.
 */
export function MedicineCombobox({
  medicines,
  value,
  onChange,
  placeholder,
}: {
  medicines: MedicineComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = medicines.find((m) => String(m.id) === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? medicines.filter((m) => {
        const q = query.trim().toLowerCase();
        return m.name.toLowerCase().includes(q) || (m.medical_code ?? '').toLowerCase().includes(q);
      })
    : medicines;

  function selectMedicine(m: MedicineComboboxOption) {
    onChange(String(m.id));
    setQuery('');
    setOpen(false);
  }

  const displayValue = open ? query : selected ? describeOption(selected) : '';

  return (
    <div ref={containerRef} className="combobox">
      <input
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange('');
        }}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        placeholder={placeholder ?? 'Search by name or batch code…'}
        autoComplete="off"
      />
      {open && (
        <div className="combobox-list">
          {filtered.length === 0 && <div className="combobox-empty">No medicines match.</div>}
          {filtered.map((m) => (
            <button type="button" key={m.id} className="combobox-option" onClick={() => selectMedicine(m)}>
              <span className="combobox-option-name">{m.name}</span>
              <span className="combobox-option-meta">
                {m.medical_code && <span className="combobox-option-code">{m.medical_code}</span>}
                {m.total_remaining !== undefined && (
                  <span className="combobox-option-balance">
                    {m.total_remaining} {m.base_unit ?? ''} left
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
