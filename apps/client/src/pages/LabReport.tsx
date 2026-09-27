import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { formatRupees } from '../lib/money.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import { PrintHeader, type PrintHeaderData } from '../components/PrintHeader.js';
import { TakePaymentButton } from '../components/TakePaymentButton.js';
import { formatIndianPhone } from '../lib/phone.js';
import { formatDateTime } from '../lib/datetime.js';

interface ReportResult {
  id: number;
  parameter_name: string;
  method: string | null;
  unit: string | null;
  reference_range: string | null;
  value: string;
  flag: 'H' | 'L' | '!' | null;
}

interface ReportItem {
  id: number;
  test_name: string;
  department: string | null;
  test_sort: number;
  /** Settings > Lab tests: this test always starts on a new printed page. */
  print_new_page: number;
  status: 'pending' | 'completed' | 'cancelled';
  results: ReportResult[];
}

interface Signer {
  name: string | null;
  title: string | null;
  image: string | null;
}

interface ReportPayment {
  billed: boolean;
  paid: boolean;
  balanceCents: number;
  invoiceIds: number[];
  override: { reason: string; by: string | null; at: string } | null;
}

interface ReportData {
  payment: ReportPayment;
  bill: { invoice_number: string; invoice_date: string } | null;
  header: PrintHeaderData;
  order: {
    order_number: string;
    created_at: string;
    sample_collected_at: string | null;
    referring_doctor_name: string | null;
  };
  patient: {
    id: number;
    customer_code: string;
    current_name: string;
    gender: string | null;
    phone_number: string | null;
    age: number | null;
  };
  items: ReportItem[];
  reportDate: string | null;
  signatures: { left: Signer; right: Signer };
}

function sexLabel(gender: string | null): string {
  if (!gender) return '';
  return gender[0].toUpperCase() + gender.slice(1);
}

/** Groups finished tests under their department, in the catalog's order. */
function byDepartment(items: ReportItem[]) {
  const done = items.filter((i) => i.status === 'completed').sort((a, b) => a.test_sort - b.test_sort || a.id - b.id);
  const sections: { title: string; items: ReportItem[] }[] = [];
  for (const item of done) {
    const title = item.department ?? '';
    const section = sections.find((s) => s.title === title) ?? sections[sections.push({ title, items: [] }) - 1];
    section.items.push(item);
  }
  return sections;
}

function Signature({ signer, align }: { signer: Signer; align: 'left' | 'right' }) {
  return (
    <div className={`pd-sig ${align}`}>
      <div className="pd-sig-img">{signer.image && <img src={signer.image} alt="" />}</div>
      <div className="sl" />
      <div className="sn">{signer.name ?? ''}</div>
      <div className="sd">{signer.title ?? ''}</div>
    </div>
  );
}

function PaymentLock({
  orderId,
  patientId,
  payment,
  onReleased,
}: {
  orderId: number;
  patientId: number;
  payment: ReportPayment;
  onReleased: () => void;
}) {
  const canOverride = useHasPermission('payment.override');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="alert alert-critical no-print">
      <strong>Not paid — the report prints after payment.</strong>{' '}
      {payment.billed ? `Balance ${formatRupees(payment.balanceCents)}.` : 'These tests are not on a bill yet.'}
      <div style={{ marginTop: 8 }}>
        <TakePaymentButton patientId={patientId} primary />
      </div>
      {canOverride && !open && (
        <button className="btn-text" style={{ marginLeft: 8 }} onClick={() => setOpen(true)}>
          Emergency: release before payment
        </button>
      )}
      {open && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ minWidth: 280 }} placeholder="Why release before payment? (required)" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          <button
            className="btn"
            disabled={reason.trim().length < 3}
            onClick={async () => {
              try {
                await mutate(`/lab/orders/${orderId}/release`, 'POST', { reason: reason.trim() });
                onReleased();
              } catch (err) {
                setError(describeError(err, 'release the report'));
              }
            }}
          >
            Release report
          </button>
          <button className="btn-text" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      )}
      <ErrorMessage error={error} />
    </div>
  );
}

export function LabReport() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Which tests start on a new printed page (starts from Settings, can be ticked here for this print).
  const [newPage, setNewPage] = useState<Record<number, boolean>>({});

  useEffect(() => {
    get<ReportData>(`/lab/orders/${orderId}/report`)
      .then((d) => {
        setData(d);
        setNewPage(Object.fromEntries(d.items.map((i) => [i.id, i.print_new_page === 1])));
      })
      .catch((err) => setError(describeError(err, 'load the lab report')));
  }, [orderId, reloadKey]);

  // The PDF / print job is named after the patient.
  useEffect(() => {
    if (!data) return;
    const previous = document.title;
    document.title = `Lab Report - ${data.patient.current_name}`;
    return () => {
      document.title = previous;
    };
  }, [data]);

  if (error) return <ErrorMessage error={error} />;
  if (!data) return <p>Loading…</p>;

  const { header, order, patient, signatures } = data;
  const sections = byDepartment(data.items);
  const waiting = data.items.filter((i) => i.status === 'pending').length;
  // The report is handed over only when its tests are paid for (or released in an emergency).
  // TODO(shortcut): enforced in the app; the report data itself is still readable by lab staff.
  const released = data.payment.paid || data.payment.override !== null;
  const ageSex = [patient.age !== null ? `${patient.age} Yrs` : '', sexLabel(patient.gender)].filter(Boolean).join(' / ');

  // Like the paper template: a "new page" test breaks before its own heading,
  // or before its department heading if it is the first test in it -- never
  // before the very first test on the report.
  const breakBefore = new Set<string>();
  sections.forEach((section, si) =>
    section.items.forEach((item, ii) => {
      if (!newPage[item.id] || (si === 0 && ii === 0)) return;
      breakBefore.add(ii === 0 && section.title ? `sec-${si}` : `grp-${item.id}`);
    }),
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Lab report {order.order_number}</h1>
          <p>{patient.current_name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={sections.length === 0 || !released}>
            Print
          </button>
        </div>
      </div>

      {!released && sections.length > 0 && (
        <PaymentLock
          orderId={Number(orderId)}
          patientId={patient.id}
          payment={data.payment}
          onReleased={() => setReloadKey((k) => k + 1)}
        />
      )}
      {data.payment.override && !data.payment.paid && (
        <div className="alert no-print" style={{ border: '1px solid var(--color-border)' }}>
          Released before payment by {data.payment.override.by ?? '—'}: {data.payment.override.reason}
        </div>
      )}

      {waiting > 0 && (
        <div className="alert alert-critical no-print">
          {waiting} test{waiting === 1 ? ' is' : 's are'} still waiting for results and {waiting === 1 ? 'is' : 'are'} not on this
          report.
        </div>
      )}
      {sections.length === 0 && <p className="no-print">No finished results to print yet.</p>}

      {sections.length > 0 && (
        // Hidden from Ctrl+P too until paid or released, not just the Print button.
        <div className={`print-doc lab-sheet${released ? '' : ' no-print'}`}>
          <table className="wrap">
            <thead>
              <tr>
                <td>
                  <PrintHeader header={header} />
                  <div className="pd-title">Laboratory Report</div>
                  <div className="pd-pbox">
                    <div className="pd-kv">
                      <b>Patient Name</b>
                      <span>: {patient.current_name}</span>
                    </div>
                    <div className="pd-kv">
                      <b>UHID</b>
                      <span>: {patient.customer_code}</span>
                    </div>
                    <div className="pd-kv">
                      <b>Age / Sex</b>
                      <span>: {ageSex || '—'}</span>
                    </div>
                    <div className="pd-kv">
                      <b>Bill Date</b>
                      <span>: {data.bill ? formatDateTime(data.bill.invoice_date) : '—'}</span>
                    </div>
                    <div className="pd-kv">
                      <b>Mobile</b>
                      <span>: {patient.phone_number ? formatIndianPhone(patient.phone_number) : '—'}</span>
                    </div>
                    <div className="pd-kv">
                      <b>Sample Date</b>
                      <span>: {formatDateTime(order.sample_collected_at)}</span>
                    </div>
                    <div className="pd-kv">
                      <b>Referred By</b>
                      <span>: {order.referring_doctor_name ?? 'Self'}</span>
                    </div>
                    <div className="pd-kv">
                      <b>Report Date</b>
                      <span>: {formatDateTime(data.reportDate)}</span>
                    </div>
                    <div className="pd-kv">
                      <b>Bill No.</b>
                      <span>: {data.bill?.invoice_number ?? '—'}</span>
                    </div>
                    <div className="pd-kv">
                      <b>Lab No.</b>
                      <span>: {order.order_number}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <table className="pd-rt">
                    <colgroup>
                      <col className="c-name" />
                      <col className="c-meth" />
                      <col className="c-res" />
                      <col className="c-rng" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Methodology</th>
                        <th>Result</th>
                        <th>Ref-Range</th>
                      </tr>
                    </thead>
                    {sections.map((section, si) => (
                      <tbody key={section.title}>
                        {section.title && (
                          <tr className={breakBefore.has(`sec-${si}`) ? 'sec pb' : 'sec'}>
                            <td colSpan={4}>{section.title}</td>
                          </tr>
                        )}
                        {section.items.map((item) => [
                          <tr key={`g-${item.id}`} className={breakBefore.has(`grp-${item.id}`) ? 'grp pb' : 'grp'}>
                            <td colSpan={4}>
                              {item.test_name}
                              <label className="no-print pd-np" title="Start this test on a new printed page">
                                <input
                                  type="checkbox"
                                  checked={Boolean(newPage[item.id])}
                                  onChange={(e) => setNewPage((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                                />{' '}
                                New page
                              </label>
                            </td>
                          </tr>,
                          ...item.results.map((r) => {
                            const hasNumber = /\d/.test(r.value);
                            return (
                              <tr key={r.id}>
                                <td>{r.parameter_name}</td>
                                <td>{r.method ?? ''}</td>
                                <td className={`pd-res${r.flag ? ' hi' : ''}`}>
                                  <span className="val">{r.value}</span>{' '}
                                  {hasNumber && r.unit ? <span className="unit">{r.unit}</span> : null}
                                  {(r.flag === 'H' || r.flag === 'L') && <span className="pd-flag">{r.flag}</span>}
                                </td>
                                <td>{r.reference_range ?? ''}</td>
                              </tr>
                            );
                          }),
                        ])}
                      </tbody>
                    ))}
                  </table>

                  <div className="pd-closing">
                    <div className="pd-end">************ End of the Report ************</div>
                    <div className="pd-signs">
                      <Signature signer={signatures.left} align="left" />
                      <Signature signer={signatures.right} align="right" />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
