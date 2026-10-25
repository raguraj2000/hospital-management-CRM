import { cn } from '@platform/ui';
import type { FieldComponentProps } from './types';

export function CheckboxInput({ config, registration, error, disabled }: FieldComponentProps) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        disabled={disabled || config.disabled}
        className={cn(
          'size-4 rounded border border-border text-primary focus:ring-1 focus:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-critical',
        )}
        {...registration}
      />
      <span className="text-sm font-medium text-ink">{config.label}</span>
    </label>
  );
}

