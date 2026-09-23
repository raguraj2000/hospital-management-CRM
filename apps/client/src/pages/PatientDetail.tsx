import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get, mutate, describeError, getServerBaseUrl } from '../api/client.js';
import { getAuthToken } from '../state/auth-store.js';
import { useHasPermission } from '../state/permissions.js';
import { PhoneInput } from '../components/PhoneInput.js';
import { ConfirmDelete } from '../components/ConfirmDelete.js';
import { EditableList } from '../components/EditableList.js';
import { formatIndianPhone, toIndianDigits, toIndianPhoneValue } from '../lib/phone.js';

interface PrescriptionLine {
  id: number;
  medicine_name: string;
  quantity_prescribed: number;
  dosage_instructions: string | null;
  duration_days: number | null;
}

interface VisitRow {
  id: number;
  visit_date: string;
  follow_up_id: number | null;
  attending_doctor_name: string | null;
  follow_up_planned_end_date: string | null;
  notes: string | null;
  follow_up_notes: string | null;
  prescriptionLines: PrescriptionLine[];
}

/** Notes recorded with the prescription, shown on the visit and editable in place. */
function VisitNotes({ visit, canEdit, onSaved }: { visit: VisitRow; canEdit: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(visit.notes ?? visit.follow_up_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = visit.notes ?? visit.follow_up_notes;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await mutate(`/follow-ups/visits/${visit.id}/notes`, 'PATCH', { notes: text.trim() || null });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(describeError(err, 'save these notes'));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div style={{ marginBottom: 8 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} style={{ width: '100%' }} autoFocus />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save notes'}
          </button>
          <button className="btn" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
        </div>
        {error && <p className="login-error" style={{ marginBottom: 0 }}>{error}</p>}
      </div>
    );
  }

  if (!shown) {
    return canEdit ? (
      <button className="btn-text" style={{ marginBottom: 8 }} onClick={() => setEditing(true)}>
        + Add notes
      </button>
    ) : null;
  }

  return (
    <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 13 }}>
        <span style={{ color: 'var(--color-ink-soft)' }}>Notes: </span>
        {shown}
      </span>
      {canEdit && (
        <button className="btn-text" onClick={() => setEditing(true)}>
          Edit
        </button>
      )}
    </div>
  );
}

interface InvoiceRow {
  id: number;
  invoice_number: string;
  invoice_date: string;
  total_cents: number;
}

interface LabReportRow {
  id: number;
  title: string;
  report_datetime: string;
  notes: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  uploaded_by_name: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-positive',
  inactive: 'badge-neutral',
  deceased: 'badge-critical',
  merged: 'badge-neutral',
};

async function downloadLabReportFile(id: number, fileName: string) {
  const token = getAuthToken();
  const res = await fetch(`${getServerBaseUrl()}/lab-reports/${id}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function EditablePrescriptionRow({
  visitId,
  line,
  canEdit,
  onSaved,
}: {
  visitId: number;
  line: PrescriptionLine;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(line.quantity_prescribed));
  const [dosage, setDosage] = useState(line.dosage_instructions ?? '');
  const [duration, setDuration] = useState(line.duration_days ? String(line.duration_days) : '');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const newQuantity = Number(quantity);
      if (newQuantity !== line.quantity_prescribed) {
        // Quantity changes stock (it voids what was dispensed and
        // re-dispenses the new amount), so it can fail on insufficient
        // stock -- do it first and stop here if it does, before touching
        // dosage/duration, so nothing is half-saved.
        await mutate(`/follow-ups/visits/${visitId}/prescription-lines/${line.id}/quantity`, 'PATCH', {
          quantity: newQuantity,
        });
      }
      await mutate(`/follow-ups/visits/${visitId}/prescription-lines/${line.id}`, 'PATCH', {
        dosageInstructions: dosage || null,
        durationDays: duration ? Number(duration) : null,
      });
      setEditing(false);
      onSaved();
    } catch (err) {
      setStatus(describeError(err, 'save this prescription'));
    } finally {
      setSaving(false);
    }
  }

  // Throws on failure so ConfirmDelete shows the reason and keeps the panel open.
  async function confirmDelete() {
    setStatus(null);
    await mutate(`/follow-ups/visits/${visitId}/prescription-lines/${line.id}/delete`, 'POST');
    onSaved();
  }

  if (editing) {
    return (
      <tr>
        <td>{line.medicine_name}</td>
        <td className="num">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ width: 70, textAlign: 'right' }}
          />
        </td>
        <td colSpan={2}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Dosage instructions" style={{ flex: 1 }} />
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Days"
              style={{ width: 70 }}
            />
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
          </div>
          {status && <p className="login-error" style={{ marginTop: 4, marginBottom: 0 }}>{status}</p>}
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr>
        <td>{line.medicine_name}</td>
        <td className="num">{line.quantity_prescribed}</td>
        <td>{line.dosage_instructions ?? '—'}</td>
        <td className="num" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
          {line.duration_days ? `${line.duration_days}d` : '—'}
          {canEdit && (
            <>
              <button className="btn-text" onClick={() => setEditing(true)}>
                Edit
              </button>
              <ConfirmDelete
                what="medicine from the prescription (stock is returned)"
                onDelete={confirmDelete}
                align="right"
              />
            </>
          )}
        </td>
      </tr>
      {status && (
        <tr>
          <td colSpan={4} style={{ padding: '0 0 8px' }}>
            <p className="login-error" style={{ margin: 0 }}>{status}</p>
          </td>
        </tr>
      )}
    </>
  );
}

interface EditableFields {
  currentName: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  bloodPressure: string;
  address: string;
  weightKg: string;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

function EditPatientForm({
  patientId,
  patient,
  onSaved,
  onCancel,
}: {
  patientId: string;
  patient: any;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EditableFields>({
    currentName: patient.current_name ?? '',
    dob: patient.dob ?? '',
    gender: patient.gender ?? '',
    bloodGroup: patient.blood_group ?? '',
    bloodPressure: patient.blood_pressure ?? '',
    address: patient.address ?? '',
    weightKg: patient.weight_kg != null ? String(patient.weight_kg) : '',
    phoneNumber: patient.phone_number ? toIndianDigits(patient.phone_number) : '',
    emergencyContactName: patient.emergency_contact_name ?? '',
    emergencyContactPhone: patient.emergency_contact_phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof EditableFields>(key: K) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.currentName.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await mutate(`/patients/${patientId}`, 'PATCH', {
        currentName: form.currentName.trim(),
        dob: form.dob || null,
        gender: form.gender || null,
        bloodGroup: form.bloodGroup || null,
        bloodPressure: form.bloodPressure || null,
        address: form.address || null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        phoneNumber: toIndianPhoneValue(form.phoneNumber),
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
      });
      onSaved();
    } catch (err) {
      setError(describeError(err, 'save these changes'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24, maxWidth: 640 }}>
      <h3 style={{ marginTop: 0 }}>Edit patient details</h3>
      <div className="form-grid">
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="edit-name">Full name</label>
          <input id="edit-name" {...field('currentName')} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="edit-phone">Phone number</label>
          <PhoneInput id="edit-phone" value={form.phoneNumber} onChange={(v) => setForm((f) => ({ ...f, phoneNumber: v }))} />
        </div>
        <div className="field">
          <label htmlFor="edit-dob">Date of birth</label>
          <input id="edit-dob" type="date" {...field('dob')} />
        </div>
        <div className="field">
          <label htmlFor="edit-gender">Gender</label>
          <select id="edit-gender" {...field('gender')}>
            <option value="">Not specified</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="edit-bloodgroup">Blood group</label>
          <select id="edit-bloodgroup" {...field('bloodGroup')}>
            <option value="">Unknown</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="edit-weight">Weight (kg)</label>
          <input id="edit-weight" type="number" step="0.1" min="0" {...field('weightKg')} />
        </div>
        <div className="field">
          <label htmlFor="edit-bp">Blood pressure</label>
          <input id="edit-bp" placeholder="e.g. 120/80" {...field('bloodPressure')} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="edit-address">Address</label>
          <input id="edit-address" {...field('address')} />
        </div>
        <div className="form-section-title">Emergency contact</div>
        <div className="field">
          <label htmlFor="edit-ec-name">Contact name</label>
          <input id="edit-ec-name" {...field('emergencyContactName')} />
        </div>
        <div className="field">
          <label htmlFor="edit-ec-phone">Contact phone</label>
          <input id="edit-ec-phone" {...field('emergencyContactPhone')} />
        </div>
      </div>
      {error && <p className="login-error">{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeletePatientButton({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  return (
    <ConfirmDelete
      what="patient and all their records"
      triggerLabel="Delete patient"
      triggerClassName="btn"
      align="right"
      onDelete={() => mutate(`/patients/${patientId}/delete`, 'POST').then(() => undefined)}
      onDeleted={() => navigate('/patients')}
    />
  );
}

function DeleteVisitButton({ visitId, onDeleted }: { visitId: number; onDeleted: () => void }) {
  return (
    <ConfirmDelete
      what="visit and its medicines"
      triggerLabel="Delete visit"
      onDelete={() => mutate(`/follow-ups/visits/${visitId}/delete`, 'POST').then(() => undefined)}
      onDeleted={onDeleted}
    />
  );
}

function LabReportFileCell({ report }: { report: LabReportRow }) {
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const isImage = (report.file_mime_type ?? '').startsWith('image/');

  async function handleDownload() {
    if (downloadState === 'downloading') return; // guards the accidental double-click that looked like "nothing happened"
    setDownloadState('downloading');
    try {
      await downloadLabReportFile(report.id, report.file_name!);
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 2000);
    } catch {
      setDownloadState('idle');
    }
  }

  async function handleView() {
    const token = getAuthToken();
    const res = await fetch(`${getServerBaseUrl()}/lab-reports/${report.id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (isImage) {
      setViewUrl(url);
    } else {
      window.open(url, '_blank');
    }
  }

  if (!report.file_name) return <>—</>;

  return (
    <>
      <span style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {isImage && (
          <button className="btn-text" onClick={handleView}>
            View
          </button>
        )}
        <button className="btn-text" onClick={handleDownload} disabled={downloadState === 'downloading'}>
          {downloadState === 'downloading' ? 'Downloading…' : downloadState === 'done' ? 'Downloaded ✓' : 'Download'}
        </button>
      </span>
      {viewUrl && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            URL.revokeObjectURL(viewUrl);
            setViewUrl(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out',
          }}
        >
          <img src={viewUrl} alt={report.title} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
        </div>
      )}
    </>
  );
}

export function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [visits, setVisits] = useState<VisitRow[] | null>(null);
  const [labReports, setLabReports] = useState<LabReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canPrescribe = useHasPermission('patient.editMedicalInstructions');
  const canDeletePatient = useHasPermission('patient.merge');
  const canEditPatient = useHasPermission('patient.edit');
  const canManageInvoices = useHasPermission('invoice.manage');
  const canViewInvoices = useHasPermission('invoice.view');
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [editing, setEditing] = useState(false);

  function load() {
    get(`/patients/${id}`)
      .then(setData)
      .catch((err) => setError(describeError(err, 'load this patient')));
    get<{ visits: VisitRow[] }>(`/follow-ups?patientId=${id}`)
      .then((d) => setVisits(d.visits))
      .catch(() => setVisits([]));
    get<{ reports: LabReportRow[] }>(`/lab-reports?patientId=${id}`)
      .then((d) => setLabReports(d.reports))
      .catch(() => setLabReports([]));
    get<{ invoices: InvoiceRow[] }>(`/invoices?patientId=${id}`)
      .then((d) => setInvoices(d.invoices))
      .catch(() => setInvoices([]));
  }

  useEffect(load, [id]);

  // Throws on failure so ConfirmDelete can show why (it used to fail silently).
  async function deleteLabReport(reportId: number) {
    await mutate(`/lab-reports/${reportId}/delete`, 'POST');
    load();
  }

  if (error) return <p className="login-error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { patient, allergies, conditions } = data;

  return (
    <div>
      <button className="btn-text" onClick={() => navigate('/patients')} style={{ marginBottom: 16 }}>
        ← Back to patients
      </button>

      <div className="page-header">
        <div>
          <h1>
            {patient.current_name}{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 16 }}>({patient.customer_code})</span>
          </h1>
          <span className={`badge ${STATUS_BADGE[patient.status] ?? 'badge-neutral'}`}>{patient.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {canEditPatient && !editing && (
            <button className="btn" onClick={() => setEditing(true)}>
              Edit details
            </button>
          )}
          {canPrescribe && (
            <Link to={`/patients/${id}/lab-reports/new`} className="btn">
              Add lab report
            </Link>
          )}
          {canManageInvoices && (
            <Link to={`/patients/${id}/invoice`} className="btn">
              Create invoice
            </Link>
          )}
          {canPrescribe && (
            <Link to={`/patients/${id}/prescribe`} className="btn btn-primary">
              Add prescription
            </Link>
          )}
          {canDeletePatient && <DeletePatientButton patientId={id!} />}
        </div>
      </div>

      {editing && (
        <EditPatientForm
          patientId={id!}
          patient={patient}
          onSaved={() => {
            setEditing(false);
            load();
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="meta-row" style={{ marginBottom: 24 }}>
        <div className="meta-item">
          <span className="meta-label">Date of birth</span>
          <span className="meta-value">{patient.dob ?? '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Blood group</span>
          <span className="meta-value">{patient.blood_group ?? '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Phone</span>
          <span className="meta-value">{formatIndianPhone(patient.phone_number)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Blood pressure</span>
          <span className="meta-value">{patient.blood_pressure ?? '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Address</span>
          <span className="meta-value">{patient.address ?? '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Emergency contact</span>
          <span className="meta-value">
            {patient.emergency_contact_name ? `${patient.emergency_contact_name} · ` : ''}
            {patient.emergency_contact_phone ?? '—'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <EditableList
          title="Allergies"
          noun="allergy"
          canEdit={canPrescribe}
          items={allergies.map((a: any) => ({ id: a.id, primary: a.allergen, secondary: a.severity }))}
          primaryPlaceholder="e.g. Penicillin"
          secondaryPlaceholder="Severity (optional)"
          onAdd={async (allergen, severity) => {
            await mutate(`/patients/${id}/allergies`, 'POST', { allergen, severity });
            load();
          }}
          onUpdate={async (allergyId, allergen, severity) => {
            await mutate(`/patients/${id}/allergies/${allergyId}`, 'PATCH', { allergen, severity });
            load();
          }}
          onDelete={async (allergyId) => {
            await mutate(`/patients/${id}/allergies/${allergyId}/delete`, 'POST');
            load();
          }}
        />
        <EditableList
          title="Chronic conditions"
          noun="condition"
          canEdit={canPrescribe}
          items={conditions.map((c: any) => ({ id: c.id, primary: c.condition_name }))}
          primaryPlaceholder="e.g. Diabetes"
          onAdd={async (conditionName) => {
            await mutate(`/patients/${id}/conditions`, 'POST', { conditionName });
            load();
          }}
          onUpdate={async (conditionId, conditionName) => {
            await mutate(`/patients/${id}/conditions/${conditionId}`, 'PATCH', { conditionName });
            load();
          }}
          onDelete={async (conditionId) => {
            await mutate(`/patients/${id}/conditions/${conditionId}/delete`, 'POST');
            load();
          }}
        />
      </div>

      <h2>Lab reports</h2>
      {labReports === null && <p>Loading…</p>}
      {labReports !== null && labReports.length === 0 && (
        <p style={{ color: 'var(--color-ink-soft)', marginBottom: 24 }}>No lab reports recorded yet.</p>
      )}
      {labReports !== null && labReports.length > 0 && (
        <table className="data-table" style={{ marginBottom: 24 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Notes</th>
              <th>Uploaded by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {labReports.map((r) => (
              <tr key={r.id}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{r.report_datetime}</td>
                <td>{r.title}</td>
                <td>{r.notes ?? '—'}</td>
                <td>{r.uploaded_by_name}</td>
                <td style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <LabReportFileCell report={r} />
                  {canPrescribe && (
                    <Link to={`/patients/${id}/lab-reports/${r.id}/edit`} className="btn-text" style={{ textDecoration: 'none' }}>
                      Edit
                    </Link>
                  )}
                  {canPrescribe && <ConfirmDelete what="lab report" onDelete={() => deleteLabReport(r.id)} align="right" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canViewInvoices && invoices !== null && invoices.length > 0 && (
        <>
          <h2>Invoices</h2>
          <table className="data-table" style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th>Number</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.invoice_number}</td>
                  <td>{inv.invoice_date}</td>
                  <td className="num">₹{(inv.total_cents / 100).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/invoices/${inv.id}`} className="btn-text" style={{ textDecoration: 'none' }}>
                      Open / print
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Follow-ups &amp; prescriptions</h2>
      {visits === null && <p>Loading…</p>}
      {visits !== null && visits.length === 0 && (
        <p style={{ color: 'var(--color-ink-soft)' }}>No prescriptions recorded yet.</p>
      )}
      {visits !== null &&
        visits.map((v) => (
          <div key={v.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{v.visit_date}</strong>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>
                  {v.follow_up_id ? 'Follow-up visit' : 'Walk-in visit'}
                  {v.attending_doctor_name ? ` · ${v.attending_doctor_name}` : ''}
                  {v.follow_up_planned_end_date ? ` · through ${v.follow_up_planned_end_date}` : ''}
                </span>
                {canManageInvoices && (
                  <Link to={`/patients/${id}/invoice?visitId=${v.id}`} className="btn-text" style={{ textDecoration: 'none' }}>
                    Bill
                  </Link>
                )}
                {canPrescribe && <DeleteVisitButton visitId={v.id} onDeleted={load} />}
              </span>
            </div>
            <VisitNotes visit={v} canEdit={canPrescribe} onSaved={load} />
            {v.prescriptionLines.length === 0 ? (
              <p style={{ color: 'var(--color-ink-soft)', margin: 0, fontSize: 13 }}>No medicines recorded for this visit.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                    <th>Dosage</th>
                    <th style={{ textAlign: 'right' }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {v.prescriptionLines.map((line) => (
                    <EditablePrescriptionRow key={line.id} visitId={v.id} line={line} canEdit={canPrescribe} onSaved={load} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
    </div>
  );
}
