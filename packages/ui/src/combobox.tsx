import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from './utils.js';

const MAX_SHOWN = 50;

/**
 * Type-to-search dropdown: one box to search and pick from a long list (medicines, patients, vendors…).
 * Keyboard: type to filter, ↑/↓ to move, Enter to pick, Esc to close.
 */
export function Combobox<T>({
  options,
  value,
  onChange,
  getKey,
  getLabel,
  getSearchText = getLabel,
  renderOption,
  isDisabled,
  placeholder = 'Search…',
  emptyText = 'Nothing found',
  id,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: {
  options: T[];
  /** Key of the picked option, or null. */
  value: string | number | null;
  onChange: (key: string | number | null, option: T | null) => void;
  getKey: (o: T) => string | number;
  /** Text shown in the box once picked. */
  getLabel: (o: T) => string;
  /** Text the typed words are matched against (defaults to the label). */
  getSearchText?: (o: T) => string;
  /** A richer row for the list (defaults to the label). */
  renderOption?: (o: T) => ReactNode;
  /** Shown but can't be picked (e.g. out of stock). */
  isDisabled?: (o: T) => boolean;
  placeholder?: string;
  emptyText?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const selected = useMemo(() => options.find((o) => getKey(o) === value) ?? null, [options, value, getKey]);

  // Every typed word must appear somewhere in the option's text.
  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const all = words.length ? options.filter((o) => words.every((w) => getSearchText(o).toLowerCase().includes(w))) : options;
    return all.slice(0, MAX_SHOWN);
  }, [options, query, getSearchText]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listId]);

  function pick(o: T) {
    if (isDisabled?.(o)) return;
    onChange(getKey(o), o);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={root} className={cn('relative', className)}>
      <input
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={selected ? getLabel(selected) : placeholder}
        // Closed: show what is picked. Open: show what is being typed.
        value={open ? query : selected ? getLabel(selected) : ''}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (matches.length ? (a + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length : 0));
          } else if (e.key === 'Enter' && open) {
            e.preventDefault(); // pick, don't submit the form
            if (matches[active]) pick(matches[active]);
          } else if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
            setQuery('');
          } else if (e.key === 'Tab') {
            setOpen(false);
            setQuery('');
          }
        }}
        className="h-9 w-full rounded-lg border border-border bg-surface pr-16 pl-3 text-sm shadow-[var(--shadow-card)] outline-none transition-colors placeholder:text-muted/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-[invalid=true]:border-critical aria-[invalid=true]:ring-critical/20"
      />
      <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
        {selected && (
          <button
            type="button"
            aria-label="Clear"
            className="flex size-6 items-center justify-center rounded text-muted hover:bg-subtle hover:text-ink"
            onClick={() => {
              onChange(null, null);
              setQuery('');
            }}
          >
            <X className="size-4" />
          </button>
        )}
        <ChevronsUpDown className="pointer-events-none size-4 text-muted" />
      </div>

      {open && (
        <ul id={listId} role="listbox" className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
          {matches.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">{emptyText}</li>}
          {matches.map((o, i) => {
            const disabled = !!isDisabled?.(o);
            const isSelected = getKey(o) === value;
            return (
              <li
                key={getKey(o)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={disabled}
                // mousedown, not click: the input must not lose focus (and close the list) first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm', i === active && 'bg-subtle', disabled && 'cursor-not-allowed opacity-50')}
              >
                <span className="min-w-0 flex-1">{renderOption ? renderOption(o) : getLabel(o)}</span>
                {isSelected && <Check className="size-4 shrink-0" />}
              </li>
            );
          })}
          {matches.length === MAX_SHOWN && <li className="px-3 py-2 text-xs text-muted">Showing the first {MAX_SHOWN}. Type more to narrow it down.</li>}
        </ul>
      )}
    </div>
  );
}
