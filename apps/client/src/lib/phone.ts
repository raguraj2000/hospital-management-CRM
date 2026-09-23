// Every patient phone number in this clinic is an Indian mobile number --
// there's no multi-country need here, so instead of a country-code picker
// nobody would ever change, staff just type the 10-digit number and the
// clinic app takes care of always storing/showing it as +91.

const INDIA_CODE = '+91';

/** Strips everything but digits, then drops a leading 0/91/+91 -- whatever
 * a staff member happened to type -- down to the bare 10-digit number. */
export function toIndianDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length > 10) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Canonical storage/API form: "+91XXXXXXXXXX", or null if empty. */
export function toIndianPhoneValue(raw: string): string | null {
  const digits = toIndianDigits(raw);
  return digits ? `${INDIA_CODE}${digits}` : null;
}

/** Display form: "+91 XXXXXXXXXX", or "—" if there's nothing to show. */
export function formatIndianPhone(raw: string | null | undefined): string {
  if (!raw) return '—';
  const digits = toIndianDigits(raw);
  return digits ? `${INDIA_CODE} ${digits}` : raw;
}
