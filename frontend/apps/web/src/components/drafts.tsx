// What is typed in a long form is kept on this computer (localStorage) until it is saved: a click outside
// the window, a wrong key or a closed tab no longer loses it. Kept for a while only, and cleared at sign-out.
import { useState } from 'react';
import { Button } from '@platform/ui';

const PREFIX = 'hms-draft:';
const ON_KEY = 'hms-drafts-on';
/** A draft older than this is old work, not a slip: it is dropped. */
const KEEP_MS = 12 * 60 * 60 * 1000;

export interface Draft<T> {
  at: number;
  values: T;
}

export function draftsOn(): boolean {
  try {
    return localStorage.getItem(ON_KEY) !== '0';
  } catch {
    return false;
  }
}

function setDraftsOn(on: boolean) {
  try {
    localStorage.setItem(ON_KEY, on ? '1' : '0');
  } catch {
    /* private window */
  }
}

export function readDraft<T>(key: string): Draft<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft<T>;
    if (!d || typeof d.at !== 'number' || Date.now() - d.at > KEEP_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, values: unknown) {
  if (!draftsOn()) return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), values }));
  } catch {
    /* full or blocked: the form still works, only without a draft */
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* private window */
  }
}

/** Sign-out: the next person on this computer must not see what was typed. */
export function clearAllDrafts() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    /* private window */
  }
}

/** On top of a form: the draft switch, when the draft was brought back, and a button to start empty. */
export function DraftBar({ restoredAt, onClear }: { restoredAt: number | null; onClear: () => void }) {
  const [on, setOn] = useState(draftsOn);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-subtle/50 px-3 py-2 text-sm">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          role="switch"
          className="size-4 accent-[var(--color-primary)]"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
            setDraftsOn(e.target.checked);
            if (!e.target.checked) clearAllDrafts(); // off: nothing typed stays on this computer
          }}
        />
        <span className="font-medium">Auto-save while typing</span>
      </label>
      <span className="flex items-center gap-2 text-xs text-muted">
        {restoredAt != null ? `Brought back what was typed at ${new Date(restoredAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : on ? 'Kept on this computer until you save' : 'Off: closing the window loses what is typed'}
        {restoredAt != null && (
          <Button type="button" size="sm" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        )}
      </span>
    </div>
  );
}
