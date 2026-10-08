import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { OpVisit } from '@platform/shared';
import { Button, Textarea, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';

/**
 * The doctor's note to a counter (pharmacy or lab) for this visit. Whoever writes the prescription /
 * orders the tests can edit it; everyone else who opens the visit just reads it.
 */
export function CounterNote({ branch, visit, field, label, placeholder, canEdit }: { branch: string; visit: OpVisit; field: 'pharmacyNote' | 'labNote'; label: string; placeholder: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const canSave = useCan('patient.edit') && canEdit && visit.status !== 'cancelled'; // the visit update route needs patient.edit
  const saved = visit[field] ?? '';
  const [text, setText] = useState(saved);
  const id = `note-${field}`;
  const save = useMutation({
    mutationFn: () => api.patch(`/b/${branch}/visits/${visit.id}`, { [field]: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit', branch] });
      qc.invalidateQueries({ queryKey: [field === 'pharmacyNote' ? 'pharmacy-queue' : 'lab-queue', branch] });
      qc.invalidateQueries({ queryKey: ['lab-report', branch] });
      toast.success(`${label} saved`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!canSave) {
    if (!saved) return null;
    return (
      <div className="border-t border-border px-4 py-3">
        <div className="text-xs font-medium text-muted">{label}</div>
        <p className="mt-0.5 text-sm whitespace-pre-wrap">{saved}</p>
      </div>
    );
  }
  return (
    <div className="border-t border-border p-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-start gap-2">
        <Textarea id={id} rows={2} maxLength={500} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
        <Button variant="outline" disabled={save.isPending || text.trim() === saved} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save note'}
        </Button>
      </div>
    </div>
  );
}
