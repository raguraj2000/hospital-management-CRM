import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { ConfirmDelete } from '../components/ConfirmDelete.js';
import { centsToRupees, formatRupees, rupeesToCents } from '../lib/money.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { PrintHeader, type PrintHeaderData } from '../components/PrintHeader.js';
import { PaymentsPanel, type BillStatus, type PaymentRow } from '../components/PaymentsPanel.js';

interface Clinic {
  name: string;
  addressLine: string;
  doctorName: string;
  doctorTitle: string;
  phone: string;
  print: PrintHeaderData;
}

interface DraftVisit {
  id: number;
  visit_date: string;
  notes: string | null;
  attending_doctor_name: string | null;
  invoiced_on: string | null;
  lines: DraftLine[];
}

type SourceType = 'prescription_line' | 'lab_order_item';

interface DraftLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  sourceType: SourceType | null;
  sourceId: number | null;
}

interface DraftLabItem extends DraftLine {
  id: number;
  orderNumber: string;
}

/** An unpaid bill (no payment yet) that a new bill can take over. */
interface MergeableBill {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  totalCents: number;
  doctorFeeCents: number;
  consultantFeeCents: number;
  otherFeeCents: number;
  discountCents: number;
  visitIds: number[];
  lines: DraftLine[];
}

interface PartPaidBill {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  balanceCents: number;
}

interface EditableLine {
  description: string;
  quantity: string;
  unitPriceRupees: string;
  /** What this line pays for (a prescribed medicine or lab test), so paying the bill unlocks it. */
  sourceType?: SourceType | null;
  sourceId?: number | null;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function blankLine(): EditableLine {
  return { description: '', quantity: '1', unitPriceRupees: '0.00' };
}

/**
 * One screen for both bills the clinic prints:
 *   /patients/:id/invoice?visitId=N   -> bill for a single prescription
 *   /patients/:id/invoice             -> combined bill, pick the visits
 *   /invoices/:invoiceId              -> open a saved bill to edit or reprint
 * All three are the same form over the same data, which is why there's one
 * component rather than three.
 */
export function Invoice() {
  const { id: patientIdParam, invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const canManage = useHasPermission('invoice.manage');

  const visitIdParam = searchParams.get('visitId');
  const isExisting = Boolean(invoiceId);

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [patientId, setPatientId] = useState<number | null>(patientIdParam ? Number(patientIdParam) : null);
  const [patientName, setPatientName] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [patientPhone, setPatientPhone] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);

  const [visits, setVisits] = useState<DraftVisit[]>([]);
  const [selectedVisitIds, setSelectedVisitIds] = useState<number[]>([]);
  const [labItems, setLabItems] = useState<DraftLabItem[]>([]);
  const [selectedLabIds, setSelectedLabIds] = useState<number[]>([]);
  const [mergeBills, setMergeBills] = useState<MergeableBill[]>([]);
  const [selectedMergeIds, setSelectedMergeIds] = useState<number[]>([]);
  const [partPaidBills, setPartPaidBills] = useState<PartPaidBill[]>([]);
  /** The saved bill as last loaded, to tell whether the screen has unsaved changes. */
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [bill, setBill] = useState<BillStatus | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [doctorFee, setDoctorFee] = useState('0.00');
  const [consultantFee, setConsultantFee] = useState('0.00');
  const [otherFee, setOtherFee] = useState('0.00');
  const [otherFeeLabel, setOtherFeeLabel] = useState('Other charges');
  const [discount, setDiscount] = useState('0.00');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // --- load -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (isExisting) {
          const d = await get<any>(`/invoices/${invoiceId}`);
          if (cancelled) return;
          setClinic(d.clinic);
          setPatientId(d.invoice.patient_id);
          setPatientName(d.invoice.patient_name);
          setPatientCode(d.invoice.customer_code);
          setPatientPhone(d.invoice.phone_number ?? null);
          setInvoiceNumber(d.invoice.invoice_number);
          setInvoiceDate(d.invoice.invoice_date);
          setDoctorFee(centsToRupees(d.invoice.doctor_fee_cents));
          setConsultantFee(centsToRupees(d.invoice.consultant_fee_cents));
          setOtherFee(centsToRupees(d.invoice.other_fee_cents));
          setOtherFeeLabel(d.invoice.other_fee_label ?? 'Other charges');
          setDiscount(centsToRupees(d.invoice.discount_cents));
          setNotes(d.invoice.notes ?? '');
          setSelectedVisitIds(d.visitIds);
          setBill(d.bill);
          setPayments(d.payments);
          setLines(
            d.lines.map((l: any) => ({
              description: l.description,
              quantity: String(l.quantity),
              unitPriceRupees: centsToRupees(l.unit_price_cents),
              sourceType: l.source_type,
              sourceId: l.source_id,
            })),
          );
        } else {
          const [draft, patient] = await Promise.all([
            get<{
              clinic: Clinic;
              defaults: any;
              visits: DraftVisit[];
              billedVisits: { visitId: number; invoiceId: number }[];
              labItems: DraftLabItem[];
              unpaidBills: { mergeable: MergeableBill[]; partPaid: PartPaidBill[] };
            }>(`/invoices/draft?patientId=${patientIdParam}`),
            get<{ patient: any }>(`/patients/${patientIdParam}`),
          ]);
          if (cancelled) return;
          // This prescription is already on a bill: open that bill instead of making another.
          const existingBill = visitIdParam ? draft.billedVisits.find((b) => b.visitId === Number(visitIdParam)) : undefined;
          if (existingBill) {
            navigate(`/invoices/${existingBill.invoiceId}`, { replace: true });
            return;
          }
          setClinic(draft.clinic);
          setPatientName(patient.patient.current_name);
          setPatientCode(patient.patient.customer_code);
          setPatientPhone(patient.patient.phone_number ?? null);
          setVisits(draft.visits);
          setOtherFeeLabel(draft.defaults.otherFeeLabel || 'Other charges');

          // One prescription -> just that visit. Otherwise everything not
          // billed yet, plus the unpaid bills (no payment yet), all on one bill.
          const preselected = visitIdParam ? draft.visits.filter((v) => v.id === Number(visitIdParam)) : draft.visits;
          const merging = visitIdParam ? [] : draft.unpaidBills.mergeable;
          setSelectedVisitIds(preselected.map((v) => v.id));
          setMergeBills(merging);
          setSelectedMergeIds(merging.map((b) => b.id));
          setPartPaidBills(visitIdParam ? [] : draft.unpaidBills.partPaid);
          // Fees: what the combined bills already charged, plus today's
          // default fees when there is something new on this bill.
          const sum = (pick: (b: MergeableBill) => number) => merging.reduce((t, b) => t + pick(b), 0);
          const hasNew = merging.length === 0 || preselected.some((v) => !v.invoiced_on);
          setDoctorFee(centsToRupees(sum((b) => b.doctorFeeCents) + (hasNew ? draft.defaults.doctorFeeCents : 0)));
          setConsultantFee(centsToRupees(sum((b) => b.consultantFeeCents) + (hasNew ? draft.defaults.consultantFeeCents : 0)));
          setOtherFee(centsToRupees(sum((b) => b.otherFeeCents)));
          setDiscount(centsToRupees(sum((b) => b.discountCents)));
          // One bill per visit: lab tests not billed yet go on it too.
          setLabItems(draft.labItems);
          setSelectedLabIds(draft.labItems.map((l) => l.id));
          setLines(billLines(preselected, draft.labItems, merging));
        }
        setError(null);
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'open this invoice'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, patientIdParam, visitIdParam, reloadKey]);

  function toEditable(l: DraftLine): EditableLine {
    return {
      description: l.description,
      quantity: String(l.quantity),
      unitPriceRupees: centsToRupees(l.unitPriceCents),
      sourceType: l.sourceType,
      sourceId: l.sourceId,
    };
  }

  function billLines(chosenVisits: DraftVisit[], chosenLab: DraftLabItem[], chosenBills: MergeableBill[]): EditableLine[] {
    return [
      ...chosenBills.flatMap((b) => b.lines.map(toEditable)),
      ...chosenVisits.flatMap((v) => v.lines.map(toEditable)),
      ...chosenLab.map(toEditable),
    ];
  }

  function toggleVisit(visitId: number) {
    const next = selectedVisitIds.includes(visitId)
      ? selectedVisitIds.filter((v) => v !== visitId)
      : [...selectedVisitIds, visitId];
    setSelectedVisitIds(next);
    setLines(
      billLines(
        visits.filter((v) => next.includes(v.id)),
        labItems.filter((l) => selectedLabIds.includes(l.id)),
        mergeBills.filter((b) => selectedMergeIds.includes(b.id)),
      ),
    );
  }

  function toggleLab(labId: number) {
    const next = selectedLabIds.includes(labId) ? selectedLabIds.filter((v) => v !== labId) : [...selectedLabIds, labId];
    setSelectedLabIds(next);
    setLines(
      billLines(
        visits.filter((v) => selectedVisitIds.includes(v.id)),
        labItems.filter((l) => next.includes(l.id)),
        mergeBills.filter((b) => selectedMergeIds.includes(b.id)),
      ),
    );
  }

  /** Combine an unpaid bill into this one (or leave it out): its lines and fees come along. */
  function toggleMergeBill(billId: number) {
    const on = !selectedMergeIds.includes(billId);
    const next = on ? [...selectedMergeIds, billId] : selectedMergeIds.filter((b) => b !== billId);
    setSelectedMergeIds(next);
    const b = mergeBills.find((m) => m.id === billId)!;
    const shift = (value: string, cents: number) => centsToRupees(Math.max(0, rupeesToCents(value) + (on ? cents : -cents)));
    setDoctorFee((v) => shift(v, b.doctorFeeCents));
    setConsultantFee((v) => shift(v, b.consultantFeeCents));
    setOtherFee((v) => shift(v, b.otherFeeCents));
    setDiscount((v) => shift(v, b.discountCents));
    setLines(
      billLines(
        visits.filter((v) => selectedVisitIds.includes(v.id)),
        labItems.filter((l) => selectedLabIds.includes(l.id)),
        mergeBills.filter((m) => next.includes(m.id)),
      ),
    );
  }

  // --- totals ----------------------------------------------------------
  // Exactly what gets saved, so the total on screen matches the server's.
  const payload = {
    patientId,
    visitEventIds: selectedVisitIds,
      invoiceDate,
      doctorFeeCents: rupeesToCents(doctorFee),
      consultantFeeCents: rupeesToCents(consultantFee),
      otherFeeCents: rupeesToCents(otherFee),
      otherFeeLabel: otherFeeLabel.trim() || null,
      discountCents: rupeesToCents(discount),
      notes: notes.trim() || null,
      lines: lines
        .filter((l) => l.description.trim())
        .map((l) => ({
          description: l.description.trim(),
          quantity: Number(l.quantity) || 1,
          unitPriceCents: rupeesToCents(l.unitPriceRupees),
          sourceType: l.sourceType ?? null,
          sourceId: l.sourceId ?? null,
        })),
  };
  const itemsCents = payload.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
  const feesCents = payload.doctorFeeCents + payload.consultantFeeCents + payload.otherFeeCents;
  const totalCents = Math.max(0, itemsCents + feesCents - payload.discountCents);
  const payloadJson = JSON.stringify(payload);

  // Remember the bill as loaded; anything different on screen is unsaved.
  useEffect(() => {
    if (!loading && isExisting) setSavedSnapshot(payloadJson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  const unsaved = isExisting && savedSnapshot !== null && payloadJson !== savedSnapshot;

  // A fully paid bill is final: print only. (Cancel a payment to change it.)
  const isPaid = isExisting && bill?.status === 'paid';
  const editable = canManage && !isPaid;

  // Paid / balance follow the total on screen, not just the last save.
  const liveBill: BillStatus | null =
    bill && !bill.paidBeforeTracking
      ? (() => {
          const balanceCents = Math.max(0, totalCents - bill.paidCents);
          const status: BillStatus['status'] = balanceCents === 0 ? 'paid' : bill.paidCents > 0 ? 'part_paid' : 'not_paid';
          return { ...bill, totalCents, balanceCents, status };
        })()
      : bill;

  /** Saves changes to this bill; throws if it can't. */
  async function saveChanges() {
    await mutate(`/invoices/${invoiceId}`, 'PATCH', payload);
    setSavedSnapshot(payloadJson);
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      if (isExisting) {
        await saveChanges();
        setSavedMessage('Saved.');
        setReloadKey((k) => k + 1); // totals changed: refresh the payment status
      } else {
        const created = await mutate<{ id: number; invoiceNumber: string }>('/invoices', 'POST', {
          ...payload,
          mergeInvoiceIds: selectedMergeIds,
        });
        navigate(`/invoices/${created.id}`, { replace: true });
      }
    } catch (err) {
      setError(describeError(err, 'save this invoice'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (error && !clinic) return <ErrorMessage error={error} />;

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1>{isExisting ? `Invoice ${invoiceNumber}` : 'New invoice'}</h1>
          <p>
            For{' '}
            {patientId ? <Link to={`/patients/${patientId}`}>{patientName}</Link> : patientName}
            {patientCode ? ` (${patientCode})` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          {isExisting && (
            <button className="btn" onClick={() => window.print()}>
              Print
            </button>
          )}
          {editable && (
            <button className="btn btn-primary" onClick={() => save()} disabled={saving}>
              {saving ? 'Saving…' : isExisting ? 'Save changes' : 'Save invoice'}
            </button>
          )}
          {isExisting && canManage && (
            <ConfirmDelete
              what="invoice"
              triggerClassName="btn"
              align="right"
              onDelete={() => mutate(`/invoices/${invoiceId}/delete`, 'POST').then(() => undefined)}
              onDeleted={() => navigate(`/patients/${patientId}`)}
            />
          )}
        </div>
      </div>

      <ErrorMessage error={error} className="no-print" />
      {savedMessage && <p className="no-print" style={{ color: 'var(--color-positive)' }}>{savedMessage}</p>}

      {/* Unpaid bills: combined into this new bill. */}
      {!isExisting && mergeBills.length > 0 && (
        <div className="card no-print" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Unpaid bills — combined into this one bill</h3>
          {mergeBills.map((b) => (
            <label key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, fontSize: 14 }}>
              <input type="checkbox" checked={selectedMergeIds.includes(b.id)} onChange={() => toggleMergeBill(b.id)} style={{ width: 'auto' }} />
              <span>
                {b.invoiceNumber} · {b.invoiceDate} · {formatRupees(b.totalCents)}
              </span>
            </label>
          ))}
          <p style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginBottom: 0 }}>
            When you save, the ticked bills are replaced by this one.
          </p>
        </div>
      )}
      {!isExisting && partPaidBills.length > 0 && (
        <div className="card no-print" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Part paid — collect the rest on its own bill</h3>
          {partPaidBills.map((b) => (
            <div key={b.id} style={{ fontSize: 14, marginBottom: 4 }}>
              {b.invoiceNumber} · {b.invoiceDate} · balance <strong>{formatRupees(b.balanceCents)}</strong> ·{' '}
              <Link to={`/invoices/${b.id}`}>Open</Link>
            </div>
          ))}
        </div>
      )}

      {/* Visit picker: only for a brand-new combined bill. */}
      {!isExisting && !visitIdParam && visits.length > 0 && (
        <div className="card no-print" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Which visits does this bill cover?</h3>
          {visits.map((v) => (
            <label key={v.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={selectedVisitIds.includes(v.id)}
                onChange={() => toggleVisit(v.id)}
                style={{ width: 'auto' }}
              />
              <span>
                {v.visit_date} · {v.lines.length} medicine{v.lines.length === 1 ? '' : 's'}
                {v.attending_doctor_name ? ` · ${v.attending_doctor_name}` : ''}
                {v.invoiced_on && (
                  <span style={{ color: 'var(--color-warning)' }}> · already billed on {v.invoiced_on}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}

      {!isExisting && labItems.length > 0 && (
        <div className="card no-print" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Lab tests not billed yet</h3>
          {labItems.map((l) => (
            <label key={l.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, fontSize: 14 }}>
              <input type="checkbox" checked={selectedLabIds.includes(l.id)} onChange={() => toggleLab(l.id)} style={{ width: 'auto' }} />
              <span>
                {l.description} · {formatRupees(l.unitPriceCents)}
              </span>
            </label>
          ))}
        </div>
      )}

      {isExisting && liveBill && invoiceId && (
        <PaymentsPanel
          invoiceId={Number(invoiceId)}
          bill={liveBill}
          payments={payments}
          onChanged={() => setReloadKey((k) => k + 1)}
          beforeReceive={unsaved && editable ? saveChanges : undefined}
        />
      )}

      {/* The bill itself -- this is what prints. */}
      <div className="card invoice-sheet print-doc">
        {clinic && <PrintHeader header={clinic.print} />}
        <div className="invoice-head">
          <div>
            <h2 style={{ margin: 0 }}>{clinic?.name}</h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>INVOICE</div>
            {invoiceNumber && <div style={{ fontFamily: 'var(--font-mono)' }}>{invoiceNumber}</div>}
            <div className="no-print" style={{ marginTop: 6 }}>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} disabled={!editable} />
            </div>
            <div className="print-only">Date: {invoiceDate}</div>
          </div>
        </div>

        <div className="invoice-patient">
          <div>
            <strong>{patientName}</strong>
            {patientCode ? <span style={{ fontFamily: 'var(--font-mono)' }}> · {patientCode}</span> : null}
          </div>
          {patientPhone && <div style={{ fontSize: 13 }}>Phone: {patientPhone}</div>}
        </div>

        <table className="data-table invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: 'right', width: 90 }}>Qty</th>
              <th style={{ textAlign: 'right', width: 120 }}>Rate</th>
              <th style={{ textAlign: 'right', width: 120 }}>Amount</th>
              {editable && <th className="no-print" style={{ width: 90 }}></th>}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const amount = (Number(line.quantity) || 0) * rupeesToCents(line.unitPriceRupees);
              return (
                <tr key={i}>
                  <td>
                    <span className="print-only">{line.description}</span>
                    <input
                      className="no-print"
                      value={line.description}
                      onChange={(e) =>
                        setLines((ls) => ls.map((l, j) => (j === i ? { ...l, description: e.target.value } : l)))
                      }
                      style={{ width: '100%' }}
                      disabled={!editable}
                    />
                  </td>
                  <td className="num">
                    <span className="print-only">{line.quantity}</span>
                    <input
                      className="no-print"
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((ls) => ls.map((l, j) => (j === i ? { ...l, quantity: e.target.value } : l)))
                      }
                      style={{ width: 70, textAlign: 'right' }}
                      disabled={!editable}
                    />
                  </td>
                  <td className="num">
                    <span className="print-only">{formatRupees(rupeesToCents(line.unitPriceRupees))}</span>
                    <input
                      className="no-print"
                      value={line.unitPriceRupees}
                      onChange={(e) =>
                        setLines((ls) => ls.map((l, j) => (j === i ? { ...l, unitPriceRupees: e.target.value } : l)))
                      }
                      style={{ width: 100, textAlign: 'right' }}
                      disabled={!editable}
                    />
                  </td>
                  <td className="num">{formatRupees(amount)}</td>
                  {editable && (
                    <td className="no-print">
                      <button className="btn-text" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr>
                <td colSpan={editable ? 5 : 4} style={{ color: 'var(--color-ink-soft)', textAlign: 'center' }}>
                  No items on this bill yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {editable && (
          <button className="btn no-print" onClick={() => setLines((ls) => [...ls, blankLine()])} style={{ marginBottom: 16 }}>
            Add a line
          </button>
        )}

        <div className="invoice-totals">
          <FeeRow label="Doctor fees" value={doctorFee} onChange={setDoctorFee} editable={editable} />
          <FeeRow label="Consultant fees" value={consultantFee} onChange={setConsultantFee} editable={editable} />
          <FeeRow
            label={otherFeeLabel || 'Other charges'}
            value={otherFee}
            onChange={setOtherFee}
            editable={editable}
            labelEditable={{ value: otherFeeLabel, onChange: setOtherFeeLabel }}
          />
          <div className="invoice-total-row">
            <span>Medicines &amp; items</span>
            <span>{formatRupees(itemsCents)}</span>
          </div>
          <FeeRow label="Discount" value={discount} onChange={setDiscount} editable={editable} negative />
          <div className="invoice-total-row invoice-grand-total">
            <span>Total</span>
            <span>{formatRupees(totalCents)}</span>
          </div>
          {liveBill && !liveBill.paidBeforeTracking && (
            <>
              <div className="invoice-total-row">
                <span>Paid</span>
                <span>{formatRupees(liveBill.paidCents)}</span>
              </div>
              <div className="invoice-total-row" style={{ fontWeight: 700 }}>
                <span>{liveBill.balanceCents === 0 ? 'Fully paid' : 'Balance due'}</span>
                <span>{liveBill.balanceCents === 0 ? '' : formatRupees(liveBill.balanceCents)}</span>
              </div>
            </>
          )}
        </div>

        <div className="invoice-notes">
          <div className="no-print">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-soft)' }}>Notes on the bill</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ width: '100%' }} disabled={!editable} />
          </div>
          {notes && <div className="print-only">{notes}</div>}
        </div>

        <div className="print-only invoice-signature">
          <div>{clinic?.doctorName}</div>
          <div style={{ fontSize: 12 }}>{clinic?.doctorTitle}</div>
        </div>
      </div>
    </div>
  );
}

function FeeRow({
  label,
  value,
  onChange,
  editable,
  negative,
  labelEditable,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  negative?: boolean;
  labelEditable?: { value: string; onChange: (v: string) => void };
}) {
  const cents = rupeesToCents(value);
  return (
    <div className="invoice-total-row">
      <span>
        <span className="print-only">{label}</span>
        {labelEditable ? (
          <input
            className="no-print"
            value={labelEditable.value}
            onChange={(e) => labelEditable.onChange(e.target.value)}
            placeholder="Other charges"
            style={{ width: 150 }}
            disabled={!editable}
          />
        ) : (
          <span className="no-print">{label}</span>
        )}
      </span>
      <span>
        <span className="print-only">
          {negative && cents > 0 ? '− ' : ''}
          {formatRupees(cents)}
        </span>
        <input
          className="no-print"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 100, textAlign: 'right' }}
          disabled={!editable}
        />
      </span>
    </div>
  );
}
