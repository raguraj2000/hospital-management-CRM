import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/** shadcn-style modal (Radix): focus trap, Esc to close, scroll lock. Bottom sheet on phones. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] data-[state=open]:animate-in" />
        <D.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-border bg-surface p-6 shadow-xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <div className="mb-5 pr-8">
            <D.Title className="text-lg font-semibold tracking-tight">{title}</D.Title>
            <D.Description className={description ? 'mt-1 text-sm text-muted' : 'sr-only'}>{description ?? title}</D.Description>
          </div>
          <D.Close className="absolute top-4 right-4 rounded-md p-1 text-muted transition-colors hover:bg-subtle hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </D.Close>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
