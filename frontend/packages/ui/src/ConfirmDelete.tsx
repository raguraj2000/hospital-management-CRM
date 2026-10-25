import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from './button.js';
import { Dialog } from './dialog.js';
import { Input, Label } from './primitives.js';

/** The word every delete must be confirmed with. Exact match, capital D. */
export const CONFIRM_WORD = 'Delete';

/**
 * Every destructive action goes through this: the button stays locked until
 * the user types exactly "Delete" (case-sensitive).
 */
export function ConfirmDelete({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  pending?: boolean;
  error?: string | null;
}) {
  const [typed, setTyped] = useState('');
  const ok = typed.trim() === CONFIRM_WORD;
  const close = (o: boolean) => {
    if (!o) setTyped('');
    onOpenChange(o);
  };
  return (
    <Dialog open={open} onOpenChange={close} title={title}>
      <div className="mb-5 flex gap-3 rounded-lg border border-critical/20 bg-critical-soft p-3 text-sm text-critical">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <p>{description}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ok && !pending) onConfirm();
        }}
        className="flex flex-col gap-2"
      >
        <Label htmlFor="confirm-delete">
          Type <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-xs font-semibold">{CONFIRM_WORD}</span> to confirm
        </Label>
        <Input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus placeholder={CONFIRM_WORD} />
        {error && <p className="text-sm text-critical">{error}</p>}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!ok || pending}>
            {pending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
