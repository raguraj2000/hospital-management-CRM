import type { ReactNode } from 'react';
import { Button } from './button.js';
import { Dialog } from './dialog.js';
import { cn } from './utils.js';

/**
 * One-click choices as a row of pills. The caller says which are on and what a click does,
 * so the same row works for "pick one" (instructions), "pick many" (conditions) and "fill the box" (suggestions).
 */
export function Chips<T extends string>({
  options,
  isOn,
  onPick,
  label,
  disabled,
  className,
  ...aria
}: {
  options: readonly T[];
  isOn: (option: T) => boolean;
  onPick: (option: T) => void;
  /** Text for each pill; default = the option itself. */
  label?: (option: T) => ReactNode;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  if (!options.length) return null;
  return (
    <div role="group" className={cn('flex flex-wrap gap-1.5', className)} {...aria}>
      {options.map((o) => {
        const on = isOn(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onPick(o)}
            className={cn(
              'min-h-8 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50',
              on ? 'border-primary bg-primary font-medium text-primary-foreground' : 'border-border bg-surface hover:bg-subtle',
            )}
          >
            {label ? label(o) : o}
          </button>
        );
      })}
    </div>
  );
}

/** "Are you sure?" for actions that are not deletes (those go through ConfirmDelete). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  onConfirm,
  pending,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: ReactNode;
  cancelLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  /** Extra content between the description and the buttons (e.g. the values to check). */
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {children}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button
          disabled={pending}
          onClick={() => {
            onOpenChange(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
