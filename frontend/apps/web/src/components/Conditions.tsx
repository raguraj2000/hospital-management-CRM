// The patient's long-term conditions (Diabetes, Hypertension …): entered on the patient, shown wherever the patient is seen.
import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { COMMON_CONDITIONS, splitConditions } from '@platform/shared';
import { Badge, Button, Chips, cn, Input } from '@platform/ui';

/** Red labels, one per condition. Nothing at all for a patient without any. */
export function ConditionBadges({ conditions, className }: { conditions: string | null | undefined; className?: string }) {
  const list = splitConditions(conditions);
  if (!list.length) return null;
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)} aria-label="Long-term conditions">
      {list.map((c) => (
        <Badge key={c} tone="critical" className="font-semibold">
          <HeartPulse className="size-3.5" /> {c}
        </Badge>
      ))}
    </span>
  );
}

/** Tick the common ones, type any other. The value is the comma-separated text the patient record stores. */
export function ConditionsPicker({ value, onChange }: { value: string; onChange: (conditions: string) => void }) {
  const [other, setOther] = useState('');
  const chosen = splitConditions(value);
  const has = (c: string) => chosen.some((x) => x.toLowerCase() === c.toLowerCase());
  const toggle = (c: string) => onChange((has(c) ? chosen.filter((x) => x.toLowerCase() !== c.toLowerCase()) : [...chosen, c]).join(', '));
  // The common ones, then whatever else this patient has (typed earlier).
  const options = [...COMMON_CONDITIONS, ...chosen.filter((c) => !COMMON_CONDITIONS.some((k) => k.toLowerCase() === c.toLowerCase()))];
  const addOther = () => {
    const name = other.replace(/,/g, ' ').trim();
    if (name && !has(name)) toggle(name);
    setOther('');
  };

  return (
    <div>
      <Chips aria-label="Long-term conditions" options={options} isOn={has} onPick={toggle} />
      <div className="mt-2 flex gap-2">
        <Input
          aria-label="Other condition"
          placeholder="Other condition — type and press Add"
          value={other}
          maxLength={60}
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault(); // not the patient form's submit
            addOther();
          }}
        />
        <Button type="button" variant="outline" disabled={!other.trim()} onClick={addOther}>
          Add
        </Button>
      </div>
    </div>
  );
}
