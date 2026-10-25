import { cn } from '@platform/ui';
import type { FieldComponentProps } from './types';

export function NumberInput({ config, registration, error, disabled }: FieldComponentProps) {
  return (
    <input
      type="number"
      placeholder={config.placeholder}
      disabled={disabled || config.disabled}
      readOnly={config.readOnly}
      min={config.validation?.min}
      max={config.validation?.max}
      className={cn(
        'flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm tabular-nums text-ink shadow-xs transition-colors',
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
  );
}

