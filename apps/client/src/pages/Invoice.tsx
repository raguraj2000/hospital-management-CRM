import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { ConfirmDelete } from '../components/ConfirmDelete.js';
import { centsToRupees, formatRupees, rupeesToCents } from '../lib/money.js';

interface Clinic {
  name: string;
  addressLine: string;
  doctorName: string;
  doctorTitle: string;
  phone: string;
}

interface DraftVisit {
  id: number;
  visit_date: string;
  notes: string | null;
  attending_doctor_name: string | null;
  invoiced_on: string | null;
  lines: { description: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
}

interface EditableLine {
  description: string;
  quantity: string;
  unitPriceRupees: string;
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
          setLines(
            d.lines.map((l: any) => ({
              description: l.description,
              quantity: String(l.quantity),
              unitPriceRupees: centsToRupees(l.unit_price_cents),
            })),
          );
        } else {
          const [draft, patient] = await Promise.all([
            get<{ clinic: Clinic; defaults: any; visits: DraftVisit[] }>(`/invoices/draft?patientId=${patientIdParam}`),
            get<{ patient: any }>(`/patients/${patientIdParam}`),
          ]);
          if (cancelled) return;
          setClinic(draft.clinic);
          setPatientName(patient.patient.current_name);
          setPatientCode(patient.patient.customer_code);
          setPatientPhone(patient.patient.phone_number ?? null);
          setVisits(draft.visits);
          setDoctorFee(centsToRupees(draft.defaults.doctorFeeCents));
          setConsultantFee(centsToRupees(draft.defaults.consultantFeeCents));
          setOtherFeeLabel(draft.defaults.otherFeeLabel || 'Other charges');

          // One prescription -> just that visit. Otherwise pre-tick every
          // visit that hasn't been billed yet.
          const preselected = visitIdParam
            ? draft.visits.filter((v) => v.id === Number(visitIdParam))
            : draft.visits.filter((v) => !v.invoiced_on);
          setSelectedVisitIds(preselected.map((v) => v.id));
          setLines(linesForVisits(preselected));
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
  }, [invoiceId, patientIdParam, visitIdParam]);

  function linesForVisits(chosen: DraftVisit[]): EditableLine[] {
    return chosen.flatMap((v) =>
      v.lines.map((l) => ({
        description: l.description,
        quantity: String(l.quantity),
        unitPriceRupees: centsToRupees(l.unitPriceCents),
      })),
    );
  }

  function toggleVisit(visitId: number) {
    const next = selectedVisitIds.includes(visitId)
      ? selectedVisitIds.filter((v) => v !== visitId)
      : [...selectedVisitIds, visitId];
    setSelectedVisitIds(next);
    setLines(linesForVisits(visits.filter((v) => next.includes(v.id))));
  }

  // --- totals ----------------------------------------------------------
  const itemsCents = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * rupeesToCents(l.unitPriceRupees), 0);
  const feesCents = rupeesToCents(doctorFee) + rupeesToCents(consultantFee) + rupeesToCents(otherFee);
  const totalCents = Math.max(0, itemsCents + feesCents - rupeesToCents(discount));

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMessage(null);
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
        })),
    };
    try {
      if (isExisting) {
        await mutate(`/invoices/${invoiceId}`, 'PATCH', payload);
        setSavedMessage('Saved.');
      } else {
        const created = await mutate<{ id: number; invoiceNumber: string }>('/invoices', 'POST', payload);
        navigate(`/invoices/${created.id}`, { replace: true });
      }
    } catch (err) {
      setError(describeError(err, 'save this invoice'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (error && !clinic) return <p className="login-error">{error}</p>;

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
          {isExisting && (
            <button className="btn" onClick={() => window.print()}>
              Print
            </button>
          )}
          {canManage && (
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

      {error && <p className="login-error no-print">{error}</p>}
      {savedMessage && <p className="no-print" style={{ color: 'var(--color-positive)' }}>{savedMessage}</p>}

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

      {/* The bill itself -- this is what prints. */}
      <div className="card invoice-sheet">
        <div className="invoice-head">
          <div>
            <h2 style={{ margin: 0 }}>{clinic?.name}</h2>
            <div style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>{clinic?.addressLine}</div>
            <div style={{ fontSize: 13 }}>
              {clinic?.doctorName}
              {clinic?.doctorTitle ? `, ${clinic.doctorTitle}` : ''}
            </div>
            <div style={{ fontSize: 13 }}>Phone: {clinic?.phone}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>INVOICE</div>
            {invoiceNumber && <div style={{ fontFamily: 'var(--font-mono)' }}>{invoiceNumber}</div>}
            <div className="no-print" style={{ marginTop: 6 }}>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
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
              {canManage && <th className="no-print" style={{ width: 90 }}></th>}
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
                      disabled={!canManage}
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
                      disabled={!canManage}
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
                      disabled={!canManage}
                    />
                  </td>
                  <td className="num">{formatRupees(amount)}</td>
                  {canManage && (
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
                <td colSpan={canManage ? 5 : 4} style={{ color: 'var(--color-ink-soft)', textAlign: 'center' }}>
                  No items on this bill yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {canManage && (
          <button className="btn no-print" onClick={() => setLines((ls) => [...ls, blankLine()])} style={{ marginBottom: 16 }}>
            Add a line
          </button>
        )}

        <div className="invoice-totals">
          <FeeRow label="Doctor fees" value={doctorFee} onChange={setDoctorFee} editable={canManage} />
          <FeeRow label="Consultant fees" value={consultantFee} onChange={setConsultantFee} editable={canManage} />
          <FeeRow
            label={otherFeeLabel || 'Other charges'}
            value={otherFee}
            onChange={setOtherFee}
            editable={canManage}
            labelEditable={{ value: otherFeeLabel, onChange: setOtherFeeLabel }}
          />
          <div className="invoice-total-row">
            <span>Medicines &amp; items</span>
            <span>{formatRupees(itemsCents)}</span>
          </div>
          <FeeRow label="Discount" value={discount} onChange={setDiscount} editable={canManage} negative />
          <div className="invoice-total-row invoice-grand-total">
            <span>Total</span>
            <span>{formatRupees(totalCents)}</span>
          </div>
        </div>

        <div className="invoice-notes">
          <div className="no-print">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-soft)' }}>Notes on the bill</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ width: '100%' }} disabled={!canManage} />
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
