// Money over a period: today, 7 days, 30 days or a year. Used by Billing (payment reports), the Pharmacy
// (pharmacy reports) and the dashboard (a doctor's own patients).
import { useQuery } from '@tanstack/react-query';
import { formatRupees } from '@platform/shared';
import { Card, CardHeader, cn, Skeleton, Table, TBody, TD, TH, THead, TR } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { Link } from 'react-router';
import { fmtDateTime, fmtDay } from './format';

export const PERIODS = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 365, label: '1 year' },
] as const;
export type PeriodDays = (typeof PERIODS)[number]['days'];

/** Today · 7 days · 30 days · 1 year. */
export function PeriodPicker({ value, onChange, className }: { value: PeriodDays; onChange: (days: PeriodDays) => void; className?: string }) {
  return (
    <div role="group" aria-label="Period" className={cn('inline-flex rounded-lg border border-border bg-surface p-0.5', className)}>
      {PERIODS.map((p) => (
        <button
          key={p.days}
          type="button"
          aria-pressed={value === p.days}
          onClick={() => onChange(p.days)}
          className={cn('h-8 rounded-md px-3 text-sm font-medium transition-colors', value === p.days ? 'bg-primary text-primary-foreground' : 'text-muted hover:bg-subtle hover:text-ink')}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export interface DoctorLine {
  doctorUserId: number | null;
  doctorName: string | null;
  patients: number;
  consultationPaise: number;
  labPaise: number;
  otherPaise: number;
  discountPaise: number;
  medicinesPaise: number;
  totalPaise: number;
}
export interface PeriodData {
  days: number;
  from: string;
  to: string;
  /** Only the caller's own line (a doctor without the billing pages). */
  own: boolean;
  doctors: DoctorLine[];
  received?: { cash: number; upi: number; card: number; totalPaise: number; billsPaise: number; pharmacyOpPaise: number; pharmacyDirectPaise: number };
  billed?: { consultationPaise: number; labPaise: number; otherPaise: number; roundOffPaise?: number; discountPaise: number; bills: number; duePaise: number };
  expensesPaise?: number;
  vendorPaidPaise?: number;
  visits?: number;
  newPatients?: number;
  discounts?: { billId: number; billNo: string; at: string; patientName: string; discountPaise: number; roundOffPaise: number; totalPaise: number }[];
}
export const usePeriodReport = (branch: string | undefined, days: number, enabled = true) =>
  useQuery({ queryKey: ['collection', branch, 'period', days], queryFn: () => api.get<PeriodData>(`/b/${branch}/reports/period?days=${days}`), enabled: !!branch && enabled, staleTime: 15_000 });

function Tile({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-lg border px-3 py-2.5', strong ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
      <div className={cn('text-xs', strong ? 'opacity-80' : 'text-muted')}>{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className={cn('text-xs', strong ? 'opacity-80' : 'text-muted')}>{sub}</div>}
    </div>
  );
}

/** Patients and amounts of each doctor (or of the one doctor looking). */
export function DoctorsTable({ doctors, own }: { doctors: DoctorLine[]; own?: boolean }) {
  if (!doctors.length) return <p className="px-4 py-6 text-center text-sm text-muted">{own ? 'You saw no patients in this period.' : 'No patients were seen in this period.'}</p>;
  const sum = (k: keyof DoctorLine) => doctors.reduce((s, d) => s + (d[k] as number), 0);
  return (
    <Table>
      <THead>
        <tr>
          <TH>Doctor</TH>
          <TH className="text-right">Patients</TH>
          <TH className="text-right">Consultation</TH>
          <TH className="text-right">Lab</TH>
          <TH className="text-right">Other charges</TH>
          <TH className="text-right">Medicines</TH>
          <TH className="text-right">Total</TH>
        </tr>
      </THead>
      <TBody>
        {doctors.map((d) => (
          <TR key={d.doctorUserId ?? 0}>
            <TD className="font-medium">{d.doctorName ?? 'No doctor assigned'}</TD>
            <TD className="text-right tabular-nums">{d.patients}</TD>
            <TD className="text-right tabular-nums">{formatRupees(d.consultationPaise)}</TD>
            <TD className="text-right tabular-nums">{formatRupees(d.labPaise)}</TD>
            <TD className="text-right tabular-nums">{formatRupees(d.otherPaise)}</TD>
            <TD className="text-right tabular-nums">{formatRupees(d.medicinesPaise)}</TD>
            <TD className="text-right font-semibold tabular-nums">{formatRupees(d.totalPaise)}</TD>
          </TR>
        ))}
        {doctors.length > 1 && (
          <TR className="bg-subtle/50 font-semibold">
            <TD>All doctors</TD>
            <TD className="text-right tabular-nums">{sum('patients')}</TD>
            <TD className="text-right tabular-nums">{formatRupees(sum('consultationPaise'))}</TD>
            <TD className="text-right tabular-nums">{formatRupees(sum('labPaise'))}</TD>
            <TD className="text-right tabular-nums">{formatRupees(sum('otherPaise'))}</TD>
            <TD className="text-right tabular-nums">{formatRupees(sum('medicinesPaise'))}</TD>
            <TD className="text-right tabular-nums">{formatRupees(sum('totalPaise'))}</TD>
          </TR>
        )}
      </TBody>
    </Table>
  );
}

/**
 * The whole picture of a period. `pharmacyOnly`: just the medicine money (the Pharmacy page).
 */
export function PeriodSummary({ branch, days, pharmacyOnly }: { branch: string; days: PeriodDays; pharmacyOnly?: boolean }) {
  const { data, isLoading, error } = usePeriodReport(branch, days);
  if (isLoading) return <Skeleton className="h-48" />;
  if (error || !data) return <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>;
  const r = data.received;
  const b = data.billed;
  const range = data.from === data.to ? fmtDay(data.to) : `${fmtDay(data.from)} to ${fmtDay(data.to)}`;
  if (!r || !b) return null;
  const medicines = r.pharmacyOpPaise + r.pharmacyDirectPaise;

  if (pharmacyOnly)
    return (
      <Card>
        <CardHeader title="Medicines sold" description={range} />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <Tile strong label="All medicine sales" value={formatRupees(medicines)} />
          <Tile label="To OP patients (on a prescription)" value={formatRupees(r.pharmacyOpPaise)} />
          <Tile label="Direct sales over the counter" value={formatRupees(r.pharmacyDirectPaise)} />
        </div>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Money received" description={`${range} · ${data.visits} patient visit${data.visits === 1 ? '' : 's'} · ${data.newPatients} new patient${data.newPatients === 1 ? '' : 's'}`} />
        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
          <Tile strong label="Total received" value={formatRupees(r.totalPaise)} />
          <Tile label="Cash" value={formatRupees(r.cash)} />
          <Tile label="UPI" value={formatRupees(r.upi)} />
          <Tile label="Card" value={formatRupees(r.card)} />
        </div>
      </Card>
      <Card>
        <CardHeader title="What it was for" description="Consultation, lab and other charges are what was billed in these days; medicines are what was sold." />
        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
          <Tile label="Consultation" value={formatRupees(b.consultationPaise)} />
          <Tile label="Lab tests" value={formatRupees(b.labPaise)} />
          <Tile label="Other charges" value={formatRupees(b.otherPaise)} sub="Dressing, injection, IV…" />
          <Tile label="Medicines, OP patients" value={formatRupees(r.pharmacyOpPaise)} />
          <Tile label="Medicines, direct sale" value={formatRupees(r.pharmacyDirectPaise)} />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border p-4 lg:grid-cols-5">
          <Tile label="Round off added" value={formatRupees(b.roundOffPaise ?? 0)} sub="Extra from rounding bills up" />
          <Tile label="Discount given" value={formatRupees(b.discountPaise)} />
          <Tile label="Still due from patients" value={formatRupees(b.duePaise)} sub="On bills made in these days" />
          <Tile label="Paid to medicine vendors" value={formatRupees(data.vendorPaidPaise ?? 0)} />
          <Tile label="Other expenses" value={formatRupees(data.expensesPaise ?? 0)} sub="Bought for the hospital" />
        </div>
      </Card>
      <Card>
        <CardHeader title="Discounts given" description={`Each bill that got a discount in these days${(data.discounts?.length ?? 0) >= 200 ? ' (the newest 200)' : ''}.`} />
        {!data.discounts?.length ? (
          <p className="px-4 py-6 text-center text-sm text-muted">No discount was given.</p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Patient</TH>
                <TH>Bill</TH>
                <TH className="text-right">Discount</TH>
                <TH className="text-right">Round off</TH>
                <TH className="text-right">Bill total</TH>
              </tr>
            </THead>
            <TBody>
              {data.discounts.map((d) => (
                <TR key={d.billId}>
                  <TD className="whitespace-nowrap tabular-nums">{fmtDateTime(d.at)}</TD>
                  <TD className="font-medium">{d.patientName}</TD>
                  <TD>
                    <Link to={`/${branch}/billing/${d.billId}`} className="font-mono text-xs text-brand hover:underline">
                      {d.billNo}
                    </Link>
                  </TD>
                  <TD className="text-right font-semibold tabular-nums">− {formatRupees(d.discountPaise)}</TD>
                  <TD className="text-right tabular-nums">{d.roundOffPaise ? `+ ${formatRupees(d.roundOffPaise)}` : '—'}</TD>
                  <TD className="text-right tabular-nums">{formatRupees(d.totalPaise)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader title="By doctor" description="Patients seen, and what was billed and sold on their visits. Round off is not counted under a doctor." />
        <DoctorsTable doctors={data.doctors} />
      </Card>
    </div>
  );
}
