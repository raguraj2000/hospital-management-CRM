/** Rupee formatting/parsing shared by the inventory and invoice screens. */

export function formatRupees(cents: number): string {
  return `₹${(cents / 100).toFixed(2)}`;
}

/** "120.50" -> 12050. Anything unparseable is 0, never NaN. */
export function rupeesToCents(value: string): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function centsToRupees(cents: number): string {
  return (cents / 100).toFixed(2);
}
