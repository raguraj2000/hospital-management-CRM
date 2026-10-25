// Dates on printed papers: always India time, day first, with the time where the moment matters
// (a bill, a payment, a sample, a report). Stored in the database as UTC; shown here as IST.
const IST = 'Asia/Kolkata';

/** A plain calendar date (YYYY-MM-DD), e.g. an expiry: 09/11/2027 */
export const printDay = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** A moment (UTC ISO): 07/10/2026, 12:45 pm */
export const printDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-GB', { timeZone: IST, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '';

/** Rupees with two decimals, without the sign: 1,250.00 is printed as 1250.00 */
export const printMoney = (paise: number) => (paise / 100).toFixed(2);
