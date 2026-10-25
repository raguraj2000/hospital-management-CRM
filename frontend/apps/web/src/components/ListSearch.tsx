import { Search, X } from 'lucide-react';
import { cn, Input } from '@platform/ui';

/** The search box over a list: type to narrow it; the × clears it. */
export function ListSearch({ value, onChange, placeholder, label, className }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; className?: string }) {
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <Input type="search" aria-label={label} placeholder={placeholder} className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" aria-label="Clear the search" className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted hover:text-ink" onClick={() => onChange('')}>
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Does a row match what was typed? Every word in the same field (any order, any case): "ravi 02" finds
 * "Ravi Kumar 02", not anyone whose OP number has a 02. Digits alone also match a phone written with spaces.
 */
export function textMatch(q: string, ...fields: (string | number | null | undefined)[]) {
  const typed = q.trim().toLowerCase();
  const words = typed.split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fields.filter((f) => f != null && f !== '').map((f) => String(f).toLowerCase());
  if (hay.some((h) => words.every((w) => h.includes(w)))) return true;
  const digits = typed.replace(/[\s+-]/g, '');
  return /^\d{3,}$/.test(digits) && hay.some((h) => h.replace(/\D/g, '').includes(digits));
}
