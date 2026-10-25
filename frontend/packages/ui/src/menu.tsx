import { DropdownMenu as DM, Tabs as T } from 'radix-ui';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './utils.js';

// ---------- Dropdown menu (shadcn look) ----------

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({ children, align = 'start', side, className }: { children: ReactNode; align?: 'start' | 'end' | 'center'; side?: 'top' | 'bottom' | 'right' | 'left'; className?: string }) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        side={side}
        sideOffset={6}
        className={cn('z-50 min-w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 text-sm text-ink shadow-lg', className)}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  );
}

export function MenuItem({ children, onSelect, destructive, className }: { children: ReactNode; onSelect?: () => void; destructive?: boolean; className?: string }) {
  return (
    <DM.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none select-none data-[highlighted]:bg-subtle [&_svg]:size-4 [&_svg]:text-muted',
        destructive && 'text-critical [&_svg]:text-critical',
        className,
      )}
    >
      {children}
    </DM.Item>
  );
}

export function MenuCheckItem({ children, checked, onSelect }: { children: ReactNode; checked: boolean; onSelect: () => void }) {
  return (
    <DM.Item onSelect={onSelect} className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none select-none data-[highlighted]:bg-subtle [&_svg]:size-4">
      <span className="flex size-4 items-center justify-center">{checked && <Check className="text-ink" />}</span>
      {children}
    </DM.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DM.Label className="px-2 py-1.5 text-xs font-medium text-muted">{children}</DM.Label>;
}

export function MenuSeparator() {
  return <DM.Separator className="-mx-1 my-1 h-px bg-border" />;
}

// ---------- Tabs (shadcn look) ----------

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <T.List className={cn('inline-flex h-9 items-center gap-1 rounded-lg bg-subtle p-1 text-muted', className)}>{children}</T.List>;
}

export function TabsTrigger({ value, children, disabled, className }: { value: string; children: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <T.Trigger
      value={value}
      disabled={disabled}
      className={cn('inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all disabled:opacity-50 data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm', className)}
    >
      {children}
    </T.Trigger>
  );
}
