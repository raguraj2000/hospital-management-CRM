import { cn } from '@platform/ui';
import type { FieldComponentProps } from './types';

export function CurrencyInput({ config, registration, error, disabled }: FieldComponentProps) {
  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 text-sm font-medium text-muted">
        ₹
      </span>
      <input
        type="number"
        step="0.01"
        placeholder={config.placeholder ?? '0.00'}
        disabled={disabled || config.disabled}
        readOnly={config.readOnly}
        className={cn(
          'flex h-9 w-full rounded-md border border-border bg-surface pl-7 pr-3 py-1.5 text-sm tabular-nums text-ink shadow-xs transition-colors',
          'placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-critical focus-visible:ring-critical',
        )}
        {...registration}
        onChange={(e) => {
          const val = e.target.value === '' ? undefined : Number(e.target.value);
          registration.onChange({ target: { value: val, name: registration.name } });
        }}
      />
    </div>
  );
}

