import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { getSessionUser } from '../state/auth-store.js';
import { MedicineCombobox } from '../components/MedicineCombobox.js';
import { ErrorMessage } from '../components/ErrorMessage.js';

interface StaffOption {
  id: number;
  full_name: string;
  role_name: string;
}

interface MedicineOption {
  id: number;
  name: string;
  medical_code: string;
  base_unit: string;
  total_remaining: number;
}

interface MedicineLine {
  medicineId: string;
  quantity: string;
  dosageInstructions: string;
  durationDays: string;
}

const EMPTY_LINE: MedicineLine = { medicineId: '', quantity: '', dosageInstructions: '', durationDays: '' };

function nowLocalDateTime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function AddPrescription() {
  const { id } = useParams();
  const patientId = Number(id);
  const navigate = useNavigate();
  const sessionUser = getSessionUser();

  const [patientName, setPatientName] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);

  const [prescribingDoctorId, setPrescribingDoctorId] = useState('');
  const [visitDateTime, setVisitDateTime] = useState(nowLocalDateTime());
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<MedicineLine[]>([{ ...EMPTY_LINE }]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get<{ patient: { current_name: string } }>(`/patients/${patientId}`)
      .then((d) => setPatientName(d.patient.current_name))
      .catch(() => {});
    get<{ staff: StaffOption[] }>('/staff')
      .then((d) => setStaff(d.staff))
      .catch((err) => setError(describeError(err, 'load the staff list')));
    get<{ medicines: MedicineOption[] }>('/medicines')
      .then((d) => setMedicines(d.medicines))
      .catch((err) => setError(describeError(err, 'load the medicine list')));
  }, [patientId]);

  useEffect(() => {
    if (sessionUser && !prescribingDoctorId) setPrescribingDoctorId(String(sessionUser.userId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser]);

  function updateLine(index: number, patch: Partial<MedicineLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validLines = lines.filter((l) => l.medicineId && l.quantity);
    if (validLines.length === 0) {
      setError('Add at least one medicine.');
      return;
    }

    setSaving(true);
    try {
      const visitDate = visitDateTime.replace('T', ' ');
      let followUpId: number | null = null;

      if (isFollowUp) {
        const followUp = await mutate<{ id: number }>('/follow-ups', 'POST', {
          patientId,
          startDate: visitDate.slice(0, 10),
          plannedEndDate: plannedEndDate || null,
          notes: notes || undefined,
          prescribingDoctorId: prescribingDoctorId ? Number(prescribingDoctorId) : undefined,
        });
        followUpId = followUp.id;
      }

      const visit = await mutate<{ id: number }>('/follow-ups/visits', 'POST', {
        patientId,
        followUpId,
        visitDate,
        attendingDoctorId: prescribingDoctorId ? Number(prescribingDoctorId) : undefined,
        // Always saved on the visit itself -- these used to be dropped
        // entirely unless the visit happened to be a multi-day follow-up.
        notes: notes || null,
      });

      for (const line of validLines) {
        try {
          await mutate(`/follow-ups/visits/${visit.id}/prescription-lines`, 'POST', {
            medicineId: Number(line.medicineId),
            quantityPrescribed: Number(line.quantity),
            dosageInstructions: line.dosageInstructions || undefined,
            durationDays: line.durationDays ? Number(line.durationDays) : undefined,
          });
        } catch (err) {
          // Stop here -- earlier lines in this loop already succeeded (each
          // is its own atomic dispense) and stay recorded; only report what
          // failed and which medicine, rather than a generic message that
          // loses which line the problem was actually in.
          const medicineName = medicines.find((m) => String(m.id) === line.medicineId)?.name ?? `medicine #${line.medicineId}`;
          setError(`${medicineName}: ${describeError(err, 'dispense this medicine')}`);
          setSaving(false);
          return;
        }
      }

      navigate(`/patients/${patientId}`);
    } catch (err) {
      setError(describeError(err, 'save the prescription'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Add prescription</h1>
          <p>
            {patientName ? (
              <>
                For <Link to={`/patients/${patientId}`}>{patientName}</Link> — each medicine below is dispensed from
                stock immediately, using the nearest-expiry batch.
              </>
            ) : (
              '…'
            )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 680 }}>
        <div className="form-grid">
          <div className="form-section-title">Visit</div>
          <div className="field">
            <label>Prescribed by</label>
            <select value={prescribingDoctorId} onChange={(e) => setPrescribingDoctorId(e.target.value)} required>
              <option value="">Select staff…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.role_name.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Visit date &amp; time</label>
            <input
              type="datetime-local"
              value={visitDateTime}
              onChange={(e) => setVisitDateTime(e.target.value)}
              required
            />
          </div>

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={isFollowUp}
                onChange={(e) => setIsFollowUp(e.target.checked)}
                style={{ width: 'auto' }}
              />
              This is a multi-day follow-up (e.g. a 3-day course), not a single walk-in visit
            </label>
          </div>
          {isFollowUp && (
            <div className="field">
              <label>Follow-up ends by (optional)</label>
              <input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
            </div>
          )}

          <div className="form-section-title">Medicines</div>
        </div>

        {lines.map((line, i) => (
          <div key={i} className="form-grid" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12, marginBottom: 12 }}>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Medicine</label>
              <MedicineCombobox
                medicines={medicines}
                value={line.medicineId}
                onChange={(medicineId) => updateLine(i, { medicineId })}
              />
            </div>
            <div className="field">
              <label>Quantity</label>
              <input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} required />
            </div>
            <div className="field">
              <label>Duration (days)</label>
              <input type="number" min="1" value={line.durationDays} onChange={(e) => updateLine(i, { durationDays: e.target.value })} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Dosage instructions</label>
              <input
                value={line.dosageInstructions}
                onChange={(e) => updateLine(i, { dosageInstructions: e.target.value })}
                placeholder="e.g. 1 tablet twice daily after food"
              />
            </div>
            {lines.length > 1 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <button type="button" className="btn-text" onClick={() => removeLine(i)}>
                  Remove this medicine
                </button>
              </div>
            )}
          </div>
        ))}

        <button type="button" className="btn" onClick={addLine} style={{ marginBottom: 16 }}>
          Add another medicine
        </button>

        <div className="field">
          <label>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <ErrorMessage error={error} />

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Dispensing…' : 'Save & dispense'}
        </button>
      </form>
    </div>
  );
}
