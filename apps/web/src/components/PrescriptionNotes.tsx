// Notes and instructions between the medicines of a prescription ("Stop if the fever goes", "Check BP tomorrow").
// The doctor writes them in the prescription; the pharmacy and the counter read them with the medicines.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, GripVertical, Pencil, StickyNote, X } from 'lucide-react';
import type { PrescriptionItem, PrescriptionNote } from '@platform/shared';
import { Button, cn, Input, NativeSelect, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';

export const NOTE_WORD = { note: 'Note', instruction: 'Instruction' } as const;
const NOTE_ICON = { note: StickyNote, instruction: ClipboardCheck } as const;

/** Medicines and notes in one list, in the doctor's order: notes at the top, then each medicine with the notes after it. */
export function withNotes(items: PrescriptionItem[], notes: PrescriptionNote[]) {
  const ids = new Set(items.map((i) => i.id));
  const rows: ({ type: 'item'; item: PrescriptionItem } | { type: 'note'; note: PrescriptionNote })[] = notes.filter((n) => n.afterItemId == null).map((note) => ({ type: 'note' as const, note }));
  for (const item of items) {
    rows.push({ type: 'item', item });
    for (const note of notes.filter((n) => n.afterItemId === item.id)) rows.push({ type: 'note', note });
  }
  // After a medicine that was taken off: at the end.
  for (const note of notes.filter((n) => n.afterItemId != null && !ids.has(n.afterItemId))) rows.push({ type: 'note', note });
  return rows;
}

/** One note line as read by everyone (the doctor gets edit / move / remove). */
export function NoteLine({ note, className }: { note: PrescriptionNote; className?: string }) {
  const Icon = NOTE_ICON[note.kind];
  return (
    <span className={cn('inline-flex items-start gap-1.5 text-sm', note.kind === 'note' ? 'text-warning' : 'text-brand', className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="font-semibold">{NOTE_WORD[note.kind]}:</span> {note.text}
      </span>
    </span>
  );
}

const refreshKeys = (qc: ReturnType<typeof useQueryClient>, branch: string) => {
  for (const k of ['prescription', 'checkout', 'pharmacy-queue']) qc.invalidateQueries({ queryKey: [k, branch] });
};

/** The doctor's controls on a note row: edit the text in place, remove it. Moving is by drag (see the table). */
export function NoteRowEditor({ branch, note }: { branch: string; note: PrescriptionNote }) {
  const qc = useQueryClient();
  const [text, setText] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => api.patch(`/b/${branch}/prescription-notes/${note.id}`, { text: (text ?? '').trim() }),
    onSuccess: () => (refreshKeys(qc, branch), setText(null)),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/b/${branch}/prescription-notes/${note.id}`),
    onSuccess: () => (refreshKeys(qc, branch), toast.success(`${NOTE_WORD[note.kind]} removed`)),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (text != null)
    return (
      <form
        className="flex flex-1 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) save.mutate();
        }}
      >
        <Input autoFocus aria-label={`${NOTE_WORD[note.kind]} text`} maxLength={300} className="h-9 flex-1" value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="sm" type="submit" disabled={!text.trim() || save.isPending}>
          Save
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setText(null)}>
          Cancel
        </Button>
      </form>
    );
  return (
    <div className="flex flex-1 items-center justify-between gap-2">
      <span className="flex items-start gap-2">
        <span className="cursor-grab text-muted active:cursor-grabbing" title="Drag onto a medicine to put it after that medicine" aria-hidden>
          <GripVertical className="size-4" />
        </span>
        <NoteLine note={note} />
      </span>
      <span className="flex shrink-0 gap-1">
        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${NOTE_WORD[note.kind].toLowerCase()}`} onClick={() => setText(note.text)}>
          <Pencil />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label={`Remove ${NOTE_WORD[note.kind].toLowerCase()}`} disabled={remove.isPending} onClick={() => remove.mutate()}>
          <X />
        </Button>
      </span>
    </div>
  );
}

/** "+ Note" / "+ Instruction": typed once, placed after the medicine chosen (the last one unless changed). */
export function AddNoteBar({ branch, visitId, items }: { branch: string; visitId: number; items: PrescriptionItem[] }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<PrescriptionNote['kind'] | null>(null);
  const [text, setText] = useState('');
  const [after, setAfter] = useState<string>('last');
  const add = useMutation({
    mutationFn: () => {
      const afterItemId = after === 'top' ? null : after === 'last' ? (items.at(-1)?.id ?? null) : Number(after);
      return api.post(`/b/${branch}/visits/${visitId}/prescription-notes`, { kind, text: text.trim(), afterItemId });
    },
    onSuccess: () => {
      refreshKeys(qc, branch);
      toast.success(`${NOTE_WORD[kind!]} added`);
      setKind(null);
      setText('');
      setAfter('last');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!kind)
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
        <span className="text-sm text-muted">Between the medicines:</span>
        <Button size="sm" variant="outline" onClick={() => setKind('note')}>
          <StickyNote /> Note
        </Button>
        <Button size="sm" variant="outline" onClick={() => setKind('instruction')}>
          <ClipboardCheck /> Instruction
        </Button>
      </div>
    );
  return (
    <form
      className="grid gap-2 border-t border-border bg-subtle/40 px-4 py-3 sm:grid-cols-[1fr_14rem_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() && !add.isPending) add.mutate();
      }}
    >
      <Input autoFocus aria-label={`${NOTE_WORD[kind]} text`} maxLength={300} placeholder={kind === 'note' ? 'e.g. Stop if the fever goes' : 'e.g. Check BP tomorrow morning'} value={text} onChange={(e) => setText(e.target.value)} />
      <NativeSelect aria-label="Where it goes" value={after} onChange={(e) => setAfter(e.target.value)}>
        <option value="last">After the last medicine</option>
        <option value="top">At the top</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            After {i.medicineName}
          </option>
        ))}
      </NativeSelect>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setKind(null)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!text.trim() || add.isPending}>
          Add {NOTE_WORD[kind].toLowerCase()}
        </Button>
      </div>
    </form>
  );
}

/** Moves a note after another medicine (a drop on that medicine's row). */
export function useMoveNote(branch: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (x: { noteId: number; afterItemId: number | null }) => api.patch(`/b/${branch}/prescription-notes/${x.noteId}`, { afterItemId: x.afterItemId }),
    onSuccess: () => refreshKeys(qc, branch),
    onError: (e) => toast.error(errorMessage(e)),
  });
}
