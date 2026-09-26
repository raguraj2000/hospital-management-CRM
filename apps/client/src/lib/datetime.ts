/** "2026-09-24 13:14:05" -> "24/09/2026 01:14 PM" (the hospital's paper format). Dates without a time stay dd/mm/yyyy. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return value;
  const date = `${m[3]}/${m[2]}/${m[1]}`;
  if (!m[4]) return date;
  const h = Number(m[4]);
  return `${date} ${String(h % 12 || 12).padStart(2, '0')}:${m[5]} ${h >= 12 ? 'PM' : 'AM'}`;
}
