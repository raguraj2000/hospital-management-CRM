import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { mutate, ApiError, describeError } from '../api/client.js';
import { PhoneInput } from '../components/PhoneInput.js';
import { toIndianPhoneValue } from '../lib/phone.js';
import { ErrorMessage } from '../components/ErrorMessage.js';

interface FormState {
  currentName: string;
  dob: string;
  ageYearsAtRegistration: string;
  weightKg: string;
  gender: string;
  bloodGroup: string;
  bloodPressure: string;
  address: string;
  phoneNumber: string;
  aadharNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  isProvisional: boolean;
}

const EMPTY: FormState = {
  currentName: '',
  dob: '',
  ageYearsAtRegistration: '',
  weightKg: '',
  gender: '',
  bloodGroup: '',
  bloodPressure: '',
  address: '',
  phoneNumber: '',
  aadharNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  isProvisional: false,
};

export function AddPatient() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ customer_code: string; id: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function field<K extends keyof FormState>(key: K) {
    return {
      value: form[key] as any,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function submit(confirmDuplicate: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        currentName: form.currentName.trim(),
        dob: form.dob || null,
        ageYearsAtRegistration: form.ageYearsAtRegistration ? Number(form.ageYearsAtRegistration) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        gender: form.gender || null,
        bloodGroup: form.bloodGroup || null,
        bloodPressure: form.bloodPressure || null,
        address: form.address || null,
        phoneNumber: toIndianPhoneValue(form.phoneNumber),
        aadharNumber: form.aadharNumber || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        isProvisional: form.isProvisional,
        confirmDuplicate,
      };
      const result = await mutate<{ id: number }>('/patients', 'POST', payload);
      navigate(`/patients/${result.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && (err.body as any)?.warning === 'duplicate_name_dob') {
        setDuplicateWarning((err.body as any).existingPatient);
      } else {
        setError(describeError(err, 'save this patient'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.currentName.trim()) {
      setError('Name is required.');
      return;
    }
    setDuplicateWarning(null);
    submit(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Register a new patient</h1>
          <p>A Customer ID is assigned automatically once saved.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
        <div className="form-grid">
          <div className="form-section-title">Identity</div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="currentName">Full name</label>
            <input id="currentName" {...field('currentName')} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="phoneNumber">Phone number</label>
            <PhoneInput id="phoneNumber" value={form.phoneNumber} onChange={(v) => setForm((f) => ({ ...f, phoneNumber: v }))} />
          </div>
          <div className="field">
            <label htmlFor="dob">Date of birth</label>
            <input id="dob" type="date" {...field('dob')} />
          </div>
          <div className="field">
            <label htmlFor="ageYears">Age (if DOB unknown)</label>
            <input id="ageYears" type="number" min="0" {...field('ageYearsAtRegistration')} />
          </div>
          <div className="field">
            <label htmlFor="gender">Gender</label>
            <select id="gender" {...field('gender')}>
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="bloodGroup">Blood group</label>
            <select id="bloodGroup" {...field('bloodGroup')}>
              <option value="">Unknown</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="weightKg">Weight (kg)</label>
            <input id="weightKg" type="number" step="0.1" min="0" {...field('weightKg')} />
          </div>
          <div className="field">
            <label htmlFor="bloodPressure">Blood pressure</label>
            <input id="bloodPressure" placeholder="e.g. 120/80" {...field('bloodPressure')} />
          </div>
          <div className="field">
            <label htmlFor="aadhar">Aadhar number</label>
            <input id="aadhar" {...field('aadharNumber')} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="address">Address</label>
            <input id="address" {...field('address')} />
          </div>

          <div className="form-section-title">Emergency contact</div>
          <div className="field">
            <label htmlFor="ecName">Contact name</label>
            <input id="ecName" {...field('emergencyContactName')} />
          </div>
          <div className="field">
            <label htmlFor="ecPhone">Contact phone</label>
            <input id="ecPhone" {...field('emergencyContactPhone')} />
          </div>

          <div className="form-section-title">Record status</div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={form.isProvisional}
                onChange={(e) => setForm((f) => ({ ...f, isProvisional: e.target.checked }))}
                style={{ width: 'auto' }}
              />
              Temporary / unknown patient — reconcile identity later
            </label>
          </div>
        </div>

        {duplicateWarning && (
          <div className="error-message" style={{ marginTop: 8 }}>
            A patient named "{form.currentName}" with the same date of birth already exists (
            {duplicateWarning.customer_code}).{' '}
            <button type="button" className="btn-text" onClick={() => submit(true)} disabled={submitting}>
              Save as a new patient anyway
            </button>
          </div>
        )}
        <ErrorMessage error={error} />

        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
