// The counter's checkout: everything a visit owes on ONE card -- consultation & lab, medicines, one total,
// one payment. Used by the Pharmacy page ("Checkout" tab) and the Billing page ("To collect" tab).
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, ChevronDown, ChevronUp, FlaskConical, PackageCheck, Pencil, Printer, Search, Wallet, X } from 'lucide-react';
import { CHECKOUT_LOOKBACK_DAYS, FORM_UNIT, formatRupees, toPaise, type BillPaymentMode, type CheckoutInput, type CheckoutQueueEntry, type CheckoutResult, type VisitCheckout, ROUND_OFF_LINE, ROUND_OFF_MAX_PAISE, autoRoundOffPaise } from '@platform/shared';
import { Avatar, Badge, Button, Card, Dialog, EmptyState, Field, Input, Skeleton, Table, TBody, TD, TH, THead, toast, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { PrintLink } from './print';
import { useCan } from '@/state/auth';
import { fmtDateTime, fmtDay } from '@/components/format';
import { PaymentModeSelect } from '@/components/PaymentModeSelect';
import { VisitChargesBox } from '@/components/VisitCharges';
import { isUndone, withUndo } from '@/components/undo';

/** What is typed in a ₹ box, as paise (empty or not a number = 0). */
const paiseOf = (rupees: string) => Math.max(0, toPaise(Number(rupees) || 0));
const rupeesOf = (paise: number) => String(paise / 100);
export const visitBillPrintUrl = (branch: string, visitId: number) => `/${branch}/visits/${visitId}/bill/print`;

/** Everything shown after a checkout must be fresh: the lists the dispense, create-bill and payment actions refresh. */
/** "Print the bill after collecting", remembered on this computer (on unless unticked). */
const AUTO_PRINT_KEY = 'hms-print-after-collect';
const AFTER_CHECKOUT = ['checkout-queue', 'checkout', 'pharmacy-queue', 'pharmacy-sales', 'medicines', 'batches', 'prescription', 'to-bill', 'bills-due', 'bill', 'visit-bills', 'collection', 'patient-bills', 'patient-lab', 'lab-report', 'visits', 'visit', 'patient-visits', 'dashboard'];

interface Queue {
  queue: CheckoutQueueEntry[];
  today: string;
}
interface LastCollected {
  visitId: number;
  patientName: string;
  result: CheckoutResult;
}

/** The counter's list. The same query on both pages; refetches on focus and every 20 s. */
export function useCheckoutQueue(branch: string | undefined, enabled = true) {
  return useQuery({ queryKey: ['checkout-queue', branch], queryFn: () => api.get<Queue>(`/b/${branch}/checkout-queue`), refetchInterval: 20_000, refetchOnWindowFocus: true, enabled });
}

/** Visits with something to collect: sent by the doctor first, then today's, then earlier days'. */
export function CheckoutList({ branch }: { branch: string }) {
  const qc = useQueryClient();
  // Every card starts closed; opening one closes the other, so the counter looks at one bill at a time.
  const [openId, setOpenId] = useState<number | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const [search, setSearch] = useState('');
  // Billing?visit=12 (from "Create bill"): that visit's card is open.
  const [params] = useSearchParams();
  const asked = Number(params.get('visit')) || null;
  useEffect(() => {
    if (asked) setOpenId(asked);
  }, [asked]);
  const queue = useCheckoutQueue(branch);
  const canPrintLab = [useCan('lab.view'), useCan('lab.order')].some(Boolean); // the lab report page needs one of them
  // Kept in the query cache, so it is still here after coming back from the printed bill.
  const lastKey = ['checkout-last', branch];
  const { data: last } = useQuery<LastCollected | null>({ queryKey: lastKey, queryFn: () => null, staleTime: Infinity, gcTime: Infinity });

  if (queue.isLoading) return <Skeleton className="h-48" />;
  if (queue.error) return <Card className="p-4 text-base text-critical">{errorMessage(queue.error)}</Card>;
  const all = queue.data?.queue ?? [];
  // Find a patient without scrolling: name, UHID, phone, token or OP number.
  const q = search.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const entries = q
    ? all.filter((e) => e.patientName.toLowerCase().includes(q) || e.patientUhid.toLowerCase().includes(q) || e.opNo.toLowerCase().includes(q) || (digits.length >= 1 && (String(e.token ?? '') === digits || (digits.length >= 4 && (e.patientPhone ?? '').replace(/\D/g, '').includes(digits)))))
    : all;
  // Yesterday and today on top; older unpaid visits folded below, so they never push today's patients down.
  const yesterday = queue.data ? new Date(Date.parse(`${queue.data.today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10) : '';
  const recent = entries.filter((e) => e.visitDate >= yesterday);
  const older = entries.filter((e) => e.visitDate < yesterday);

  return (
    <div className="space-y-4">
      {all.length > 3 && (
        <div className="relative sm:max-w-md">
          <Search className="pointer-events-none absolute top-3 left-3 size-5 text-muted" />
          <Input type="search" aria-label="Find a patient to collect from" placeholder="Find: name, phone, UHID or token…" className="h-11 pl-10 text-base" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}
      {last && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-positive/30 bg-positive-soft p-4">
          <div className="text-base">
            <div className="font-semibold">
              Collected {formatRupees(last.result.totals.receivedPaise)} from {last.patientName}
            </div>
            <div className="text-sm">
              {[...last.result.paidBills.map((b) => b.billNo), last.result.sale?.saleNo].filter(Boolean).join(' · ')}
              {last.result.totals.balancePaise ? ` · Balance due ${formatRupees(last.result.totals.balancePaise)}` : ''}
              {last.result.visitStatus === 'completed' ? ' · Visit completed' : ''}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PrintLink href={visitBillPrintUrl(branch, last.visitId)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
              <Printer className="size-5" /> Print bill
            </PrintLink>
            {last.result.labReportReady && canPrintLab && (
              <PrintLink href={`/${branch}/lab/visits/${last.visitId}/print`} className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-base font-medium shadow-sm hover:bg-subtle">
                <FlaskConical className="size-5" /> Print lab report
              </PrintLink>
            )}
            <Button size="icon" variant="ghost" aria-label="Hide the last collection" onClick={() => qc.setQueryData(lastKey, null)}>
              <X />
            </Button>
          </div>
        </Card>
      )}
      {entries.length === 0 && q ? (
        <Card className="p-6 text-center text-base text-muted">Nobody matches “{search}”.</Card>
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState icon={PackageCheck} title="Nothing to collect" description={`Patients the doctor sends to the counter show up here by themselves. Unpaid visits of the last ${CHECKOUT_LOOKBACK_DAYS} days stay listed until they are settled.`} />
        </Card>
      ) : (
        <>
        {recent.map((e, i) => [
          // A new day starts here: yesterday's tokens and today's are never mixed up.
          (i === 0 ? recent.some((x) => x.visitDate !== e.visitDate) : recent[i - 1]!.visitDate !== e.visitDate) && <DayHeading key={`d${e.visitDate}`} day={e.visitDate} today={queue.data!.today} count={recent.filter((x) => x.visitDate === e.visitDate).length} />,
          <CheckoutCard key={e.visitId} branch={branch} entry={e} today={queue.data!.today} open={openId === e.visitId} onToggle={() => setOpenId((id) => (id === e.visitId ? null : e.visitId))} onCollected={(result) => qc.setQueryData(lastKey, { visitId: e.visitId, patientName: e.patientName, result })} />,
        ])}
        {older.length > 0 && (
          <div className="rounded-lg border border-dashed border-warning/50">
            <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-base font-semibold text-warning" onClick={() => setShowOlder((x) => !x)}>
              <span>
                Older unpaid visits · {older.length} patient{older.length === 1 ? '' : 's'} (before yesterday)
              </span>
              <span className="text-sm font-medium">{showOlder ? 'Hide' : 'Show'}</span>
            </button>
            {showOlder && <div className="space-y-4 px-3 pb-3">{older.map((e, i) => [
          // A new day starts here: yesterday's tokens and today's are never mixed up.
          (i === 0 || older[i - 1]!.visitDate !== e.visitDate) && <DayHeading key={`d${e.visitDate}`} day={e.visitDate} today={queue.data!.today} count={older.filter((x) => x.visitDate === e.visitDate).length} />,
          <CheckoutCard key={e.visitId} branch={branch} entry={e} today={queue.data!.today} open={openId === e.visitId} onToggle={() => setOpenId((id) => (id === e.visitId ? null : e.visitId))} onCollected={(result) => qc.setQueryData(lastKey, { visitId: e.visitId, patientName: e.patientName, result })} />,
        ])}</div>}
          </div>
        )}
        </>
      )}
    </div>
  );
}

/** One visit: who it is and a one-line summary; opened, the whole checkout. */
/** "Today · Wednesday, 14 October" / "Earlier day · Tuesday, 13 October": the line between two days of the list. */
function DayHeading({ day, today, count }: { day: string; today: string; count: number }) {
  const isToday = day === today;
  return (
    <div className={`flex items-center gap-3 pt-1 text-sm font-semibold ${isToday ? 'text-brand' : 'text-warning'}`}>
      <span className={`rounded-md px-2.5 py-1 ${isToday ? 'bg-brand-soft' : 'bg-warning-soft'}`}>
        {isToday ? 'Today' : 'Earlier day'} · {fmtDay(day)}
      </span>
      <span className="font-normal text-muted">
        {count} patient{count === 1 ? '' : 's'}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function CheckoutCard({ branch, entry, today, open, onToggle, onCollected }: { branch: string; entry: CheckoutQueueEntry; today: string; open: boolean; onToggle: () => void; onCollected: (r: CheckoutResult) => void }) {
  const canOpenVisit = useCan('patient.view'); // the visit page needs it
  const sent = entry.status === 'at_counter';
  const detail = useQuery({ queryKey: ['checkout', branch, entry.visitId], queryFn: () => api.get<VisitCheckout>(`/b/${branch}/visits/${entry.visitId}/checkout`), enabled: open });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {entry.token != null && (
            <div className="shrink-0 rounded-lg bg-brand-soft px-3 py-1.5 text-center text-brand">
              <div className="text-xs font-medium">Token</div>
              <div className="text-2xl leading-6 font-bold tabular-nums">{entry.token}</div>
            </div>
          )}
          <Avatar name={entry.patientName} size="sm" className="hidden sm:flex" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {canOpenVisit ? (
                <Link to={`/${branch}/visits/${entry.visitId}`} className="hover:underline">
                  {entry.patientName}
                </Link>
              ) : (
                entry.patientName
              )}
              {entry.direct ? (
                <Badge tone="brand" dot className="text-sm">
                  {entry.direct === 'lab' ? 'Lab test only' : 'Bill only'}
                </Badge>
              ) : (
                sent && (
                  <Badge tone="positive" dot className="text-sm">
                    Sent by doctor
                  </Badge>
                )
              )}
              {entry.visitDate !== today && (
                <Badge tone="warning" className="text-sm">
                  {fmtDay(entry.visitDate)}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted">
              {entry.doctorName ? `Doctor: ${entry.doctorName} · ` : ''}
              {entry.patientUhid} · {entry.opNo} · {fmtDateTime(entry.visitAt)}
            </div>
            {!open && <div className="mt-0.5 text-base">{entry.summary}</div>}
          </div>
        </div>
        {open ? (
          <Button variant="ghost" className="h-11 text-base" onClick={onToggle}>
            <ChevronUp /> Close
          </Button>
        ) : (
          <Button variant={sent ? 'default' : 'outline'} className="h-11 px-5 text-base" onClick={onToggle}>
            <Wallet /> Collect {formatRupees(entry.grandTotalPaise)} <ChevronDown />
          </Button>
        )}
      </div>
      {open &&
        (detail.isLoading ? (
          <Skeleton className="m-4 h-40" />
        ) : detail.error || !detail.data ? (
          <p className="border-t border-border p-4 text-base text-critical">{errorMessage(detail.error)}</p>
        ) : (
          <CheckoutForm branch={branch} data={detail.data} onCollected={onCollected} />
        ))}
    </Card>
  );
}

/**
 * The checkout itself. What the user typed or ticked lives in state and is never reset by a refetch;
 * amounts follow the server's latest numbers until the user changes them.
 */
function CheckoutForm({ branch, data, onCollected }: { branch: string; data: VisitCheckout; onCollected: (r: CheckoutResult) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const bill = data.bill;
  const items = data.medicines?.items ?? [];
  // Medicines: all ticked unless short of stock or unticked by hand.
  const [unticked, setUnticked] = useState<number[]>(() => items.filter((i) => i.stock < i.quantity).map((i) => i.id));
  // Charges: null = as the server has them.
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState<string | null>(null);
  const [discount, setDiscount] = useState<string | null>(null);
  /** Round off typed by hand; null = worked out by HMS (up to the next ₹5). */
  const [round, setRound] = useState<string | null>(null);
  const [autoPrint, setAutoPrintState] = useState(() => {
    try {
      return localStorage.getItem(AUTO_PRINT_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const setAutoPrint = (on: boolean) => {
    setAutoPrintState(on);
    try {
      localStorage.setItem(AUTO_PRINT_KEY, on ? '1' : '0');
    } catch {
      /* private window: this time only */
    }
  };
  const [confirmFree, setConfirmFree] = useState(false);
  // Amount received: null = the whole total.
  const [amount, setAmount] = useState<string | null>(null);
  const [mode, setMode] = useState<BillPaymentMode>('cash');
  // Fewer units than prescribed (the patient wants 2 days of 3): line id -> what is typed. Not listed = in full.
  const [fewer, setFewer] = useState<Record<number, string>>({});

  const editable = !!bill?.editable;
  // (Used before giveQty is defined below: the same rule.)
  const fewerQty = (i: { id: number; quantity: number }) => (fewer[i.id] == null ? i.quantity : Math.min(i.quantity, Math.max(1, Math.floor(Number(fewer[i.id]) || 0))));
  const feePaise = fee != null && editable ? paiseOf(fee) : (bill?.consultationFeePaise ?? 0);
  // Extra charges are saved one by one (see VisitChargesBox); what the server has is what gets billed.
  const charges = bill?.charges ?? [];
  // The round-off line is worked out here, not typed: it is kept apart from the other charges.
  const savedRoundPaise = charges.find((x) => x.description === ROUND_OFF_LINE)?.amountPaise ?? 0;
  const otherPaise = charges.reduce((s, x) => s + x.amountPaise, 0) - savedRoundPaise;
  const typedDiscountPaise = discount != null && editable ? paiseOf(discount) : (bill?.discountPaise ?? 0);
  const labPaise = bill?.labLines.reduce((s, l) => s + l.amountPaise, 0) ?? 0;
  const earlierPaise = bill?.earlierBills.reduce((s, b) => s + b.balancePaise, 0) ?? 0;
  const basePaise = feePaise + labPaise + otherPaise;
  // Round off: UP to the next ₹5 (158 -> 160, 163 -> 165) on the whole total, medicines included, unless staff
  // typed another amount. It becomes the bill's "Round off" line, so it needs a bill that can still be changed.
  const medicinesNow = (data.medicines?.items ?? []).filter((i) => !unticked.includes(i.id)).reduce((s, i) => s + (fewerQty(i)) * i.pricePaise, 0);
  const beforeRound = (bill ? Math.max(0, basePaise - typedDiscountPaise) + earlierPaise : 0) + medicinesNow;
  const autoRound = autoRoundOffPaise(beforeRound);
  const roundOff = editable ? (round != null ? Math.min(ROUND_OFF_MAX_PAISE, Math.max(0, paiseOf(round))) : autoRound) : savedRoundPaise;
  const discountPaise = typedDiscountPaise;
  const chargesPaise = basePaise + roundOff;
  const billDuePaise = bill ? Math.max(0, chargesPaise - discountPaise) + earlierPaise : 0;

  /** Units to give: what was typed, kept between 1 and what the doctor prescribed. */
  const giveQty = (i: { id: number; quantity: number }) => (fewer[i.id] == null ? i.quantity : Math.min(i.quantity, Math.max(1, Math.floor(Number(fewer[i.id]) || 0))));
  const chosen = items.filter((i) => !unticked.includes(i.id));
  const medicinesPaise = chosen.reduce((s, i) => s + giveQty(i) * i.pricePaise, 0);
  const shortOnTicked = chosen.some((i) => i.stock < giveQty(i));
  const totalPaise = billDuePaise + medicinesPaise;
  /** Paise taken off so the patient pays whole rupees (only while the bill can still carry it as discount). */
  const roundOffPaise = roundOff;
  const receivedPaise = amount != null ? paiseOf(amount) : totalPaise;
  const balanceLeft = totalPaise - receivedPaise;

  const problem =
    editable && round != null && paiseOf(round) > ROUND_OFF_MAX_PAISE
      ? `Round off can be ${formatRupees(ROUND_OFF_MAX_PAISE)} at most.`
      : typedDiscountPaise > basePaise
      ? 'The discount is more than the consultation, lab and other charges.'
      : shortOnTicked
        ? 'A ticked drug is short of stock. Untick it or add stock first.'
        : receivedPaise < medicinesPaise
          ? `Drugs (${formatRupees(medicinesPaise)}) must be paid in full.`
          : receivedPaise > totalPaise
            ? `Only ${formatRupees(totalPaise)} is due.`
            : null;
  // Nothing to collect, bill, give or mark: e.g. everything unticked on a card that has no medicines at all.
  const nothingToDo = !editable && totalPaise === 0 && items.length === 0;

  const collect = useMutation({
    mutationFn: () => {
      const body: CheckoutInput = { paymentMode: mode, amountPaise: receivedPaise };
      if (data.medicines) {
        body.itemIds = chosen.map((i) => i.id);
        const less = chosen.filter((i) => giveQty(i) < i.quantity);
        if (less.length) body.quantities = Object.fromEntries(less.map((i) => [i.id, giveQty(i)]));
      }
      // What is on the screen is what gets billed.
      // (The extra charges are already saved on the visit or the bill: sending a copy could drop one added meanwhile.)
      if (editable) Object.assign(body, { consultationFeePaise: feePaise, discountPaise, roundOffPaise: roundOff });
      return withUndo(`Collecting ${formatRupees(receivedPaise)} from ${data.patientName}`, () => api.post<CheckoutResult>(`/b/${branch}/visits/${data.visitId}/checkout`, body));
    },
    onSuccess: (r) => {
      const numbers = [...r.paidBills.map((b) => b.billNo), r.sale?.saleNo].filter(Boolean).join(' · ') || r.bill?.billNo || '';
      toast.success(`Collected ${formatRupees(r.totals.receivedPaise)}${numbers ? ` · ${numbers}` : ''}`, {
        description: [r.visitStatus === 'completed' ? 'Visit completed.' : null, r.totals.balancePaise ? `${formatRupees(r.totals.balancePaise)} stays as balance due.` : null, r.sale ? 'Stock updated.' : null].filter(Boolean).join(' '),
        action: { label: 'Print bill', onClick: () => navigate(visitBillPrintUrl(branch, data.visitId)) }, // same window; Back returns here
      });
      onCollected(r);
      for (const k of AFTER_CHECKOUT) qc.invalidateQueries({ queryKey: [k, branch] });
      // Ticked "Print the bill after collecting": straight to the bill, which prints by itself (Back returns here).
      if (autoPrint) navigate(visitBillPrintUrl(branch, data.visitId));
    },
    onError: (e) => {
      if (isUndone(e)) return;
      toast.error(errorMessage(e));
      for (const k of ['checkout', 'checkout-queue', 'medicines']) qc.invalidateQueries({ queryKey: [k, branch] }); // something changed under us
    },
  });

  const parts = [bill && feePaise ? `Consultation ${formatRupees(feePaise)}` : null, labPaise ? `Lab ${formatRupees(labPaise)}` : null, otherPaise ? `Other ${formatRupees(otherPaise)}` : null, earlierPaise ? `Earlier balance ${formatRupees(earlierPaise)}` : null, medicinesPaise ? `Medicines ${formatRupees(medicinesPaise)}` : null].filter(Boolean);
  const amountId = `amount-${data.visitId}`;
  const modeId = `mode-${data.visitId}`;

  return (
    <div className="border-t border-border text-base">
      {data.medicines && <PharmacyNote branch={branch} visitId={data.visitId} note={data.medicines.pharmacyNote} />}

      {bill && (
        <section aria-label="Consultation and lab" className="border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-subtle/50 px-4 py-2">
            <h3 className="font-semibold">Consultation, lab &amp; other charges</h3>
            {editable && !editing && (
              <Button variant="outline" className="h-11 text-base" onClick={() => setEditing(true)}>
                <Pencil /> Edit fee / discount
              </Button>
            )}
          </div>
          <div className="divide-y divide-border">
            {(editable || feePaise > 0) && <Group label="Consultation" />}
            {(editable || feePaise > 0) && (
              <Line label="Consultation fee">{editing ? <MoneyInput label="Consultation fee" value={fee ?? rupeesOf(feePaise)} onChange={setFee} /> : formatRupees(feePaise)}</Line>
            )}
            {bill.labLines.length > 0 && <Group label="Lab tests" amount={labPaise} />}
            {bill.labLines.map((l, i) => (
              <Line key={i} label={l.description}>
                {formatRupees(l.amountPaise)}
              </Line>
            ))}
            {(editable || charges.length > 0) && <Group label="Other charges" amount={otherPaise || undefined} />}
            {editable ? (
              <VisitChargesBox big branch={branch} visitId={data.visitId} />
            ) : (
              charges.map((x, i) => (
                <Line key={i} label={x.description}>
                  <span className="rounded-md bg-warning-soft px-2 py-0.5 font-semibold text-warning">{formatRupees(x.amountPaise)}</span>
                </Line>
              ))
            )}
            {editing ? (
              <Line
                label={
                  <>
                    Discount
                    {chargesPaise > 0 && discountPaise < chargesPaise && (
                      <button type="button" className="ml-3 text-sm font-normal text-muted underline hover:text-ink" onClick={() => setConfirmFree(true)}>
                        No charge (100% discount)
                      </button>
                    )}
                  </>
                }
              >
                <MoneyInput label="Discount" value={discount ?? rupeesOf(discountPaise)} onChange={setDiscount} />
              </Line>
            ) : (
              discountPaise > 0 && <Line label={discountPaise === chargesPaise ? 'Discount (100%, no charge)' : 'Discount'}>− {formatRupees(discountPaise)}</Line>
            )}
            {roundOffPaise > 0 && (
              <Line label="Round off" muted>
                + {formatRupees(roundOffPaise)}
              </Line>
            )}
            {bill.earlierBills.map((b) => (
              <Line key={b.id} label={`Balance due on bill ${b.billNo}`}>
                {formatRupees(b.balancePaise)}
              </Line>
            ))}
            {bill.paidPaise > 0 && (
              <Line label="Already paid" muted>
                {formatRupees(bill.paidPaise)}
              </Line>
            )}
            {!editable && billDuePaise === 0 && <p className="px-4 py-2.5 text-muted">Consultation and lab are fully paid.</p>}
          </div>
        </section>
      )}

      {data.medicines && items.length > 0 && (
        <section aria-label="Drugs" className="border-b border-border">
          <h3 className="bg-subtle/50 px-4 py-2 font-semibold">Drugs</h3>
          <Table className="text-base">
            <THead>
              <tr>
                <TH className="w-12">Give</TH>
                <TH>Drug</TH>
                <TH className="hidden sm:table-cell">Dose</TH>
                <TH className="text-right">Qty</TH>
                <TH className="hidden text-right sm:table-cell">Price</TH>
                <TH className="text-right">Amount</TH>
              </tr>
            </THead>
            <TBody>
              {items.map((i) => {
                const give = giveQty(i);
                const short = i.stock < give;
                const ticked = !unticked.includes(i.id);
                return (
                  <TR key={i.id} className={ticked ? '' : 'opacity-60'}>
                    <TD>
                      <input
                        type="checkbox"
                        aria-label={`Give ${i.medicineName}`}
                        className="size-6 accent-[var(--color-primary)]"
                        checked={ticked}
                        onChange={(e) => setUnticked((u) => (e.target.checked ? u.filter((x) => x !== i.id) : [...u, i.id]))}
                      />
                    </TD>
                    <TD>
                      <div className="font-medium">
                        {i.medicineName} {i.strength && <span className="text-muted">{i.strength}</span>}
                      </div>
                      {short ? (
                        <div className="flex items-center gap-1 text-sm font-medium text-critical">
                          <AlertTriangle className="size-4" /> Only {i.stock} in stock
                        </div>
                      ) : (
                        <div className="text-sm text-muted">
                          {i.nextBatchNo && `Batch ${i.nextBatchNo}`}
                          {i.nextExpiry && ` · expires ${fmtDay(i.nextExpiry)}`}
                          {i.instructions && ` · ${i.instructions}`}
                        </div>
                      )}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-muted sm:table-cell">
                      {i.dose} × {i.days} days
                    </TD>
                    <TD className="text-right whitespace-nowrap tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <Input
                          aria-label={`Quantity of ${i.medicineName}`}
                          inputMode="numeric"
                          className="h-9 w-16 text-right"
                          disabled={!ticked}
                          value={fewer[i.id] ?? String(i.quantity)}
                          onChange={(e) => setFewer((f) => ({ ...f, [i.id]: e.target.value.replace(/\D/g, '') }))}
                          // Leaving the box settles it: never empty, never more than prescribed.
                          onBlur={() => setFewer(({ [i.id]: _typed, ...rest }) => (give === i.quantity ? rest : { ...rest, [i.id]: String(give) }))}
                        />
                        <span className="text-sm text-muted">{FORM_UNIT[i.form]}</span>
                      </span>
                      {give < i.quantity && <div className="text-xs font-medium text-warning">of {i.quantity} prescribed</div>}
                    </TD>
                    <TD className="hidden text-right text-muted tabular-nums sm:table-cell">{formatRupees(i.pricePaise)}</TD>
                    <TD className="text-right font-medium tabular-nums">{formatRupees(give * i.pricePaise)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <p className="border-t border-border bg-subtle/50 px-4 py-2 text-sm text-muted">
            Patient wants fewer days? Lower the quantity. {chosen.length < items.length ? 'Unticked drugs will be marked “not bought”.' : 'Untick what the patient does not want.'}
          </p>
        </section>
      )}

      <form
        className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!problem && !collect.isPending) collect.mutate();
        }}
      >
        <div>
          <div className="text-sm font-medium text-muted">Total</div>
          <div className="text-4xl font-bold tracking-tight tabular-nums">{formatRupees(totalPaise)}</div>
          <div className="mt-1 text-base text-muted">
            {parts.join(' + ') || 'Nothing to pay'}
            {bill && typedDiscountPaise > 0 && ` − Discount ${formatRupees(Math.min(typedDiscountPaise, basePaise))}`}{roundOffPaise > 0 && ` + Round off ${formatRupees(roundOffPaise)}`}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {editable && (
            <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-dashed border-border px-3 py-2">
              <label htmlFor={`discount-${data.visitId}`} className="text-base font-medium">
                Discount (₹)
              </label>
              <Input id={`discount-${data.visitId}`} inputMode="decimal" placeholder="0" className="h-11 w-32 text-right text-lg font-semibold tabular-nums" value={discount ?? (bill?.discountPaise ? rupeesOf(bill.discountPaise) : '')} onChange={(e) => setDiscount(e.target.value)} />
              <label htmlFor={`round-${data.visitId}`} className="ml-2 text-base font-medium">
                Round off (₹) {round == null && <span className="text-sm font-normal text-muted">auto</span>}
              </label>
              <Input id={`round-${data.visitId}`} inputMode="decimal" placeholder="0" className="h-11 w-24 text-right text-lg font-semibold tabular-nums" value={round ?? (autoRound ? rupeesOf(autoRound) : '')} onChange={(e) => setRound(e.target.value)} />
              {round != null && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setRound(null)}>
                  Auto
                </Button>
              )}
            </div>
          )}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <Field required label="Amount received (₹)" htmlFor={amountId} className="sm:w-44">
            <Input id={amountId} inputMode="decimal" className="h-12 text-right text-lg font-semibold tabular-nums" value={amount ?? rupeesOf(totalPaise)} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!problem} />
          </Field>
          <Field required label="Paid by" htmlFor={modeId} className="sm:w-32">
            <PaymentModeSelect id={modeId} className="h-12 text-base" value={mode} onChange={setMode} />
          </Field>
          <Button type="submit" className="col-span-2 h-12 px-6 text-lg font-semibold" disabled={!!problem || nothingToDo || collect.isPending}>
            <PackageCheck className="!size-5" />
            {collect.isPending ? 'Saving…' : receivedPaise === 0 && chosen.length === 0 ? 'Finish with no charge' : `Collect ${formatRupees(receivedPaise)}${chosen.length ? ' & give drugs' : ''}`}
          </Button>
        </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted lg:col-span-2">
          <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} />
          Print the bill after collecting
        </label>
        {(problem || balanceLeft > 0) && (
          <p role="status" className={`text-base font-medium lg:col-span-2 ${problem ? 'text-critical' : 'text-warning'}`}>
            {problem ?? `${formatRupees(balanceLeft)} will stay as balance due.`}
          </p>
        )}
      </form>

      <Dialog open={confirmFree} onOpenChange={setConfirmFree} title="No charge for this visit?" description={`Consultation and lab (${formatRupees(chargesPaise)}) get a 100% discount: the patient pays nothing for them.${items.length ? ' Medicines are still charged.' : ''}`}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="h-11 text-base" onClick={() => setConfirmFree(false)}>
            Cancel
          </Button>
          <Button
            className="h-11 text-base"
            onClick={() => {
              setDiscount(rupeesOf(chargesPaise));
              setConfirmFree(false);
            }}
          >
            Yes, no charge
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

/** The doctor's note to the pharmacy, on the card. The counter (and the owner) can correct it or add one. */
export function PharmacyNote({ branch, visitId, note }: { branch: string; visitId: number; note: string | null }) {
  const qc = useQueryClient();
  const [text, setText] = useState<string | null>(null); // null = not editing
  // The doctor's note: the doctor, the branch admin and the owner change it; the counter reads it.
  const canEdit = [useCan('prescription.write'), useCan('settings.manage')].some(Boolean);
  const save = useMutation({
    mutationFn: () => api.put(`/b/${branch}/visits/${visitId}/pharmacy-note`, { note: text ?? '' }),
    onSuccess: () => {
      for (const k of ['checkout', 'pharmacy-queue', 'visit']) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success('Note saved');
      setText(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (text == null)
    return (
      <div className={`flex items-start justify-between gap-3 border-b border-border px-4 py-2.5 ${note ? 'bg-warning-soft' : ''}`}>
        <p className="min-w-0 whitespace-pre-wrap">{note ? <><span className="font-semibold">Note to the pharmacy: </span>{note}</> : <span className="text-sm text-muted">No note on this visit.</span>}</p>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setText(note ?? '')}>
            <Pencil /> {note ? 'Edit note' : 'Add note'}
          </Button>
        )}
      </div>
    );
  return (
    <div className="space-y-2 border-b border-border bg-subtle/40 px-4 py-3">
      <textarea aria-label="Note to the pharmacy" autoFocus rows={2} maxLength={500} className="w-full rounded-lg border border-border bg-background p-2 text-base outline-none focus-visible:border-ring" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setText(null)}>
          Cancel
        </Button>
        <Button disabled={save.isPending || text.trim() === (note ?? '')} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save note'}
        </Button>
      </div>
    </div>
  );
}

/** A small heading inside the bill: Consultation / Lab tests / Other charges, with the group's total. */
function Group({ label, amount }: { label: string; amount?: number }) {
  return (
    <div className="flex items-center justify-between bg-subtle/40 px-4 py-1 text-xs font-semibold tracking-wide text-muted uppercase">
      <span>{label}</span>
      {amount != null && <span className="tabular-nums">{formatRupees(amount)}</span>}
    </div>
  );
}

function Line({ label, muted, children }: { label: React.ReactNode; muted?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex min-h-11 items-center justify-between gap-3 px-4 py-2 ${muted ? 'text-muted' : ''}`}>
      <div className="min-w-0 font-medium">{label}</div>
      <div className="tabular-nums">{children}</div>
    </div>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted">₹</span>
      <Input aria-label={label} inputMode="decimal" className="h-11 w-28 text-right text-base" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
