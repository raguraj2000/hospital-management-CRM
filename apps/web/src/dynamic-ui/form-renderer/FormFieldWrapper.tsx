import type { ReactNode } from 'react';
import { cn } from '@platform/ui';
import type { FieldConfig } from '../config-validation/schemas';

interface FormFieldWrapperProps {
  config: FieldConfig;
  error?: string;
  children: ReactNode;
}

export function FormFieldWrapper({ config, error, children }: FormFieldWrapperProps) {
  // Checkbox renders its own label inline
  if (config.type === 'checkbox') {
    return (
      <div className={cn('flex flex-col gap-1', getColSpanClass(config.colSpan))}>
        {children}
        {error && <span className="text-xs font-medium text-critical">{error}</span>}
        {config.helpText && <span className="text-xs text-muted">{config.helpText}</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', getColSpanClass(config.colSpan))}>
      <label className="text-xs font-medium text-ink flex items-center gap-1">
        {config.label}
        {config.validation?.required && (
          <span className="text-critical text-sm leading-none" title="Required">*</span>
        )}
      </label>
      {children}
      {error && <span className="text-xs font-medium text-critical">{error}</span>}
      {config.helpText && !error && (
        <span className="text-xs text-muted">{config.helpText}</span>
      )}
    </div>
  );
}

function getColSpanClass(colSpan: number = 12): string {
  switch (colSpan) {
    case 1:
      return 'col-span-12 md:col-span-1';
    case 2:
      return 'col-span-12 md:col-span-2';
    case 3:
      return 'col-span-12 md:col-span-3';
    case 4:
      return 'col-span-12 md:col-span-4';
    case 6:
      return 'col-span-12 md:col-span-6';
    case 8:
      return 'col-span-12 md:col-span-8';
    case 9:
      return 'col-span-12 md:col-span-9';
    default:
      return 'col-span-12';
  }
}

