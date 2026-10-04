import type { HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TdHTMLAttributes, TextareaHTMLAttributes, ThHTMLAttributes } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from './utils.js';

// ---------- Layout ----------

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]', className)} {...props} />;
}

export function CardHeader({ title, description, icon: Icon, iconTone = 'brand', action, className }: { title: ReactNode; description?: ReactNode; icon?: LucideIcon; iconTone?: Tone; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-border px-4 py-3', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <IconChip icon={Icon} tone={iconTone} />}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          {description && <div className="truncate text-xs text-muted">{description}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn('h-px w-full bg-border', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-subtle', className)} />;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-subtle text-muted">
        <Icon className="size-5" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------- Form controls ----------

const control =
  'w-full rounded-lg border border-border bg-surface px-3 text-sm shadow-[var(--shadow-card)] outline-none transition-colors placeholder:text-muted/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50 aria-[invalid=true]:border-critical aria-[invalid=true]:ring-critical/20';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-9', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-16 py-2', className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, 'h-9 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2716%27%20height=%2716%27%20fill=%27none%27%20stroke=%27%2371717a%27%20stroke-width=%272%27%3E%3Cpath%20d=%27m4%206%204%204%204-4%27/%3E%3C/svg%3E")] bg-[position:right_0.6rem_center] bg-no-repeat pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-medium leading-none', className)} {...props} />;
}

/** Label + control + hint/error: the one way every form field is laid out. */
export function Field({ label, htmlFor, error, hint, children, className }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-critical">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

// ---------- Small display pieces ----------

export type Tone = 'neutral' | 'brand' | 'positive' | 'warning' | 'critical' | 'violet';

const softTones: Record<Tone, string> = {
  neutral: 'bg-subtle text-muted',
  brand: 'bg-brand-soft text-brand',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  critical: 'bg-critical-soft text-critical',
  violet: 'bg-violet-soft text-violet',
};

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', softTones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function IconChip({ icon: Icon, tone = 'brand', className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', softTones[tone], className)}>
      <Icon className="size-4" />
    </span>
  );
}

const avatarTones = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700'];

/** Initials avatar; the colour is stable per name. */
export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const sizes = { sm: 'size-7 text-[11px]', md: 'size-8 text-xs', lg: 'size-14 text-lg' };
  return <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold dark:opacity-90', avatarTones[h % avatarTones.length], sizes[size], className)}>{initials || '?'}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-border bg-subtle px-1.5 font-sans text-[10px] font-medium text-muted">{children}</kbd>;
}

/** KPI tile in the style of the dashboard references: icon chip, label, big number, footnote, optional action. */
export function StatCard({ icon, tone = 'brand', label, value, footnote, action, loading }: { icon: LucideIcon; tone?: Tone; label: string; value: ReactNode; footnote?: ReactNode; action?: ReactNode; loading?: boolean }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <IconChip icon={icon} tone={tone} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex flex-1 items-end justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}</div>}
          {footnote && <div className="mt-1 text-xs text-muted">{footnote}</div>}
        </div>
        {action}
      </div>
    </Card>
  );
}

// ---------- Table (shadcn data-table look) ----------

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}
export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-subtle/60 [&_tr]:border-b [&_tr]:border-border" {...props} />;
}
export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}
/** Things inside a row that have their own click; pressing them never opens the row. */
const ROW_CONTROLS = 'a, button, input, select, textarea, label, summary, [role="button"], [role="menuitem"], [role="checkbox"], [data-no-row-open]';

/**
 * A table row. Only rows that open a record get `onOpen`: then the whole row is clickable
 * (pointer, hover background, a chevron cell at the end -- add an empty <TH /> for it).
 * Keep a real link in the row for keyboard and "open in new tab".
 */
export function TR({ className, onOpen, onClick, children, ...props }: HTMLAttributes<HTMLTableRowElement> & { onOpen?: () => void }) {
  if (!onOpen) {
    return (
      <tr className={cn('border-b border-border', className)} onClick={onClick} {...props}>
        {children}
      </tr>
    );
  }
  return (
    <tr
      className={cn('group h-11 cursor-pointer border-b border-border transition-colors hover:bg-subtle active:bg-subtle', className)}
      onClick={(e) => {
        onClick?.(e);
        const target = e.target as Element;
        // Dialogs and menus opened from the row are portals: React bubbles their clicks here, the DOM does not contain them.
        if (e.defaultPrevented || !e.currentTarget.contains(target)) return;
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        if (target.closest(ROW_CONTROLS)) return;
        if (window.getSelection()?.toString()) return; // the user was selecting text
        onOpen();
      }}
      {...props}
    >
      {children}
      {/* Sticky, so the arrow stays in view when a wide table scrolls sideways on a phone. */}
      <td aria-hidden className="sticky right-0 w-10 bg-surface pr-3 pl-1 align-middle transition-colors group-hover:bg-subtle group-active:bg-subtle">
        <ChevronRight className="ml-auto size-5 text-muted group-hover:text-ink" />
      </td>
    </tr>
  );
}
export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('h-10 px-4 text-left align-middle text-xs font-medium whitespace-nowrap text-muted', className)} {...props} />;
}
export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}
