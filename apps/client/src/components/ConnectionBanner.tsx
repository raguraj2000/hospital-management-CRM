import { useEffect, useState } from 'react';
import { subscribeConnectionState, type ConnectionState } from '../state/connection-monitor.js';

export function ConnectionBanner() {
  const [state, setState] = useState<ConnectionState>('online');

  useEffect(() => subscribeConnectionState(setState), []);

  if (state === 'online') return null;

  const background = state === 'offline' ? '#7f1d1d' : state === 'reconnecting' ? '#1e3a5f' : '#78350f';
  const message =
    state === 'offline'
      ? 'Connection to main computer lost — showing last-synced data. New dispenses and edits are disabled until reconnected.'
      : state === 'reconnecting'
        ? 'Connection lost — attempting to restart the server automatically…'
        : 'Connection to main computer is slow — some actions may be delayed.';

  return (
    <div
      role="alert"
      style={{
        background,
        color: 'white',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '14px',
      }}
    >
      {message}
    </div>
  );
}
