import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, mutate, describeError } from '../api/client.js';
import { useHasPermission } from '../state/permissions.js';
import { ErrorMessage } from './ErrorMessage.js';

interface Dues {
  unbilled: unknown[];
  unpaidBills: { id: number }[];
}

/**
 * One button to collect money from a patient: puts everything not billed yet
 * on a new bill (or opens the unpaid bill), landing on the payment box.
 * Hidden for staff who can't take payments.
 */
export function TakePaymentButton({ patientId, primary, label = 'Take payment' }: { patientId: number; primary?: boolean; label?: string }) {
  const canReceive = useHasPermission('payment.receive');
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canReceive) return null;

  async function go() {
    setBusy(true);
    setMessage(null);
    try {
      const dues = await get<Dues>(`/billing/patients/${patientId}`);
      if (dues.unbilled.length > 0) {
        const { id } = await mutate<{ id: number }>(`/billing/patients/${patientId}/quick-bill`, 'POST');
        navigate(`/invoices/${id}`);
      } else if (dues.unpaidBills.length > 0) {
        navigate(`/invoices/${dues.unpaidBills[0].id}`);
      } else {
        setMessage('Nothing to pay — everything is already paid.');
      }
    } catch (err) {
      setMessage(describeError(err, 'open the bill'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button type="button" className={primary ? 'btn btn-primary' : 'btn'} onClick={go} disabled={busy}>
        {busy ? 'Opening bill…' : label}
      </button>
      {message && <ErrorMessage error={message} style={{ margin: 0 }} />}
    </span>
  );
}
