// Settings > Branch settings: one thing at a time. A short list of sections on the left (chips on a phone), the
// chosen one on the right, so nobody has to read five boxes to change one price.
import type { ComponentType } from 'react';
import { useSearchParams } from 'react-router';
import { BellDot, Image, IndianRupee, ReceiptText, Stethoscope } from 'lucide-react';
import { cn } from '@platform/ui';
import { BranchLogoCard } from './BranchLogo';
import { BillingSettings } from './BillingSettings';
import { DoctorSettings } from './DoctorSettings';

const SECTIONS: { key: string; label: string; hint: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: 'fee', label: 'Consultation fee', hint: 'Standard fee, night fee', icon: IndianRupee },
  { key: 'charges', label: 'Ready-made charges', hint: 'IV set, dressing… with prices', icon: ReceiptText },
  { key: 'doctors', label: 'Doctors', hint: 'Who sees patients here', icon: Stethoscope },
  { key: 'logo', label: 'Logo & print', hint: 'On bills and lab reports', icon: Image },
  { key: 'counts', label: 'Menu counts', hint: 'Numbers on the side menu', icon: BellDot },
];

export function BranchSettings({ branch, branchName }: { branch: string; branchName: string }) {
  const [params, setParams] = useSearchParams();
  const section = SECTIONS.find((x) => x.key === params.get('section'))?.key ?? 'fee';
  const go = (key: string) => {
    const next = new URLSearchParams(params);
    next.set('section', key);
    setParams(next, { replace: true });
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
      <nav aria-label="Branch settings" className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {SECTIONS.map((x) => (
          <button
            key={x.key}
            type="button"
            aria-current={section === x.key ? 'page' : undefined}
            onClick={() => go(x.key)}
            className={cn(
              'flex shrink-0 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors lg:w-full',
              section === x.key ? 'border-brand/40 bg-brand-soft text-brand' : 'border-transparent text-muted hover:bg-subtle hover:text-ink',
            )}
          >
            <x.icon className="size-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold whitespace-nowrap">{x.label}</span>
              <span className="hidden text-xs font-normal text-muted lg:block">{x.hint}</span>
            </span>
          </button>
        ))}
      </nav>
      <div className="min-w-0 max-w-3xl">
        {section === 'fee' && <BillingSettings branch={branch} part="fee" />}
        {section === 'charges' && <BillingSettings branch={branch} part="charges" />}
        {section === 'doctors' && <DoctorSettings branch={branch} branchName={branchName} />}
        {section === 'logo' && <BranchLogoCard branch={branch} branchName={branchName} />}
        {section === 'counts' && <BillingSettings branch={branch} part="counts" />}
      </div>
    </div>
  );
}
