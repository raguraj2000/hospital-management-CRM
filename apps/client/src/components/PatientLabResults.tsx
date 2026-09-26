import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api/client.js';
import { formatDateTime } from '../lib/datetime.js';
import type { LabFlag } from '@clinic/shared';
import { LoadMore, FIRST_SHOWN, LOAD_STEP } from './LoadMore.js';

interface Result {
  id: number;
  parameter_name: string;
  unit: string | null;
  reference_range: string | null;
  value: string;
  flag: LabFlag;
}

interface Item {
  id: number;
  test_name: string;
  status: 'pending' | 'completed' | 'cancelled';
  completed_at: string | null;
  results: Result[];
}

interface OrderDetail {
  order: { id: number; order_number: string; created_at: string; referring_doctor_name: string | null };
  items: Item[];
}


/** Lab tests ordered for this patient, newest first, with their results. */
export function PatientLabResults({ patientId }: { patientId: string }) {
  const [orders, setOrders] = useState<OrderDetail[] | null>(null);
  const [shown, setShown] = useState(FIRST_SHOWN);

  useEffect(() => {
    get<{ orders: OrderDetail[] }>(`/lab/patients/${patientId}`)
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]));
  }, [patientId]);

  if (orders === null) return <p>Loading…</p>;
  if (orders.length === 0) {
    return <p style={{ color: 'var(--color-ink-soft)', marginBottom: 24 }}>No lab tests ordered yet.</p>;
  }

  const visible = orders.slice(0, shown);
  return (
    <div style={{ marginBottom: 24 }}>
      {visible.map(({ order, items }) => {
        const waiting = items.filter((i) => i.status === 'pending').length;
        const done = items.filter((i) => i.status === 'completed');
        return (
          <section key={order.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{order.order_number}</strong>
              <span className="date-chip">Ordered {formatDateTime(order.created_at)}</span>
              {order.referring_doctor_name && (
                <span style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>{order.referring_doctor_name}</span>
              )}
              {waiting > 0 ? (
                <span className="badge badge-warning">{waiting} waiting</span>
              ) : (
                <span className="badge badge-positive">Completed</span>
              )}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <Link to={`/lab/orders/${order.id}`} className="btn">
                  Open
                </Link>
                {done.length > 0 && (
                  <Link to={`/lab/orders/${order.id}/report`} className="btn">
                    Print report
                  </Link>
                )}
              </span>
            </div>

            {done.map((item) => (
              <div key={item.id} style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.test_name}</div>
                <table className="data-table" style={{ fontSize: 13 }}>
                  <tbody>
                    {item.results.map((r) => (
                      <tr key={r.id} className={r.flag ? 'row-critical' : undefined}>
                        <td style={{ width: '40%' }}>{r.parameter_name}</td>
                        <td style={{ fontWeight: r.flag ? 700 : undefined }}>
                          {r.value} {/\d/.test(r.value) ? (r.unit ?? '') : ''}
                          {(r.flag === 'H' || r.flag === 'L') && (
                            <span className="badge badge-critical" style={{ marginLeft: 6 }}>
                              {r.flag}
                            </span>
                          )}
                        </td>
                        <td style={{ color: 'var(--color-ink-soft)' }}>{r.reference_range ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {waiting > 0 && done.length === 0 && (
              <p style={{ color: 'var(--color-ink-soft)', fontSize: 13, marginBottom: 0 }}>
                {items
                  .filter((i) => i.status === 'pending')
                  .map((i) => i.test_name)
                  .join(', ')}{' '}
                — waiting for results.
              </p>
            )}
          </section>
        );
      })}
      <LoadMore shown={shown} total={orders.length} onMore={() => setShown((n) => n + LOAD_STEP)} />
    </div>
  );
}
