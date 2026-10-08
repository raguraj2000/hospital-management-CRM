// On-screen dates (India format) and the status colours / words used on more than one screen.
// Printed papers use printFormat.ts (dd/mm/yyyy with the time).
import type { LabOrder, OpBill } from '@platform/shared';
import type { Tone } from '@platform/ui';

const DAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
/** "2026-10-07" (a local day) -> "7 Oct 2026". */
export const fmtDay = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', DAY);
/** A UTC timestamp -> "7 Oct 2026" in India time. */
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { ...DAY, timeZone: 'Asia/Kolkata' });
/** A UTC timestamp -> "7 Oct 2026, 6:31 pm" in India time. */
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
/** A UTC timestamp -> "6:31 pm" in India time. */
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export const billTone: Record<OpBill['status'], Tone> = { unpaid: 'warning', part_paid: 'brand', paid: 'positive' };
export const billLabel: Record<OpBill['status'], string> = { unpaid: 'Unpaid', part_paid: 'Part paid', paid: 'Paid' };

export const labTone: Record<LabOrder['status'], Tone> = { ordered: 'warning', sample_collected: 'brand', completed: 'positive', cancelled: 'neutral' };
/** As the doctor and the front desk read it. */
export const labLabel: Record<LabOrder['status'], string> = { ordered: 'Ordered', sample_collected: 'Sample collected', completed: 'Result ready', cancelled: 'Cancelled' };

export const modeLabel = { cash: 'Cash', upi: 'UPI', card: 'Card' } as const;
