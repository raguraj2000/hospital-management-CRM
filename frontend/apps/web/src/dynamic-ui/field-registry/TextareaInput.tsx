import { cn } from '@platform/ui';
import type { FieldComponentProps } from './types';

export function TextareaInput({ config, registration, error, disabled }: FieldComponentProps) {
  return (
    <textarea
      placeholder={config.placeholder}
      disabled={disabled || config.disabled}
      readOnly={config.readOnly}
      rows={3}
      className={cn(
        'flex min-h-[70px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink shadow-xs transition-colors',
        'placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-critical focus-visible:ring-critical',
      )}
      {...registration}
    />
  );
}

