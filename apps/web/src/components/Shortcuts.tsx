// Keyboard shortcuts. One listener for the whole app:
//  - a screen marks a button, link or box with data-shortcut="alt+s"; Alt+S then presses or focuses it;
//  - Alt+1 … Alt+9 open the pages of the side menu, Alt+N registers a new patient;
//  - "/" jumps to the patient search and "?" shows this list (only while nothing is being typed).
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Dialog } from '@platform/ui';

/** The list shown with "?". Keep it in step with the data-shortcut marks on the screens. */
const HELP: { where: string; keys: [string, string][] }[] = [
  {
    where: 'Everywhere',
    keys: [
      ['/', 'Search patients'],
      ['Alt + 1 … 9', 'Open a page of the side menu (the number is shown next to it)'],
      ['Alt + N', 'Register a new patient'],
      ['Esc', 'Close a window'],
      ['?', 'Show this list'],
    ],
  },
  {
    where: 'OP visits',
    keys: [
      ['Alt + V', 'Search a patient to start an OP visit'],
      ['Alt + C', 'Call the next patient in'],
    ],
  },
  {
    where: 'A visit (doctor)',
    keys: [
      ['Alt + C', 'Start the consultation'],
      ['Alt + M', 'Add a medicine'],
      ['Alt + L', 'Send to lab'],
      ['Alt + S', 'Send to pharmacy & billing'],
    ],
  },
  {
    where: 'Pharmacy · direct sale',
    keys: [
      ['Alt + M', 'Search a medicine to add'],
      ['Alt + R', 'Add what the patient bought last time'],
      ['Alt + S', 'Sell'],
    ],
  },
  { where: 'Lab results', keys: [['Alt + S', 'Save & complete']] },
  { where: 'Billing and pharmacy checkout', keys: [['Enter', 'In the amount box: collect the payment']] },
];

/** The key written on a button, so a new person learns it without opening the list: <KeyHint>Alt+S</KeyHint>. Not on phones. */
export function KeyHint({ children }: { children: string }) {
  return <span className="ml-1 hidden rounded border border-current/30 px-1 py-px text-[10px] leading-none font-normal whitespace-nowrap opacity-75 md:inline">{children}</span>;
}

export function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-border bg-subtle px-1.5 py-0.5 font-sans text-[11px] font-medium whitespace-nowrap text-muted">{children}</kbd>;
}

/** `pages`: where Alt+1 … Alt+9 go, in menu order. `newPatientPath`: where Alt+N goes (not given = not allowed). */
export function Shortcuts({ pages, newPatientPath, help, onHelp }: { pages: string[]; newPatientPath?: string; help: boolean; onHelp: (open: boolean) => void }) {
  const navigate = useNavigate();
  const now = useRef({ pages, newPatientPath });
  now.current = { pages, newPatientPath };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      // With a window open, only what is inside it can be reached.
      const dialog = document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
      if (e.altKey) {
        const key = /^Digit\d$/.test(e.code) ? e.code.slice(5) : /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : null;
        if (!key) return;
        const marked = [...(dialog ?? document).querySelectorAll<HTMLElement>(`[data-shortcut="alt+${key}"]`)].find((el) => el.offsetParent !== null);
        if (marked) {
          e.preventDefault();
          const el = marked.matches('input, textarea, select, button, a') ? marked : (marked.querySelector<HTMLElement>('input, button') ?? marked);
          if (el.matches('input, textarea, select')) {
            el.focus();
            (el as HTMLInputElement).select?.();
          } else if (!(el as HTMLButtonElement).disabled) el.click();
          return;
        }
        if (dialog) return;
        const page = /^[1-9]$/.test(key) ? now.current.pages[Number(key) - 1] : key === 'n' ? now.current.newPatientPath : undefined;
        if (page != null) {
          e.preventDefault();
          navigate(page);
        }
        return;
      }
      if (dialog || (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable="true"]')) return;
      const help = e.key === '?' || (e.key === '/' && e.shiftKey);
      if (e.key === '/' && !help) {
        const box = [...document.querySelectorAll<HTMLInputElement>('[data-shortcut="/"]')].find((el) => el.offsetParent !== null);
        if (box) {
          e.preventDefault();
          box.focus();
        }
      } else if (help) {
        e.preventDefault();
        onHelp(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, onHelp]);

  return (
    <Dialog wide open={help} onOpenChange={onHelp} title="Keyboard shortcuts" description="Press ? on any screen to see this list.">
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {HELP.map((g) => (
          <div key={g.where}>
            <div className="mb-1.5 text-sm font-semibold">{g.where}</div>
            <dl className="space-y-1.5 text-sm">
              {g.keys.map(([k, what]) => (
                <div key={k} className="flex items-start justify-between gap-3">
                  <dd className="text-muted">{what}</dd>
                  <dt className="shrink-0">
                    <Kbd>{k}</Kbd>
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
