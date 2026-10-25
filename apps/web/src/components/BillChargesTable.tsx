import { billCharges, ROUND_OFF_LINE, type OpBill } from '@platform/shared';
import { printMoney } from './printFormat';

type Bill = Pick<OpBill, 'consultationFeePaise' | 'lines' | 'otherChargesPaise' | 'otherChargesLabel' | 'discountPaise' | 'totalPaise'>;

/**
 * The charges of one or more OP bills on paper, in groups: Consultation, Lab tests, Other charges (only the
 * groups that have something), then Sub-total, Discount, Round off and the total.
 */
export function BillChargesTable({ bills, totalLabel }: { bills: Bill[]; totalLabel: string }) {
  const consultation: [string, number][] = [];
  const lab: [string, number][] = [];
  const other: [string, number][] = [];
  let roundOffPaise = 0;
  for (const b of bills) {
    if (b.consultationFeePaise > 0) consultation.push(['Consultation fee', b.consultationFeePaise]); // no fee (lab only, bill only): no line
    for (const l of b.lines) if (l.labOrderId != null) lab.push([l.description, l.amountPaise]);
    for (const x of billCharges(b)) {
      if (x.description === ROUND_OFF_LINE) roundOffPaise += x.amountPaise; // not a charge: its own row after the discount
      else other.push([x.description, x.amountPaise]);
    }
  }
  const discountPaise = bills.reduce((s, b) => s + b.discountPaise, 0);
  const groups = [
    ['Consultation', consultation],
    ['Lab tests', lab],
    ['Other charges', other],
  ] as const;
  const subTotal = [...consultation, ...lab, ...other].reduce((s, [, a]) => s + a, 0);
  // Numbered on through the groups: 1, 2, 3...
  const firstNo = (g: number) => groups.slice(0, g).reduce((s, [, rows]) => s + rows.length, 1);

  return (
    <table className="mb-4 w-full border-collapse">
      <thead>
        <tr className="border-y border-[#111]">
          <th className="w-10 py-1.5 text-left">#</th>
          <th className="py-1.5 text-left">Description</th>
          <th className="py-1.5 text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {groups.map(
          ([title, rows], g) =>
            rows.length > 0 && [
              <tr key={title}>
                <td />
                <td colSpan={2} className="pt-2 pb-0.5 text-[12px] font-bold uppercase tracking-wide">
                  {title}
                </td>
              </tr>,
              ...rows.map(([d, a], i) => (
                <tr key={`${title}${i}`} className="border-b border-[#ccc]">
                  <td className="py-1.5">{firstNo(g) + i}</td>
                  <td className="py-1.5">{d}</td>
                  <td className="py-1.5 text-right tabular-nums">{printMoney(a)}</td>
                </tr>
              )),
            ],
        )}
        {(discountPaise > 0 || roundOffPaise > 0) && (
          <tr>
            <td />
            <td className="py-1.5 text-right">Sub-total</td>
            <td className="py-1.5 text-right tabular-nums">{printMoney(subTotal)}</td>
          </tr>
        )}
        {discountPaise > 0 && (
          <tr>
            <td />
            <td className="py-1.5 text-right">Discount</td>
            <td className="py-1.5 text-right tabular-nums">− {printMoney(discountPaise)}</td>
          </tr>
        )}
        {roundOffPaise > 0 && (
          <tr>
            <td />
            <td className="py-1.5 text-right">Round off</td>
            <td className="py-1.5 text-right tabular-nums">+ {printMoney(roundOffPaise)}</td>
          </tr>
        )}
        <tr className="border-t border-[#111] font-semibold">
          <td />
          <td className="py-1.5 text-right">{totalLabel}</td>
          <td className="py-1.5 text-right tabular-nums">{printMoney(bills.reduce((s, b) => s + b.totalPaise, 0))}</td>
        </tr>
      </tbody>
    </table>
  );
}
