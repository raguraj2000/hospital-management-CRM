import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@platform/ui';

export interface FilterItem {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select';
  placeholder?: string;
  options?: { label: string; value: string | number }[];
}

export interface DynamicFilterBarProps {
  filters: FilterItem[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset?: () => void;
  className?: string;
}

export function DynamicFilterBar({
  filters,
  values,
  onChange,
  onReset,
  className,
}: DynamicFilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 bg-surface p-3 rounded-lg border border-border shadow-2xs ${className ?? ''}`}>
      {filters.map((f) => {
        if (f.type === 'text') {
          return (
            <div key={f.key} className="relative min-w-[200px] flex-1">
              <Search className="size-4 absolute left-3 top-2.5 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder={f.placeholder ?? f.label}
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          );
        }

        if (f.type === 'date') {
          return (
            <div key={f.key} className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted whitespace-nowrap">{f.label}:</span>
              <input
                type="date"
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-2.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary tabular-nums"
              />
            </div>
          );
        }

        if (f.type === 'select') {
          return (
            <div key={f.key} className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted whitespace-nowrap">{f.label}:</span>
              <select
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-2.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <option value="">{f.placeholder ?? 'All'}</option>
                {f.options?.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        return null;
      })}

      {onReset && (
        <Button
          type="button"
          variant="ghost"
          onClick={onReset}
          className="h-9 px-2.5 text-xs text-muted hover:text-ink gap-1 ml-auto"
          title="Reset filters"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}

