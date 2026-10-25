// Ctrl+K, or the "New" button at the bottom of the side menu, opens "New OP visit" straight away. Tabs on top of
// that window switch to the other things that start something: Direct lab test, Create bill, Direct sale.
import { ClipboardPlus, FlaskConical, Pill, ReceiptText, type LucideIcon } from 'lucide-react';
import { cn } from '@platform/ui';

export type NewChoice = 'op' | 'lab' | 'bill' | 'sale';
const CHOICES: { key: NewChoice; label: string; icon: LucideIcon }[] = [
  { key: 'op', label: 'OP visit', icon: ClipboardPlus },
  { key: 'lab', label: 'Lab test only', icon: FlaskConical },
  { key: 'bill', label: 'Bill only', icon: ReceiptText },
  { key: 'sale', label: 'Direct sale', icon: Pill },
];

/** What the window offers, and how to switch. */
export interface NewTabsProps {
  allowed: NewChoice[];
  onPick: (c: NewChoice) => void;
}

/** The tab row on top of the New windows. Only what the role may do; nothing when there is just one. */
export function NewTabs({ value, allowed, onPick }: NewTabsProps & { value: NewChoice }) {
  const shown = CHOICES.filter((c) => allowed.includes(c.key));
  if (shown.length < 2) return null;
  return (
    <div role="tablist" aria-label="What to start" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1 sm:grid-cols-4">
      {shown.map((c) => (
        <button
          key={c.key}
          type="button"
          role="tab"
          aria-selected={c.key === value}
          onClick={() => c.key !== value && onPick(c.key)}
          className={cn(
            'flex h-10 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition-colors',
            c.key === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          <c.icon className="size-4" /> {c.label}
        </button>
      ))}
    </div>
  );
}
