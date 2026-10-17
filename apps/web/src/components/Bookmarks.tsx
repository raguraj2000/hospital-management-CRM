// Bookmarks: ready-made treatments ("Dengue"). Search one, tick what this patient needs, confirm: the medicines
// go onto the visit's prescription and the instructions onto its checklist, where each is ticked when carried out.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus, Check, ListChecks, Pencil, Pill, Plus, RotateCcw, X } from 'lucide-react';
import { FORM_UNIT, formatRupees, suggestedQuantity, type Bookmark, type BookmarkApplyInput, type BookmarkInput, type BookmarkLine, type Medicine, type VisitInstruction } from '@platform/shared';
import { Badge, Button, Card, CardHeader, Combobox, Dialog, Field, Input, Skeleton, toast, ConfirmDelete } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { fmtDateTime } from './format';
import { DoseInput, InstructionInput, medicineLabel, medicineOption, useRxChoices } from './Prescription';

const useBookmarks = (branch: string, enabled: boolean) => useQuery({ queryKey: ['bookmarks', branch], queryFn: () => api.get<{ bookmarks: Bookmark[] }>(`/b/${branch}/bookmarks`), enabled, staleTime: 30_000 });
const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const summary = (b: Bookmark) => {
  const meds = b.lines.filter((l) => l.kind === 'medicine').length;
  return [meds ? count(meds, 'medicine') : null, b.lines.length - meds ? count(b.lines.length - meds, 'instruction') : null].filter(Boolean).join(' · ');
};
const lineText = (l: BookmarkLine) => (l.kind === 'instruction' ? l.text : `${l.medicineName}${l.strength ? ` ${l.strength}` : ''}`);
/** Everything that shows what a bookmark put on a visit. */
const AFTER_APPLY = ['prescription', 'visit-instructions', 'pharmacy-queue', 'visits', 'visit', 'treatments', 'checkout-queue', 'patient-visits'];

/**
 * The search box. `visitId`: the visit the bookmark goes onto; null = the patient has no open visit today
 * (the patient page), and picking one says so. `where`: said under the box, e.g. "Goes onto today's visit · Token 5".
 */
export function BookmarkSearch({ branch, visitId, where, onApplied, embedded }: { branch: string; visitId: number | null; where?: string; onApplied?: () => void; /** Inside the prescription card: a row of it, not a card of its own. */ embedded?: boolean }) {
  const canWrite = useCan('prescription.write');
  const list = useBookmarks(branch, canWrite);
  const [applying, setApplying] = useState<Bookmark | null>(null);
  const [editing, setEditing] = useState<Bookmark | 'new' | null>(null);
  if (!canWrite) return null;
  const bookmarks = list.data?.bookmarks ?? [];
  const Wrap = embedded ? 'div' : Card;

  return (
    <Wrap className={embedded ? 'border-b border-border bg-subtle/40' : 'mb-4'}>
      <div className={embedded ? 'flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center' : 'flex flex-col gap-2 p-3 sm:flex-row sm:items-center'}>
        <div className="min-w-0 flex-1" data-shortcut="alt+b">
          <Combobox
            aria-label="Bookmark"
            options={bookmarks}
            value={null}
            onChange={(_id, b) => {
              if (!b) return;
              if (visitId == null) toast.error('Start an OP visit first', { description: `"${b.name}" adds medicines and instructions, and those belong to a visit. Press "New OP visit", then add the bookmark.` });
              else setApplying(b);
            }}
            getKey={(b) => b.id}
            getLabel={(b) => b.name}
            placeholder={list.isLoading ? 'Loading bookmarks…' : bookmarks.length ? 'Search a bookmark (ready-made treatment), e.g. Dengue…   (Alt+B)' : 'No bookmarks yet — make the first one →'}
            emptyText="No bookmark with that name"
            renderOption={(b) => (
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{b.name}</span>
                <span className="shrink-0 text-xs text-muted">{summary(b)}</span>
              </span>
            )}
          />
        </div>
        <Button variant="outline" onClick={() => setEditing('new')}>
          <BookmarkPlus /> New bookmark
        </Button>
      </div>
      {where && <p className="border-t border-border px-3 py-1.5 text-xs text-muted">{where}</p>}

      {applying && visitId != null && (
        <ApplyDialog
          branch={branch}
          visitId={visitId}
          bookmark={applying}
          onClose={() => setApplying(null)}
          onEdit={() => {
            setEditing(applying);
            setApplying(null);
          }}
          onApplied={onApplied}
        />
      )}
      {editing && <BookmarkEditor branch={branch} bookmark={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Wrap>
  );
}

/** Every bookmark of the branch on one page: read what is in each, make a new one, open one to change or delete it. */
export function BookmarkList({ branch }: { branch: string }) {
  const list = useBookmarks(branch, true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Bookmark | 'new' | null>(null);
  const all = list.data?.bookmarks ?? [];
  const shown = all.filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Card>
      <CardHeader
        title={`All bookmarks${all.length ? ` (${all.length})` : ''}`}
        description="Ready-made treatments. On a patient's OP visit, search one (Alt+B) to add its medicines and instructions."
        icon={ListChecks}
        action={
          <Button onClick={() => setEditing('new')}>
            <BookmarkPlus /> New bookmark
          </Button>
        }
      />
      {all.length > 5 && (
        <div className="border-b border-border p-3">
          <Input aria-label="Search bookmarks" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      {list.isLoading ? (
        <Skeleton className="m-4 h-24" />
      ) : list.error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(list.error)}</p>
      ) : !all.length ? (
        <p className="px-4 py-8 text-center text-sm text-muted">No bookmarks yet. Make the first one, e.g. “Dengue” or “Fever”.</p>
      ) : !shown.length ? (
        <p className="px-4 py-8 text-center text-sm text-muted">No bookmark with that name.</p>
      ) : (
        <ul>
          {shown.map((b) => (
            <li key={b.id} className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
              <div className="min-w-0">
                <div className="text-base font-semibold">
                  {b.name} <span className="text-xs font-normal text-muted">{summary(b)}</span>
                </div>
                <ul className="mt-1 space-y-0.5 text-sm text-muted">
                  {b.lines.map((l) => (
                    <li key={l.id} className="flex items-start gap-1.5">
                      {l.kind === 'medicine' ? <Pill className="mt-0.5 size-3.5 shrink-0" /> : <Check className="mt-0.5 size-3.5 shrink-0" />}
                      <span>
                        <span className="text-ink">{lineText(l)}</span>
                        {l.kind === 'medicine' && ` · ${l.dose} · ${count(l.days, 'day')}${l.instructions ? ` · ${l.instructions}` : ''}${l.givenHere ? ' · given here' : ''}`}
                        {l.kind === 'medicine' && !l.available && <span className="font-medium text-critical"> · medicine deleted</span>}
                        {l.kind === 'medicine' && l.available && l.stock === 0 && <span className="font-medium text-warning"> · out of stock</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                <Pencil /> Edit
              </Button>
            </li>
          ))}
        </ul>
      )}
      {editing && <BookmarkEditor branch={branch} bookmark={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

/** What one line will be for this patient: starts as the bookmark has it. */
type Mine = { dose: string; days: string; qty: string; instructions: string; text: string };
const mineOf = (l: BookmarkLine): Mine => (l.kind === 'medicine' ? { dose: l.dose, days: String(l.days), qty: l.quantity == null ? '' : String(l.quantity), instructions: l.instructions ?? '', text: '' } : { dose: '', days: '', qty: '', instructions: '', text: l.text });

/**
 * Every line ticked; the doctor unticks what this patient does not need, changes what should be different for
 * this patient (dose, days, quantity, instructions), then confirms. The bookmark itself is not changed.
 */
function ApplyDialog({ branch, visitId, bookmark, onClose, onEdit, onApplied }: { branch: string; visitId: number; bookmark: Bookmark; onClose: () => void; onEdit: () => void; onApplied?: () => void }) {
  const qc = useQueryClient();
  const choices = useRxChoices(branch);
  const cannot = (l: BookmarkLine) => l.kind === 'medicine' && (!l.available || l.stock === 0);
  const [ticked, setTicked] = useState<number[]>(() => bookmark.lines.filter((l) => !cannot(l)).map((l) => l.id));
  const [mine, setMine] = useState<Record<number, Mine>>(() => Object.fromEntries(bookmark.lines.map((l) => [l.id, mineOf(l)])));
  const [open, setOpen] = useState<number[]>([]);
  const change = (id: number, patch: Partial<Mine>) => setMine((m) => ({ ...m, [id]: { ...m[id]!, ...patch } }));
  const changed = (l: BookmarkLine) => JSON.stringify(mine[l.id]) !== JSON.stringify(mineOf(l));
  /** Units this line comes to: what is typed, else dose x days. */
  const qtyOf = (l: BookmarkLine) => {
    const m = mine[l.id]!;
    return m.qty.trim() ? Number(m.qty) : suggestedQuantity(m.dose, Number(m.days));
  };
  const chosen = bookmark.lines.filter((l) => ticked.includes(l.id));
  const problem = chosen
    .map((l) => {
      const m = mine[l.id]!;
      if (l.kind === 'instruction') return m.text.trim().length < 2 ? 'An instruction is empty.' : null;
      if (!m.dose.trim()) return `${l.medicineName}: choose the dose.`;
      if (!(Number(m.days) >= 1)) return `${l.medicineName}: enter the days.`;
      if (!qtyOf(l)) return `${l.medicineName}: enter the quantity for this dose.`;
      return null;
    })
    .find(Boolean);

  const apply = useMutation({
    mutationFn: () => {
      const body: BookmarkApplyInput = {
        lines: chosen.map((l) => {
          const m = mine[l.id]!;
          if (!changed(l)) return { id: l.id };
          return l.kind === 'instruction' ? { id: l.id, text: m.text.trim() } : { id: l.id, dose: m.dose.trim(), days: Math.floor(Number(m.days)), quantity: m.qty.trim() ? Math.floor(Number(m.qty)) : null, instructions: m.instructions.trim() };
        }),
      };
      return api.post<{ medicines: number; instructions: number }>(`/b/${branch}/visits/${visitId}/bookmarks/${bookmark.id}/apply`, body);
    },
    onSuccess: (r) => {
      for (const k of AFTER_APPLY) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success(`${bookmark.name} added`, { description: [r.medicines ? `${count(r.medicines, 'medicine')} on the prescription` : null, r.instructions ? `${count(r.instructions, 'instruction')} on the checklist` : null].filter(Boolean).join(', ') + '.' });
      onApplied?.();
      onClose();
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      qc.invalidateQueries({ queryKey: ['bookmarks', branch] }); // stock or the bookmark changed under us
    },
  });
  const totalPaise = chosen.reduce((sum, l) => sum + (l.kind === 'medicine' ? (qtyOf(l) ?? 0) * l.pricePaise : 0), 0);

  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title={`Add "${bookmark.name}" to this visit`} description="Untick what this patient does not need. Press Change to give this patient a different dose, days or instruction: the bookmark itself stays the same for everyone else.">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {bookmark.lines.map((l) => {
          const off = cannot(l);
          const m = mine[l.id]!;
          const on = ticked.includes(l.id);
          const editing = open.includes(l.id) && on;
          const qty = l.kind === 'medicine' ? qtyOf(l) : null;
          return (
            <li key={l.id} className={off ? 'opacity-60' : ''}>
              <div className="flex items-start gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label={`Add ${lineText(l)}`}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
                  disabled={off}
                  checked={on}
                  onChange={(e) => setTicked((t) => (e.target.checked ? [...t, l.id] : t.filter((x) => x !== l.id)))}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {l.kind === 'medicine' ? <Pill className="size-4 text-violet" /> : <ListChecks className="size-4 text-brand" />}
                    {l.kind === 'instruction' ? m.text : lineText(l)}
                    {l.kind === 'medicine' && l.givenHere && <Badge tone="brand">Given here</Badge>}
                    {off && <Badge tone="critical">{l.kind === 'medicine' && !l.available ? 'No longer in the medicine list' : 'Out of stock'}</Badge>}
                    {on && changed(l) && <Badge tone="warning">Changed for this patient</Badge>}
                  </div>
                  {l.kind === 'medicine' && (
                    <div className="text-muted">
                      {m.dose || '—'} × {m.days || '?'} day{Number(m.days) === 1 ? '' : 's'}
                      {qty != null && ` · ${qty} ${FORM_UNIT[l.form]}`}
                      {m.instructions && ` · ${m.instructions}`}
                      <span className="text-xs">
                        {' '}
                        · {formatRupees(l.pricePaise)}/{FORM_UNIT[l.form]} · {l.stock} in stock{qty != null && ` · ${formatRupees(qty * l.pricePaise)}`}
                      </span>
                      {qty != null && l.stock > 0 && qty > l.stock && <span className="ml-2 text-xs font-medium text-warning">Only {l.stock} in stock</span>}
                    </div>
                  )}
                </div>
                {on && (
                  <Button size="sm" variant={editing ? 'secondary' : 'outline'} aria-label={`${editing ? 'Close' : 'Change'} ${lineText(l)}`} onClick={() => setOpen((o) => (o.includes(l.id) ? o.filter((x) => x !== l.id) : [...o, l.id]))}>
                    <Pencil /> {editing ? 'Close' : 'Change'}
                  </Button>
                )}
              </div>
              {editing &&
                (l.kind === 'medicine' ? (
                  <div className="grid grid-cols-2 gap-3 border-t border-border bg-subtle/50 px-3 py-3 sm:grid-cols-6">
                    <DoseInput id={`apply-dose-${l.id}`} value={m.dose} onChange={(d) => change(l.id, { dose: d, qty: '' })} choices={choices.doses.includes(l.dose) ? choices.doses : [l.dose, ...choices.doses]} />
                    <InstructionInput id={`apply-inst-${l.id}`} value={m.instructions} onChange={(x) => change(l.id, { instructions: x })} choices={!l.instructions || choices.instructions.includes(l.instructions) ? choices.instructions : [l.instructions, ...choices.instructions]} />
                    <Field required label="Days" htmlFor={`apply-days-${l.id}`}>
                      <Input id={`apply-days-${l.id}`} inputMode="numeric" value={m.days} onChange={(e) => change(l.id, { days: e.target.value.replace(/\D/g, ''), qty: '' })} />
                    </Field>
                    <Field label="Qty" htmlFor={`apply-qty-${l.id}`} hint={suggestedQuantity(m.dose, Number(m.days)) != null ? `Auto: ${suggestedQuantity(m.dose, Number(m.days))}` : 'Type it'}>
                      <Input id={`apply-qty-${l.id}`} inputMode="numeric" placeholder={String(suggestedQuantity(m.dose, Number(m.days)) ?? '')} value={m.qty} onChange={(e) => change(l.id, { qty: e.target.value.replace(/\D/g, '') })} />
                    </Field>
                    {changed(l) && (
                      <div className="col-span-2 sm:col-span-6">
                        <Button size="sm" variant="ghost" onClick={() => change(l.id, mineOf(l))}>
                          <RotateCcw /> Back to the bookmark's own
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-border bg-subtle/50 px-3 py-3">
                    <Input aria-label="Instruction for this patient" maxLength={200} value={m.text} onChange={(e) => change(l.id, { text: e.target.value })} />
                  </div>
                ))}
            </li>
          );
        })}
      </ul>
      {problem && (
        <p role="alert" className="mt-3 text-sm font-medium text-critical">
          {problem}
        </p>
      )}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onEdit}>
          <Pencil /> Edit the bookmark for everyone
        </Button>
        <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center">
          {totalPaise > 0 && <span className="text-sm text-muted tabular-nums sm:mr-2">Medicines {formatRupees(totalPaise)}</span>}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ticked.length || !!problem || apply.isPending} onClick={() => apply.mutate()}>
            <Check /> {apply.isPending ? 'Adding…' : `Confirm · add ${count(ticked.length, 'line')}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- make / edit a bookmark

type Row = { kind: 'medicine'; medicineId: number | null; dose: string; days: string; qty: string; instructions: string; givenHere: boolean } | { kind: 'instruction'; text: string };
const NEW_MEDICINE: Row = { kind: 'medicine', medicineId: null, dose: '1-0-1', days: '5', qty: '', instructions: 'After food', givenHere: false };
const rowsOf = (b: Bookmark | null): Row[] =>
  b ? b.lines.map((l) => (l.kind === 'medicine' ? { kind: 'medicine', medicineId: l.medicineId, dose: l.dose, days: String(l.days), qty: l.quantity == null ? '' : String(l.quantity), instructions: l.instructions ?? '', givenHere: l.givenHere } : { kind: 'instruction', text: l.text })) : [{ ...NEW_MEDICINE }];

function BookmarkEditor({ branch, bookmark, onClose }: { branch: string; bookmark: Bookmark | null; onClose: () => void }) {
  const qc = useQueryClient();
  const meds = useQuery({ queryKey: ['medicines', branch], queryFn: () => api.get<{ medicines: Medicine[] }>(`/b/${branch}/medicines`), staleTime: 60_000 });
  const choices = useRxChoices(branch);
  const [name, setName] = useState(bookmark?.name ?? '');
  const [rows, setRows] = useState<Row[]>(() => rowsOf(bookmark));
  const [error, setError] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? ({ ...r, ...patch } as Row) : r)));

  const save = useMutation({
    mutationFn: (body: BookmarkInput) => (bookmark ? api.put(`/b/${branch}/bookmarks/${bookmark.id}`, body) : api.post(`/b/${branch}/bookmarks`, body)),
    onSuccess: (_d, body) => {
      qc.invalidateQueries({ queryKey: ['bookmarks', branch] });
      toast.success(bookmark ? `${body.name} saved` : `Bookmark "${body.name}" made`, { description: bookmark ? undefined : 'Search it on a visit to add it to a patient.' });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/b/${branch}/bookmarks/${bookmark!.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookmarks', branch] });
      toast.success(`${bookmark!.name} deleted`);
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit() {
    // Rows with nothing in them are dropped.
    const kept = rows.filter((r) => (r.kind === 'instruction' ? r.text.trim() : r.medicineId != null));
    const problem =
      name.trim().length < 2
        ? 'Give the bookmark a name, e.g. Dengue.'
        : !kept.length
          ? 'Add at least one medicine or instruction.'
          : kept.some((r) => r.kind === 'medicine' && (!r.dose.trim() || !(Number(r.days) >= 1)))
            ? 'Every medicine needs a dose and the number of days.'
            : kept.some((r) => r.kind === 'medicine' && !r.qty.trim() && suggestedQuantity(r.dose, Number(r.days)) == null)
              ? 'A dose like "SOS" cannot be counted: type the quantity for that medicine.'
              : null;
    setError(problem);
    if (problem) return;
    save.mutate({
      name: name.trim(),
      lines: kept.map((r) => (r.kind === 'instruction' ? { kind: 'instruction', text: r.text.trim() } : { kind: 'medicine', medicineId: r.medicineId!, dose: r.dose.trim(), days: Math.floor(Number(r.days)), quantity: r.qty.trim() ? Math.floor(Number(r.qty)) : null, instructions: r.instructions.trim(), givenHere: r.givenHere })),
    });
  }

  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title={bookmark ? `Edit bookmark · ${bookmark.name}` : 'New bookmark'} description="A ready-made treatment: its medicines and instructions are added to a visit in one go. Changing it later does not change visits it was already added to.">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!save.isPending) submit();
        }}
      >
        <Field required label="Name" htmlFor="bookmark-name" className="sm:max-w-sm">
          <Input id="bookmark-name" autoFocus={!bookmark} placeholder="e.g. Dengue" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="space-y-2">
          {meds.isLoading && <Skeleton className="h-10" />}
          {rows.map((r, i) => (
            <div key={i} className="rounded-lg border border-border p-2.5">
              {r.kind === 'medicine' ? (
                // The same boxes as the doctor's "Add medicine": search with rate and stock, dose, instructions, days, quantity.
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                  <div className="col-span-2 flex items-start gap-2 sm:col-span-6">
                    <div className="min-w-0 flex-1">
                      <Combobox
                        aria-label={`Line ${i + 1}: medicine`}
                        options={meds.data?.medicines ?? []}
                        value={r.medicineId}
                        onChange={(id) => set(i, { medicineId: (id as number | null) ?? null })}
                        getKey={(m) => m.id}
                        getLabel={medicineLabel}
                        placeholder="Search medicine…"
                        emptyText="No medicine with that name"
                        renderOption={medicineOption}
                      />
                      <MedicineFacts medicine={meds.data?.medicines.find((x) => x.id === r.medicineId)} quantity={r.qty.trim() ? Number(r.qty) : suggestedQuantity(r.dose, Number(r.days))} />
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Remove line ${i + 1}`} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                      <X />
                    </Button>
                  </div>
                  <DoseInput id={`bm-dose-${i}`} value={r.dose} onChange={(d) => set(i, { dose: d })} choices={!r.dose || choices.doses.includes(r.dose) ? choices.doses : [r.dose, ...choices.doses]} />
                  <InstructionInput id={`bm-inst-${i}`} value={r.instructions} onChange={(x) => set(i, { instructions: x })} choices={!r.instructions || choices.instructions.includes(r.instructions) ? choices.instructions : [r.instructions, ...choices.instructions]} />
                  <Field required label="Days" htmlFor={`bm-days-${i}`}>
                    <Input id={`bm-days-${i}`} inputMode="numeric" value={r.days} onChange={(e) => set(i, { days: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                  <Field label="Qty" htmlFor={`bm-qty-${i}`} hint={suggestedQuantity(r.dose, Number(r.days)) != null ? `Auto: ${suggestedQuantity(r.dose, Number(r.days))}` : 'Type it'}>
                    <Input id={`bm-qty-${i}`} inputMode="numeric" placeholder={String(suggestedQuantity(r.dose, Number(r.days)) ?? '')} value={r.qty} onChange={(e) => set(i, { qty: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                  <label className="col-span-2 flex items-center gap-2 text-xs text-muted sm:col-span-6">
                    <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={r.givenHere} onChange={(e) => set(i, { givenHere: e.target.checked })} />
                    Given here in the hospital (each dose goes onto the “Today’s treatments” page, where the nurse ticks it)
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4 shrink-0 text-brand" />
                  <Input aria-label={`Line ${i + 1}: instruction`} placeholder="Instruction, e.g. Check platelet count daily" maxLength={200} value={r.text} onChange={(e) => set(i, { text: e.target.value })} />
                  <Button variant="ghost" size="icon" aria-label={`Remove line ${i + 1}`} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={rows.length >= 40} onClick={() => setRows((rs) => [...rs, { ...NEW_MEDICINE }])}>
              <Plus /> Add medicine
            </Button>
            <Button variant="outline" size="sm" disabled={rows.length >= 40} onClick={() => setRows((rs) => [...rs, { kind: 'instruction', text: '' }])}>
              <Plus /> Add instruction
            </Button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-critical">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {bookmark ? (
            <Button variant="ghost" disabled={remove.isPending} onClick={() => setSure(true)}>
              Delete bookmark
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {bookmark ? 'Save bookmark' : 'Make bookmark'}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmDelete open={sure} onOpenChange={setSure} title={`Delete the bookmark ${bookmark?.name ?? ''}?`} description="It is removed for everyone. Prescriptions already made from it stay as they are." pending={remove.isPending} onConfirm={() => remove.mutate()} />
    </Dialog>
  );
}

/** Under the picked medicine: strength, rate, today's stock, and what this line comes to. */
function MedicineFacts({ medicine: m, quantity }: { medicine?: Medicine; quantity: number | null }) {
  if (!m) return null;
  return (
    <p className="mt-1 text-xs text-muted">
      {m.strength && `${m.strength} · `}
      {formatRupees(m.pricePaise)}/{FORM_UNIT[m.form]} · <span className={m.stock > 0 ? '' : 'font-medium text-critical'}>{m.stock > 0 ? `${m.stock} in stock` : 'Out of stock now'}</span>
      {quantity != null && (
        <>
          {' '}
          · {quantity} {FORM_UNIT[m.form]} = <b className="text-ink">{formatRupees(quantity * m.pricePaise)}</b>
        </>
      )}
    </p>
  );
}

// ---------------------------------------------------------------- the instructions of a visit

/** The visit's checklist: each instruction is confirmed when carried out (who and when). Nothing shown when there are none. */
export function VisitInstructions({ branch, visitId, embedded }: { branch: string; visitId: number; /** Inside the prescription card: a short checklist, not a card of its own. */ embedded?: boolean }) {
  const qc = useQueryClient();
  const canPrescribe = useCan('prescription.write');
  const canGive = useCan('treatment.give');
  const canConfirm = canPrescribe || canGive;
  const key = ['visit-instructions', branch, visitId];
  const { data } = useQuery({ queryKey: key, queryFn: () => api.get<{ instructions: VisitInstruction[] }>(`/b/${branch}/visits/${visitId}/instructions`), staleTime: 0 });
  const [removingInstruction, setRemovingInstruction] = useState<VisitInstruction | null>(null);
  const act = useMutation({
    mutationFn: ({ id, what }: { id: number; what: 'done' | 'undo' | 'remove' }) => (what === 'remove' ? api.delete(`/b/${branch}/visit-instructions/${id}`) : api.post(`/b/${branch}/visit-instructions/${id}/${what}`)),
    onSuccess: (_d, { what }) => {
      qc.invalidateQueries({ queryKey: key });
      if (what === 'remove') toast.success('Instruction removed');
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      qc.invalidateQueries({ queryKey: key });
    },
  });
  const list = data?.instructions ?? [];
  if (!list.length) return null;
  const left = list.filter((i) => !i.doneAt).length;
  if (embedded)
    return (
      <div className="border-t border-border">
        <div className="flex items-center justify-between bg-subtle/50 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
          <span className="flex items-center gap-1.5">
            <ListChecks className="size-3.5" /> Instructions to carry out
          </span>
          <span className={left ? 'text-brand' : 'text-positive'}>{left ? `${left} of ${list.length} to do` : 'All done'}</span>
        </div>
        <ul className="divide-y divide-border">
          {list.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-2">
              <input
                type="checkbox"
                className="size-5 shrink-0 cursor-pointer accent-[var(--color-positive)] disabled:cursor-default"
                checked={!!i.doneAt}
                disabled={!canConfirm || act.isPending}
                aria-label={`${i.doneAt ? 'Done' : 'Mark done'}: ${i.text}`}
                title={i.doneAt ? 'Done. Untick to undo.' : 'Tick when it is done'}
                onChange={() => act.mutate({ id: i.id, what: i.doneAt ? 'undo' : 'done' })}
              />
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${i.doneAt ? 'text-muted line-through' : ''}`}>{i.text}</div>
                <div className="text-xs text-muted">
                  {i.doneAt ? (
                    <span className="text-positive">
                      Done {fmtDateTime(i.doneAt)}
                      {i.doneByName && ` · ${i.doneByName}`}
                    </span>
                  ) : (
                    'To do'
                  )}
                  {i.bookmarkName && ` · from ${i.bookmarkName}`}
                </div>
              </div>
              {!i.doneAt && canPrescribe && (
                <Button size="icon-sm" variant="ghost" aria-label={`Remove instruction: ${i.text}`} disabled={act.isPending} onClick={() => setRemovingInstruction(i)}>
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <ConfirmDelete
          open={!!removingInstruction}
          onOpenChange={(o) => !o && setRemovingInstruction(null)}
          title="Remove this instruction?"
          description={removingInstruction?.text ?? ''}
          pending={act.isPending}
          onConfirm={() => removingInstruction && act.mutate({ id: removingInstruction.id, what: 'remove' }, { onSettled: () => setRemovingInstruction(null) })}
        />
      </div>
    );

  return (
    <Card className="mt-6">
      <CardHeader title="Instructions to carry out" description={left ? `${left} of ${list.length} still to do. Confirm each one when it is done.` : 'All done.'} icon={ListChecks} iconTone={left ? 'brand' : 'positive'} />
      <ul className="divide-y divide-border">
        {list.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className={`text-base font-medium ${i.doneAt ? 'text-muted line-through' : ''}`}>{i.text}</div>
              <div className="text-xs text-muted">
                {i.doneAt ? (
                  <span className="font-medium text-positive">
                    Done {fmtDateTime(i.doneAt)}
                    {i.doneByName && ` · ${i.doneByName}`}
                  </span>
                ) : (
                  'To do'
                )}
                {i.bookmarkName && ` · from ${i.bookmarkName}`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {i.doneAt
                ? canConfirm && (
                    <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => act.mutate({ id: i.id, what: 'undo' })}>
                      <RotateCcw /> Undo
                    </Button>
                  )
                : canConfirm && (
                    <Button disabled={act.isPending} onClick={() => act.mutate({ id: i.id, what: 'done' })}>
                      <Check /> Confirm done
                    </Button>
                  )}
              {!i.doneAt && canPrescribe && (
                <Button size="icon-sm" variant="ghost" aria-label={`Remove instruction: ${i.text}`} disabled={act.isPending} onClick={() => setRemovingInstruction(i)}>
                  <X />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDelete
        open={!!removingInstruction}
        onOpenChange={(o) => !o && setRemovingInstruction(null)}
        title="Remove this instruction?"
        description={removingInstruction?.text ?? ''}
        pending={act.isPending}
        onConfirm={() => removingInstruction && act.mutate({ id: removingInstruction.id, what: 'remove' }, { onSettled: () => setRemovingInstruction(null) })}
      />
    </Card>
  );
}
