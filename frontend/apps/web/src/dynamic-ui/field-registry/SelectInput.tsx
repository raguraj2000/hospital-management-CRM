import { cn } from '@platform/ui';
import type { FieldComponentProps } from './types';

export function SelectInput({ config, registration, error, disabled }: FieldComponentProps) {
  return (
    <select
      disabled={disabled || config.disabled}
      className={cn(
        'flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink shadow-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-critical focus-visible:ring-critical',
      )}
      {...registration}
    >
      <option value="">{config.placeholder ?? 'Select an option...'}</option>
      {config.options?.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

