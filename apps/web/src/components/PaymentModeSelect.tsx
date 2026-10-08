import type { SelectHTMLAttributes } from 'react';
import { BILL_PAYMENT_MODES, type BillPaymentMode } from '@platform/shared';
import { NativeSelect } from '@platform/ui';
import { modeLabel } from './format';

/** "Paid by": cash, UPI or card. The same choice at every counter. */
export function PaymentModeSelect({ value, onChange, ...props }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> & { value: BillPaymentMode; onChange: (mode: BillPaymentMode) => void }) {
  return (
    <NativeSelect value={value} onChange={(e) => onChange(e.target.value as BillPaymentMode)} {...props}>
      {BILL_PAYMENT_MODES.map((m) => (
        <option key={m} value={m}>
          {modeLabel[m]}
        </option>
      ))}
    </NativeSelect>
  );
}
