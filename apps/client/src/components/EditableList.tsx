import { useState } from 'react';
import { describeError } from '../api/client.js';
import { ConfirmDelete } from './ConfirmDelete.js';

export interface EditableListItem {
  id: number;
  /** Main text, e.g. "Penicillin" or "Diabetes". */
  primary: string;
  /** Optional second field, e.g. severity. */
  secondary?: string | null;
}

/**
 * A small add / edit / delete list, used for a patient's allergies and
 * chronic conditions (one component, two cards). The page supplies the API
 * calls; each one should throw on failure so the error shows here.
 */
export function EditableList({
  title,
  items,
  canEdit,
  noun,
  primaryPlaceholder,
  secondaryPlaceholder,
  onAdd,
  onUpdate,
  onDelete,
}: {
  title: string;
  items: EditableListItem[];
  canEdit: boolean;
  noun: string;
  primaryPlaceholder: string;
  secondaryPlaceholder?: string;
  onAdd: (primary: string, secondary: string | null) => Promise<void>;
  onUpdate: (id: number, primary: string, secondary: string | null) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  // null = not editing; 'new' = the add form; a number = editing that item
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(target: number | 'new', item?: EditableListItem) {
    setEditing(target);
    setPrimary(item?.primary ?? '');
    setSecondary(item?.secondary ?? '');
    setError(null);
  }

  async function save() {
    if (!primary.trim()) {
      setError(`Enter the ${noun}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const sec = secondaryPlaceholder ? secondary.trim() || null : null;
      if (editing === 'new') await onAdd(primary.trim(), sec);
      else if (typeof editing === 'number') await onUpdate(editing, primary.trim(), sec);
      setEditing(null);
    } catch (err) {
      setError(describeError(err, `save this ${noun}`));
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '6px 0' }}>
      <input
        value={primary}
        onChange={(e) => setPrimary(e.target.value)}
        placeholder={primaryPlaceholder}
        autoFocus
        style={{ flex: 2, minWidth: 140 }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
          if (e.key === 'Escape') setEditing(null);
        }}
      />
      {secondaryPlaceholder && (
        <input
          value={secondary}
          onChange={(e) => setSecondary(e.target.value)}
          placeholder={secondaryPlaceholder}
          style={{ flex: 1, minWidth: 100 }}
        />
      )}
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button className="btn" onClick={() => setEditing(null)} disabled={saving}>
        Cancel
      </button>
      {error && <p className="login-error" style={{ width: '100%', margin: 0 }}>{error}</p>}
    </div>
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {canEdit && editing === null && (
          <button className="btn-text" onClick={() => open('new')}>
            + Add
          </button>
        )}
      </div>
      {items.length === 0 && editing !== 'new' && (
        <p style={{ color: 'var(--color-ink-soft)', margin: '8px 0 0' }}>None recorded.</p>
      )}
      <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
        {items.map((item) =>
          editing === item.id ? (
            <li key={item.id} style={{ listStyle: 'none', marginLeft: -18 }}>
              {form}
            </li>
          ) : (
            <li key={item.id} style={{ marginBottom: 4 }}>
              <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>
                  {item.primary}
                  {item.secondary ? <span style={{ color: 'var(--color-ink-soft)' }}> ({item.secondary})</span> : null}
                </span>
                {canEdit && editing === null && (
                  <>
                    <button className="btn-text" onClick={() => open(item.id, item)}>
                      Edit
                    </button>
                    <ConfirmDelete what={noun} onDelete={() => onDelete(item.id)} />
                  </>
                )}
              </span>
            </li>
          ),
        )}
      </ul>
      {editing === 'new' && form}
    </div>
  );
}
