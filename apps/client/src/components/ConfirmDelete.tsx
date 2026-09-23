import { useState } from 'react';
import { describeError } from '../api/client.js';

const CONFIRM_WORD = 'Delete';

/**
 * The one delete confirmation used everywhere in the app: click Delete, type
 * the word "Delete", then the real Delete button turns on. Nothing is removed
 * on a single mis-click, and every delete in the app asks the same way, so
 * staff learn it once.
 *
 * `onDelete` should do the actual API call and throw on failure -- the error
 * is shown inline and the panel stays open so the work isn't lost.
 */
export function ConfirmDelete({
  what,
  triggerLabel = 'Delete',
  onDelete,
  onDeleted,
  disabled,
  triggerClassName = 'btn-text',
  align = 'left',
}: {
  what: string;
  triggerLabel?: string;
  onDelete: () => Promise<void>;
  onDeleted?: () => void;
  disabled?: boolean;
  triggerClassName?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim() === CONFIRM_WORD;

  function close() {
    setOpen(false);
    setTyped('');
    setError(null);
  }

  async function confirm() {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      close();
      onDeleted?.();
    } catch (err) {
      setError(describeError(err, `delete this ${what}`));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)} disabled={disabled}>
        {triggerLabel}
      </button>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        gap: 6,
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--color-critical)' }}>
        Type <strong>{CONFIRM_WORD}</strong> to remove this {what}:
      </span>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={CONFIRM_WORD}
        autoFocus
        style={{ width: 90 }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            confirm();
          }
          if (e.key === 'Escape') close();
        }}
      />
      <button
        type="button"
        className="btn-text"
        onClick={confirm}
        disabled={!matches || busy}
        style={{ color: matches ? 'var(--color-critical)' : undefined }}
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
      <button type="button" className="btn-text" onClick={close} disabled={busy}>
        Cancel
      </button>
      {error && (
        <span className="login-error" style={{ margin: 0, width: '100%' }}>
          {error}
        </span>
      )}
    </span>
  );
}
