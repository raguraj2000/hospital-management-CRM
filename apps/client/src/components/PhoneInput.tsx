import { toIndianDigits } from '../lib/phone.js';

/** Phone number field with a fixed "+91" prefix -- every patient here is an
 * Indian mobile number, so staff only ever type the 10-digit number. */
export function PhoneInput({
  value,
  onChange,
  id,
  required,
}: {
  value: string;
  onChange: (digits: string) => void;
  id?: string;
  required?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          border: '1px solid var(--color-border)',
          borderRight: 'none',
          borderRadius: 'var(--radius) 0 0 var(--radius)',
          background: 'var(--color-paper)',
          color: 'var(--color-ink-soft)',
          fontSize: 14,
        }}
      >
        +91
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(toIndianDigits(e.target.value))}
        placeholder="10-digit mobile number"
        required={required}
        style={{ borderRadius: '0 var(--radius) var(--radius) 0', flex: 1 }}
      />
    </div>
  );
}
