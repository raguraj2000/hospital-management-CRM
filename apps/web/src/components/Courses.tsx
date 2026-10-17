// Treatment courses on screen:
//  - the visit page's "Course" tab: the doctor plans the sittings (day x time x what), sees the patient's courses
//    as a day grid, adds days, closes a course;
//  - "Today's treatments": the sittings of yesterday, today and tomorrow, for the nurse (Given) and the front
//    desk (Start), with a WhatsApp reminder.
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { CalendarPlus, Check, CircleSlash, FlaskConical, GripVertical, MessageCircle, Pill, Plus, Receipt, Snowflake, StickyNote, Stethoscope, Syringe, Trash2, X } from 'lucide-react';
import {
  formatRupees,
  indiaDay,
  partOfDay,
  PARTS_OF_DAY,
  type CourseTemplate,
  type CourseTemplateInput,
  type PartOfDay,
  toPaise,
  type CoursePayMode,
  type DueSitting,
  type LabTest,
  type Medicine,
  type OpVisit,
  type SittingKind,
  sittingKindOf,
  type TreatmentCourse,
  type VisitCharges,
} from '@platform/shared';
import { Badge, Button, Card, CardHeader, cn, ConfirmDelete, Dialog, EmptyState, Field, Input, NativeSelect, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { whatsappNumber } from './PrintActions';
import { isUndone, withUndo } from './undo';
import { ListSearch, textMatch } from './ListSearch';

const SHORT: Record<SittingKind, string> = { nurse: 'Nurse', review: 'Review', lab: 'Lab' };
const STATUS_TONE = { planned: 'neutral', started: 'brand', done: 'positive', missed: 'critical', cancelled: 'neutral' } as const;
const STATUS_LABEL = { planned: 'Planned', started: 'Started', done: 'Done', missed: 'Missed', cancelled: 'Cancelled' } as const;
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const dayName = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const AFTER = ['courses', 'treatments-due', 'checkout-queue', 'visits', 'visit-charges', 'checkout', 'prescription', 'lab-queue', 'nav-counts'];

export const useCourses = (branch: string, patientId: number) =>
  useQuery({ queryKey: ['courses', branch, patientId], queryFn: () => api.get<{ courses: TreatmentCourse[] }>(`/b/${branch}/patients/${patientId}/courses`), staleTime: 10_000 });

// ---------------------------------------------------------------- shared pieces

/** One thing in a sitting while it is being chosen (the label and price are only for the screen). */
interface DraftItem {
  kind: 'medicine' | 'test' | 'charge' | 'note';
  medicineId?: number;
  testId?: number;
  description?: string;
  quantity: number;
  amountPaise?: number;
  label: string;
}
const toInput = ({ label: _l, ...i }: DraftItem) => i;
/** India date of "today + n days" as YYYY-MM-DD. */
const dayFromToday = (n: number) => indiaDay(new Date(Date.now() + n * 86_400_000).toISOString());
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const at = (day: string, part: PartOfDay) => `${day}T${PARTS_OF_DAY.find((p) => p.key === part)!.hhmm}:00+05:30`;
const usePlanner = () => [useCan('prescription.write'), useCan('settings.manage')].some(Boolean);

const ICON = { medicine: Pill, charge: Receipt, test: FlaskConical, note: StickyNote } as const;
const KIND_WORD = { medicine: 'Medicine', charge: 'Charge', test: 'Lab test', note: 'Note' } as const;

/**
 * Everything in one sitting, chosen at once: medicines / IV fluids, charges, lab tests, notes in between, a doctor
 * review, and notes for the whole sitting. The list keeps the order the doctor wants: drag a row by its handle.
 */
function SittingContent({
  branch,
  items,
  onChange,
  only,
  review,
  note,
}: {
  branch: string;
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  /** "Given now": only what can be given at once (no tests, no review). */
  only?: 'given-now';
  review?: { on: boolean; fee: string; set: (on: boolean, fee: string) => void };
  note?: { value: string; set: (v: string) => void };
}) {
  const meds = useQuery({ queryKey: ['medicines', branch], queryFn: () => api.get<{ medicines: Medicine[] }>(`/b/${branch}/medicines`), staleTime: 60_000 });
  const tests = useQuery({ queryKey: ['lab-tests', branch], queryFn: () => api.get<{ tests: LabTest[] }>(`/b/${branch}/lab/tests`), staleTime: 60_000, enabled: only !== 'given-now' });
  const presets = useQuery({ queryKey: ['charge-presets', branch], queryFn: () => api.get<{ presets: VisitCharges['presets'] }>(`/b/${branch}/charge-presets`), staleTime: 60_000 });
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const add = (item: DraftItem) => {
    const same = item.kind === 'medicine' ? items.findIndex((i) => i.kind === 'medicine' && i.medicineId === item.medicineId) : -1;
    if (same < 0) return onChange([...items, item]);
    onChange(items.map((i, n) => (n === same ? { ...i, quantity: i.quantity + 1, label: i.label.replace(/×\d+$/, `×${i.quantity + 1}`) } : i)));
  };
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    onChange(next);
  };
  const pick = 'h-10 w-full min-w-0';
  return (
    <div className="space-y-3">
      {review && (
        <label className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
          <input type="checkbox" className="size-5 accent-[var(--color-primary)]" checked={review.on} onChange={(e) => review.set(e.target.checked, review.fee)} />
          <Stethoscope className="size-4 text-muted" />
          <span className="font-medium">Doctor review in this sitting</span>
          {review.on && (
            <span className="ml-auto flex items-center gap-2">
              <span className="text-muted">Fee ₹</span>
              <Input aria-label="Review fee" inputMode="decimal" placeholder="No fee" className="h-9 w-24 text-right" value={review.fee} onChange={(e) => review.set(true, e.target.value)} />
            </span>
          )}
        </label>
      )}
      {items.length > 0 && (
        <ol className="divide-y divide-border rounded-lg border border-border" aria-label="In this sitting, in order">
          {items.map((i, n) => {
            const Icon = ICON[i.kind];
            return (
              <li
                key={n}
                draggable
                onDragStart={(e) => {
                  setDragFrom(n);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom != null) move(dragFrom, n);
                  setDragFrom(null);
                }}
                onDragEnd={() => setDragFrom(null)}
                className={cn('flex items-center gap-2 px-2 py-1.5 text-sm', dragFrom === n && 'opacity-40', i.kind === 'note' && 'bg-warning-soft/40')}
              >
                <span className="cursor-grab text-muted active:cursor-grabbing" title="Drag to change the order" aria-hidden>
                  <GripVertical className="size-4" />
                </span>
                <Icon className="size-4 shrink-0 text-muted" aria-label={KIND_WORD[i.kind]} />
                {i.kind === 'note' ? (
                  <Input
                    aria-label={`Note ${n + 1}`}
                    autoFocus={!i.description}
                    placeholder="Type the note (e.g. Give slowly, check BP first)"
                    maxLength={200}
                    className="h-8 flex-1"
                    value={i.description ?? ''}
                    onChange={(e) => onChange(items.map((x, j) => (j === n ? { ...x, description: e.target.value, label: e.target.value } : x)))}
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate">{i.label}</span>
                )}
                <button type="button" aria-label={`Remove ${i.label || 'note'}`} className="rounded p-1 text-muted hover:bg-subtle hover:text-ink" onClick={() => onChange(items.filter((_, j) => j !== n))}>
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <NativeSelect
          aria-label="Add a medicine"
          className={pick}
          value=""
          onChange={(e) => {
            const m = meds.data?.medicines.find((x) => x.id === Number(e.target.value));
            if (m) add({ kind: 'medicine', medicineId: m.id, quantity: 1, label: `${m.name}${m.strength ? ` ${m.strength}` : ''} ×1` });
          }}
        >
          <option value="">Medicine / IV fluid name — select</option>
          {(meds.data?.medicines ?? []).map((m) => (
            <option key={m.id} value={m.id} disabled={m.stock === 0}>
              {m.name} {m.strength} · {m.stock} in stock
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Add a charge"
          className={pick}
          value=""
          onChange={(e) => {
            const pr = presets.data?.presets[Number(e.target.value)];
            if (pr) add({ kind: 'charge', description: pr.name, amountPaise: pr.amountPaise, quantity: 1, label: `${pr.name} ${formatRupees(pr.amountPaise)}` });
          }}
        >
          <option value="">Charge name — select</option>
          {(presets.data?.presets ?? []).map((pr, i) => (
            <option key={i} value={i}>
              {pr.name} — {formatRupees(pr.amountPaise)}
            </option>
          ))}
        </NativeSelect>
        {only !== 'given-now' && (
          <NativeSelect
            aria-label="Add a lab test"
            className={pick}
            value=""
            onChange={(e) => {
              const t = tests.data?.tests.find((x) => x.id === Number(e.target.value));
              if (t) add({ kind: 'test', testId: t.id, quantity: 1, label: t.name });
            }}
          >
            <option value="">Lab test name — select</option>
            {(tests.data?.tests ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {formatRupees(t.pricePaise)}
              </option>
            ))}
          </NativeSelect>
        )}
        <Button type="button" variant="outline" className="h-10" onClick={() => onChange([...items, { kind: 'note', description: '', quantity: 1, label: '' }])}>
          <StickyNote /> Add a note
        </Button>
      </div>
      {items.length > 1 && <p className="text-xs text-muted">Drag a row by its handle to change the order. A note can go anywhere in between.</p>}
      {note && (
        <Field label="Notes for this sitting" htmlFor="sitting-note">
          <textarea
            id="sitting-note"
            rows={2}
            maxLength={500}
            placeholder="e.g. Check platelets before the drip. Call the doctor if BP is low."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40"
            value={note.value}
            onChange={(e) => note.set(e.target.value)}
          />
        </Field>
      )}
    </div>
  );
}

/** What a sitting holds, in words: "Review · Lab · Nurse". */
function sittingWhat(review: boolean, items: { kind: string }[]) {
  const parts = [review && 'Review', items.some((i) => i.kind === 'test') && 'Lab', items.some((i) => i.kind === 'medicine' || i.kind === 'charge') && 'Nurse'].filter(Boolean);
  return parts.length ? parts.join(' + ') : 'Nothing yet';
}
const realItems = (items: DraftItem[]) => items.filter((i) => i.kind !== 'note' || (i.description ?? '').trim());

/** Big buttons in one row (Morning · Afternoon · Evening · Night, or Nurse · Lab · Review). */
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">{label}</div>
      <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-lg bg-subtle p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={value === o.key} onClick={() => onChange(o.key)} className={cn('h-10 rounded-md px-2 text-sm font-medium', value === o.key ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink')}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
const PART_OPTIONS = PARTS_OF_DAY.map((p) => ({ key: p.key as PartOfDay, label: p.label }));

/** A course item back as a draft (to edit, or to copy to another day). */
const draftOf = (i: TreatmentCourse['sittings'][number]['items'][number]): DraftItem =>
  i.kind === 'note'
    ? { kind: 'note', description: i.description, quantity: 1, label: i.description }
    : i.kind === 'medicine'
    ? { kind: 'medicine', medicineId: i.medicineId!, quantity: i.quantity, label: `${i.description} ×${i.quantity}` }
    : i.kind === 'test'
      ? { kind: 'test', testId: i.testId!, quantity: 1, label: i.description }
      : { kind: 'charge', description: i.description, amountPaise: i.pricePaise, quantity: 1, label: `${i.description} ${formatRupees(i.pricePaise)}` };

// ---------------------------------------------------------------- the visit page tab

export function CourseTab({ branch, visit }: { branch: string; visit: OpVisit }) {
  const canPlan = usePlanner();
  const { data, isLoading } = useCourses(branch, visit.patientId);
  if (isLoading) return <Skeleton className="h-40" />;
  const courses = data?.courses ?? [];
  const open = courses.filter((c) => c.status !== 'closed');
  return (
    <div className="space-y-4">
      {canPlan && visit.status !== 'cancelled' && visit.status !== 'completed' && <StartCourse branch={branch} visit={visit} compact={open.length > 0} />}
      {courses.length === 0 && !(canPlan && visit.status !== 'cancelled' && visit.status !== 'completed') && <EmptyState icon={Syringe} title="No treatment course for this patient" />}
      {courses.map((c) => (
        <CourseDiary key={c.id} branch={branch} course={c} canPlan={canPlan} />
      ))}
    </div>
  );
}

/** Start a course: pick a template ("Dengue") or start empty, choose how it is paid. One click. */
function StartCourse({ branch, visit, compact }: { branch: string; visit: OpVisit; compact: boolean }) {
  const qc = useQueryClient();
  const templates = useQuery({ queryKey: ['course-templates', branch], queryFn: () => api.get<{ templates: CourseTemplate[] }>(`/b/${branch}/course-templates`), staleTime: 60_000 });
  const canSettings = useCan('settings.manage');
  const [open, setOpen] = useState(!compact);
  const [q, setQ] = useState('');
  const [empty, setEmpty] = useState(false);
  const [name, setName] = useState('');
  const [payMode, setPayMode] = useState<CoursePayMode>('per_sitting');
  const [startDay, setStartDay] = useState(dayFromToday(0));
  // Like a bookmark: the template is copied onto this patient; changing it here never changes the template.
  const start = useMutation({
    mutationFn: (tpl: CourseTemplate | null) => {
      const sittings = (tpl?.sittings ?? []).map((s) => ({ dueAt: at(addDays(startDay, s.day - 1), s.part), kind: s.kind, reviewFeePaise: s.reviewFeePaise ?? null, note: s.note ?? null, items: s.items }));
      return api.post<{ course: TreatmentCourse; warnings: string[] }>(`/b/${branch}/visits/${visit.id}/courses`, { name: (tpl?.name ?? name).trim(), payMode: tpl ? payMode : 'per_sitting', startDay, sittings });
    },
    onSuccess: (r) => {
      for (const k of AFTER) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success(`${r.course.name} added for this patient`, { description: 'Change it below for this patient; the template stays as it is.' });
      if (r.warnings.length) toast.warning('Not enough stock for the whole course', { description: r.warnings.join(' · '), duration: 12_000 });
      setOpen(false);
      setEmpty(false);
      setName('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarPlus /> Add another course
      </Button>
    );
  const list = (templates.data?.templates ?? []).filter((t) => textMatch(q, t.name));
  const days = (t: CourseTemplate) => Math.max(...t.sittings.map((x) => x.day));
  return (
    <Card>
      <CardHeader
        title="Add a treatment course"
        description="Pick a ready-made course: it is copied onto this patient, and you can change it here. The template itself is changed only in Settings → Course templates."
        action={
          compact && (
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-end gap-3 border-b border-border bg-subtle/40 px-4 py-3">
        <ListSearch className="sm:w-64" label="Search the courses" placeholder="Course name…" value={q} onChange={setQ} />
        <Field label="Day 1 is" htmlFor="course-start">
          <Input id="course-start" type="date" min={dayFromToday(0)} className="w-auto" value={startDay} onChange={(e) => setStartDay(e.target.value || dayFromToday(0))} />
        </Field>
        <Segmented label="Payment" value={payMode} options={[{ key: 'per_sitting', label: 'At each sitting' }, { key: 'day_one', label: 'All on day one' }]} onChange={setPayMode} />
      </div>
      {templates.isLoading ? (
        <Skeleton className="m-4 h-24" />
      ) : list.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">
          {q ? `No course matches “${q}”.` : 'No ready-made courses yet.'} {canSettings && <Link className="font-medium text-brand hover:underline" to={`/${branch}/settings?tab=course-templates`}>Make one in Settings</Link>}
        </p>
      ) : (
        <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <li key={t.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-brand/40">
              <div className="min-w-0">
                <div className="font-semibold">{t.name}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {t.sittings.length} sitting{t.sittings.length === 1 ? '' : 's'} · {days(t)} day{days(t) === 1 ? '' : 's'}
                </div>
                <div className="mt-2 line-clamp-2 text-xs text-muted">{t.sittings.map((x) => `Day ${x.day} ${x.part}: ${sittingWhat(x.kind === 'review', x.items).toLowerCase()}`).join(' · ')}</div>
              </div>
              <Button size="sm" disabled={start.isPending} onClick={() => start.mutate(t)}>
                <Plus /> Add for this patient
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        {empty ? (
          <form
            className="flex flex-1 flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length >= 2) start.mutate(null);
            }}
          >
            <Input autoFocus aria-label="Course name" placeholder="Course name, e.g. Dressing for 5 days" className="h-9 max-w-72" value={name} onChange={(e) => setName(e.target.value)} />
            <Button size="sm" type="submit" disabled={name.trim().length < 2 || start.isPending}>
              Start empty course
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => setEmpty(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEmpty(true)}>
            <Plus /> Empty course (add day by day)
          </Button>
        )}
        {canSettings && (
          <Link className="text-xs font-medium text-brand hover:underline" to={`/${branch}/settings?tab=course-templates`}>
            Edit ready-made courses in Settings
          </Link>
        )}
      </div>
    </Card>
  );
}

/** The patient's course, day by day: today first, then the days ahead, earlier days folded. */
function CourseDiary({ branch, course, canPlan }: { branch: string; course: TreatmentCourse; canPlan: boolean }) {
  const qc = useQueryClient();
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reason, setReason] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [dialog, setDialog] = useState<{ mode: 'now' } | { mode: 'add'; day: string } | { mode: 'edit'; sitting: TreatmentCourse['sittings'][number] } | null>(null);
  const refresh = () => {
    for (const k of AFTER) qc.invalidateQueries({ queryKey: [k, branch] });
  };
  const close = useMutation({
    mutationFn: () => api.post(`/b/${branch}/courses/${course.id}/close`, { reason }),
    onSuccess: () => {
      refresh();
      toast.success(`${course.name} course closed`);
      setClosing(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/b/${branch}/courses/${course.id}`),
    onSuccess: () => (refresh(), toast.success(`${course.name} course deleted`), setDeleting(false)),
    onError: (e) => toast.error(errorMessage(e)),
  });
  // Started by mistake: nothing happened yet (the server checks the same).
  const deletable = course.payMode === 'per_sitting' && course.sittings.every((s) => !s.visitId && s.status !== 'started' && s.status !== 'done');
  const cancel = useMutation({
    mutationFn: (id: number) => api.post(`/b/${branch}/course-sittings/${id}/cancel`),
    onSuccess: () => (refresh(), toast.success('Sitting removed')),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const copyDay = useMutation({
    mutationFn: (x: { from: string; to: string }) =>
      api.post(
        `/b/${branch}/courses/${course.id}/sittings`,
        course.sittings
          .filter((s) => indiaDay(s.dueAt) === x.from && s.status !== 'cancelled')
          .map((s) => ({ dueAt: at(x.to, (partOfDay(s.dueAt) as PartOfDay) ?? 'morning'), kind: s.kind, reviewFeePaise: s.reviewFeePaise, note: s.note, items: s.items.filter((i) => i.description !== 'Review fee').map((i) => toInput(draftOf(i))) })),
      ),
    onSuccess: (_r, x) => (refresh(), toast.success(`Copied to ${dayName(at(x.to, 'morning'))}`, { description: 'Paid when each sitting happens.' })),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const today = dayFromToday(0);
  const open = course.status !== 'closed';
  const sittingDays = [...new Set(course.sittings.map((s) => indiaDay(s.dueAt)))];
  const future = [...new Set([today, ...sittingDays.filter((d) => d >= today)])].sort();
  const past = sittingDays.filter((d) => d < today).sort().reverse();
  const dayNo = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${indiaDay(course.createdAt)}T00:00:00Z`)) / 86_400_000) + 1;
  const lastDay = [...sittingDays, today].sort().at(-1)!;

  const DayCard = ({ day }: { day: string }) => {
    const rows = course.sittings.filter((s) => indiaDay(s.dueAt) === day);
    const isToday = day === today;
    return (
      <div className={cn('rounded-lg border', isToday ? 'border-brand/50' : 'border-border')}>
        <div className={cn('flex flex-wrap items-center justify-between gap-2 px-4 py-2', isToday ? 'bg-brand-soft' : 'bg-subtle/60')}>
          <div className="font-semibold">
            {isToday ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : dayName(at(day, 'morning'))}
            {dayNo(day) >= 1 && ` · Day ${dayNo(day)}`}
            <span className="ml-2 text-xs font-normal text-muted">{dayName(at(day, 'morning'))}</span>
          </div>
          {canPlan && open && rows.some((s) => s.status !== 'cancelled') && (
            <Button size="sm" variant="ghost" disabled={copyDay.isPending} onClick={() => copyDay.mutate({ from: day, to: addDays(day, 1) })} title="Copies every sitting of this day to the next day">
              <CalendarPlus /> Copy to {day === lastDay ? 'next day' : dayName(at(addDays(day, 1), 'morning'))}
            </Button>
          )}
        </div>
        {rows.length === 0 && <p className="px-4 py-2.5 text-sm text-muted">Nothing planned.</p>}
        <ul className="divide-y divide-border">
          {rows.map((s) => (
            <li key={s.id} className={cn('flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm', s.status === 'cancelled' && 'opacity-50')}>
              <div className="min-w-0">
                <span className={cn('font-medium', !(s.status === 'done' && s.doneAt) && 'capitalize')}>{s.status === 'done' && s.doneAt ? time(s.doneAt) : partOfDay(s.dueAt)}</span>
                <span className="mx-2 text-muted">·</span>
                <span className="font-medium">{sittingWhat(s.kind === 'review', s.items)}</span>
                {s.items.length > 0 && <span className="text-muted"> · {s.items.map((i) => (i.kind === 'note' ? `“${i.description}”` : `${i.description}${i.kind === 'medicine' ? ` ×${i.quantity}` : ''}`)).join(', ')}</span>}
                {s.kind === 'review' && s.reviewFeePaise ? <span className="text-muted"> · fee {formatRupees(s.reviewFeePaise)}</span> : null}
                {s.note && <div className="mt-0.5 text-xs text-warning">Note: {s.note}</div>}
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                {canPlan && open && (s.status === 'planned' || s.status === 'missed') && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ mode: 'edit', sitting: s })}>
                      Edit
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Remove this sitting" disabled={cancel.isPending} onClick={() => cancel.mutate(s.id)}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        {canPlan && open && (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2.5">
            {isToday && (
              <Button size="sm" onClick={() => setDialog({ mode: 'now' })} title="Something given right now (dizzy → glucose): saved as given and put on the bill">
                <Plus /> Add now
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setDialog({ mode: 'add', day })}>
              <Plus /> {isToday ? 'Add for later today' : 'Add'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={course.status === 'closed' ? 'opacity-75' : undefined}>
      <CardHeader
        title={`${course.name} course`}
        description={`${course.payMode === 'day_one' ? 'Paid on day one (days added later are paid per sitting)' : 'Paid at each sitting'} · Day 1 ${dayName(course.createdAt)}${course.doctorName ? ` · ${course.doctorName}` : ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {course.status === 'frozen' && (
              <Badge tone="warning">
                <Snowflake className="size-3.5" /> Frozen: missed two sittings
              </Badge>
            )}
            {course.status === 'closed' && <Badge tone="neutral">Closed</Badge>}
            {course.creditPaise > 0 && <Badge tone="positive">Credit {formatRupees(course.creditPaise)}</Badge>}
            {canPlan && open && (
              <Button size="sm" variant="ghost" onClick={() => setClosing(true)}>
                <CircleSlash /> Close course
              </Button>
            )}
            {canPlan && open && deletable && (
              <Button size="sm" variant="ghost" onClick={() => setDeleting(true)}>
                <Trash2 /> Delete
              </Button>
            )}
          </div>
        }
      />
      {course.closedReason && <p className="border-b border-border px-4 py-2 text-sm text-muted">Closed: {course.closedReason}</p>}
      <div className="space-y-3 p-4">
        {open && future.map((d) => <DayCard key={d} day={d} />)}
        {canPlan && open && (
          <Button variant="outline" size="sm" onClick={() => setDialog({ mode: 'add', day: addDays(lastDay, 1) })}>
            <CalendarPlus /> Add a day ({dayName(at(addDays(lastDay, 1), 'morning'))})
          </Button>
        )}
        {past.length > 0 && (
          <div>
            <button type="button" className="text-sm font-medium text-muted hover:text-ink" onClick={() => setShowPast((x) => !x)}>
              {showPast ? 'Hide' : 'Show'} earlier days ({past.length})
            </button>
            {(showPast || !open) && <div className="mt-2 space-y-3">{past.map((d) => <DayCard key={d} day={d} />)}</div>}
          </div>
        )}
      </div>
      {dialog && <SittingDialog branch={branch} course={course} dialog={dialog} onClose={() => setDialog(null)} onSaved={refresh} />}
      <ConfirmDelete
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete the ${course.name} course?`}
        description="Started by mistake: the whole plan goes. Nothing was given or billed yet."
        onConfirm={() => remove.mutate()}
        pending={remove.isPending}
      />
      <Dialog open={closing} onOpenChange={setClosing} title={`Close the ${course.name} course?`} description="The sittings still planned are cancelled. What was already given and paid stays.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim().length >= 3) close.mutate();
          }}
        >
          <Field required label="Why" htmlFor="close-reason">
            <Input id="close-reason" autoFocus placeholder="e.g. Recovered, platelets normal" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setClosing(false)}>
              Keep it
            </Button>
            <Button type="submit" variant="danger" disabled={reason.trim().length < 3 || close.isPending}>
              Close course
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

/** "+ Add now" (given now, billed), "+ Add" for a part of a day, or "Edit" a planned sitting: one small window. */
function SittingDialog({
  branch,
  course,
  dialog,
  onClose,
  onSaved,
}: {
  branch: string;
  course: TreatmentCourse;
  dialog: { mode: 'now' } | { mode: 'add'; day: string } | { mode: 'edit'; sitting: TreatmentCourse['sittings'][number] };
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = dialog.mode === 'edit' ? dialog.sitting : null;
  const now = dialog.mode === 'now';
  const [day, setDay] = useState(dialog.mode === 'add' ? dialog.day : editing ? indiaDay(editing.dueAt) : dayFromToday(0));
  const [part, setPart] = useState<PartOfDay>(editing ? (partOfDay(editing.dueAt) as PartOfDay) : day === dayFromToday(0) ? (partOfDay(new Date(Date.now() + 2 * 3_600_000).toISOString()) as PartOfDay) : 'morning');
  const [items, setItems] = useState<DraftItem[]>(editing ? editing.items.filter((i) => i.description !== 'Review fee').map(draftOf) : []);
  const [review, setReview] = useState(editing?.kind === 'review');
  const [fee, setFee] = useState(editing?.reviewFeePaise ? String(editing.reviewFeePaise / 100) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const prepaid = !!editing?.items.some((i) => i.prepaid);
  const list = realItems(items);
  const kind = sittingKindOf(review, list);
  const save = useMutation({
    mutationFn: () => {
      if (now) return withUndo(`Given now: ${list.filter((i) => i.kind !== 'note').map((i) => i.label).join(', ')}`, () => api.post(`/b/${branch}/courses/${course.id}/now`, { items: list.map(toInput) }));
      const body = { dueAt: at(day, part), kind, reviewFeePaise: review && fee ? toPaise(Number(fee) || 0) : null, note: note.trim(), items: list.map(toInput) };
      if (editing) return api.patch(`/b/${branch}/course-sittings/${editing.id}`, prepaid ? { dueAt: body.dueAt, note: body.note } : body);
      return api.post(`/b/${branch}/courses/${course.id}/sittings`, [body]);
    },
    onSuccess: () => {
      onSaved();
      toast.success(now ? 'Given and put on the bill' : editing ? 'Sitting changed' : 'Sitting added', { description: now ? 'The counter collects it.' : undefined });
      onClose();
    },
    onError: (e) => !isUndone(e) && toast.error(errorMessage(e)),
  });
  const title = now ? 'Given now' : editing ? 'Change this sitting' : `Add a sitting · ${day === dayFromToday(0) ? 'today' : dayName(at(day, 'morning'))}`;
  const ready = now ? list.some((i) => i.kind !== 'note') : prepaid || review || list.some((i) => i.kind !== 'note');
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title={title} description={now ? 'What was given just now (e.g. dizzy → glucose). Saved as given and put on the patient’s bill.' : `${course.name} course · everything for this sitting at once`}>
      <div className="space-y-4">
        {!now && (
          <div className="grid gap-3 md:grid-cols-[11rem_1fr] md:items-end">
            <Field label="Day" htmlFor="sitting-day">
              <Input id="sitting-day" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
            </Field>
            <Segmented label="When" value={part} options={PART_OPTIONS} onChange={setPart} />
          </div>
        )}
        {prepaid ? (
          <>
            <p className="rounded-lg bg-subtle px-3 py-2 text-sm text-muted">Paid on day one: only the time and the notes can be changed.</p>
            <Field label="Notes for this sitting" htmlFor="sitting-note">
              <Input id="sitting-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </>
        ) : (
          <SittingContent
            branch={branch}
            items={items}
            onChange={setItems}
            only={now ? 'given-now' : undefined}
            review={now ? undefined : { on: review, fee, set: (on, f) => (setReview(on), setFee(f)) }}
            note={now ? undefined : { value: note, set: setNote }}
          />
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          {!now && !prepaid && <span className="mr-auto text-sm text-muted">This sitting: {sittingWhat(review, list)}</span>}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            <Check /> {save.isPending ? 'Saving…' : now ? 'Given — put on the bill' : editing ? 'Save change' : 'Add sitting'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- course templates (Settings)

/** Settings > Course templates: "Dengue" made once, started for a patient in one click. */
export function CourseTemplates({ branch }: { branch: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['course-templates', branch], queryFn: () => api.get<{ templates: CourseTemplate[] }>(`/b/${branch}/course-templates`) });
  const [editing, setEditing] = useState<CourseTemplate | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CourseTemplate | null>(null);
  const [q, setQ] = useState('');
  const remove = useMutation({
    mutationFn: (t: CourseTemplate) => api.delete(`/b/${branch}/course-templates/${t.id}`),
    onSuccess: (_r, t) => (qc.invalidateQueries({ queryKey: ['course-templates', branch] }), toast.success(`${t.name} deleted`), setDeleting(null)),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (isLoading) return <Skeleton className="h-40" />;
  const all = data?.templates ?? [];
  const list = all.filter((t) => textMatch(q, t.name));
  if (editing) return <TemplateEditor branch={branch} template={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />;
  return (
    <Card>
      <CardHeader
        title={`Course templates (${all.length})`}
        description="The usual sittings of a treatment (Dengue: IV evening, CBC + review next morning…). The doctor starts one for a patient in one click, then changes it day by day."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {all.length > 0 && <ListSearch className="sm:w-52" label="Search the templates" placeholder="Template name…" value={q} onChange={setQ} />}
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus /> New template
            </Button>
          </div>
        }
      />
      {list.length === 0 ? (
        q ? <EmptyState icon={Syringe} title={`Nothing matches “${q}”`} /> : <EmptyState icon={Syringe} title="No course templates yet" description="Make one for each treatment you give often." />
      ) : (
        <ul className="divide-y divide-border">
          {list.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-muted">
                  {t.sittings.map((s) => `Day ${s.day} ${s.part}: ${sittingWhat(s.kind === 'review', s.items).toLowerCase()}`).join(' · ')}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>
                  Edit
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete the ${deleting?.name ?? ''} template?`}
        description="Courses already started from it stay as they are."
        onConfirm={() => deleting && remove.mutate(deleting)}
        pending={remove.isPending}
      />
    </Card>
  );
}

interface TemplateRow {
  key: number;
  day: number;
  part: PartOfDay;
  review: boolean;
  fee: string;
  note: string;
  items: DraftItem[];
}

function TemplateEditor({ branch, template, onDone }: { branch: string; template: CourseTemplate | null; onDone: () => void }) {
  const qc = useQueryClient();
  const keys = useMemo(() => ({ n: 100 }), []);
  const [name, setName] = useState(template?.name ?? '');
  const [rows, setRows] = useState<TemplateRow[]>(
    template
      ? template.sittings.map((s, i) => ({
          key: i,
          day: s.day,
          part: s.part,
          review: s.kind === 'review',
          fee: s.reviewFeePaise ? String(s.reviewFeePaise / 100) : '',
          note: s.note ?? '',
          items: s.items.map((it) => ({ ...it, quantity: it.quantity ?? 1, label: it.kind === 'note' ? (it.description ?? '') : it.kind === 'charge' ? `${it.description} ${formatRupees(it.amountPaise ?? 0)}` : it.kind === 'medicine' ? `Medicine #${it.medicineId} ×${it.quantity ?? 1}` : `Test #${it.testId}` })) as DraftItem[],
        }))
      : [{ key: 0, day: 1, part: 'evening', review: false, fee: '', note: '', items: [] }],
  );
  const meds = useQuery({ queryKey: ['medicines', branch], queryFn: () => api.get<{ medicines: Medicine[] }>(`/b/${branch}/medicines`), staleTime: 60_000 });
  const tests = useQuery({ queryKey: ['lab-tests', branch], queryFn: () => api.get<{ tests: LabTest[] }>(`/b/${branch}/lab/tests`), staleTime: 60_000 });
  // Names for an edited template's medicines and tests (stored by id).
  const named = (i: DraftItem): DraftItem => {
    if (i.kind === 'medicine' && i.label.startsWith('Medicine #')) {
      const m = meds.data?.medicines.find((x) => x.id === i.medicineId);
      return m ? { ...i, label: `${m.name}${m.strength ? ` ${m.strength}` : ''} ×${i.quantity}` } : i;
    }
    if (i.kind === 'test' && i.label.startsWith('Test #')) {
      const t = tests.data?.tests.find((x) => x.id === i.testId);
      return t ? { ...i, label: t.name } : i;
    }
    return i;
  };
  const set = (key: number, patch: Partial<TemplateRow>) => setRows((xs) => xs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const lastDay = Math.max(...rows.map((r) => r.day));
  const save = useMutation({
    mutationFn: () => {
      const body: CourseTemplateInput = {
        name,
        sittings: [...rows].sort((a, b) => a.day - b.day || PARTS_OF_DAY.findIndex((p) => p.key === a.part) - PARTS_OF_DAY.findIndex((p) => p.key === b.part)).map((r) => ({ day: r.day, part: r.part, kind: sittingKindOf(r.review, realItems(r.items)), reviewFeePaise: r.review && r.fee ? toPaise(Number(r.fee) || 0) : null, note: r.note.trim(), items: realItems(r.items).map(toInput) })),
      };
      return template ? api.put(`/b/${branch}/course-templates/${template.id}`, body) : api.post(`/b/${branch}/course-templates`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-templates', branch] });
      toast.success(`${name} saved`);
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const ready = name.trim().length >= 2 && rows.length > 0 && rows.every((r) => r.review || realItems(r.items).some((i) => i.kind !== 'note'));
  return (
    <Card>
      <CardHeader title={template ? `Edit ${template.name}` : 'New course template'} description="The usual sittings, by day and part of the day. Day 1 is the day the course starts. A sitting can hold a review, lab tests, drips, injections, charges and notes together." />
      <div className="space-y-3 p-4">
        <Field required label="Name" htmlFor="tpl-name" className="max-w-md">
          <Input id="tpl-name" autoFocus placeholder="e.g. Dengue (3 days)" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {[...rows]
          .sort((a, b) => a.day - b.day || PARTS_OF_DAY.findIndex((p) => p.key === a.part) - PARTS_OF_DAY.findIndex((p) => p.key === b.part))
          .map((r) => (
            <div key={r.key} className="space-y-3 rounded-lg border border-border p-3">
              <div className="grid gap-3 md:grid-cols-[7rem_1fr_auto] md:items-end">
                <Field label="Day" htmlFor={`tday${r.key}`}>
                  <NativeSelect id={`tday${r.key}`} value={r.day} onChange={(e) => set(r.key, { day: Number(e.target.value) })}>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Segmented label="When" value={r.part} options={PART_OPTIONS} onChange={(part) => set(r.key, { part })} />
                <Button variant="ghost" size="icon-sm" aria-label="Remove this sitting" disabled={rows.length === 1} onClick={() => setRows((xs) => xs.filter((x) => x.key !== r.key))}>
                  <Trash2 />
                </Button>
              </div>
              <SittingContent
                branch={branch}
                items={r.items.map(named)}
                onChange={(items) => set(r.key, { items })}
                review={{ on: r.review, fee: r.fee, set: (on, fee) => set(r.key, { review: on, fee }) }}
                note={{ value: r.note, set: (note) => set(r.key, { note }) }}
              />
            </div>
          ))}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setRows((xs) => [...xs, { key: keys.n++, day: lastDay, part: 'evening', review: false, fee: '', note: '', items: [] }])}>
            <Plus /> Add a sitting
          </Button>
          <Button variant="outline" onClick={() => setRows((xs) => [...xs, ...xs.filter((x) => x.day === lastDay).map((x) => ({ ...x, key: keys.n++, day: lastDay + 1, items: x.items.map((i) => ({ ...i })) }))])}>
            <CalendarPlus /> Copy Day {lastDay} to Day {lastDay + 1}
          </Button>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            <Check /> {save.isPending ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Today's treatments

/** The course sittings of yesterday, today and tomorrow, by part of the day. Nurse: Given. Front desk: Start. */
export function CourseSittingsToday({ branch, autoRefreshMs = false, search = '' }: { branch: string; /** The page's Auto refresh: how often, or false. */ autoRefreshMs?: number | false; search?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canGive = useCan('treatment.give');
  const canStart = [useCan('treatment.give'), useCan('patient.create'), useCan('lab.view')].some(Boolean);
  const { data, isLoading, error } = useQuery({ queryKey: ['treatments-due', branch], queryFn: () => api.get<{ today: string; sittings: DueSitting[] }>(`/b/${branch}/treatments/due`), refetchInterval: autoRefreshMs, refetchOnWindowFocus: false }); // polls only with Auto refresh on
  const refresh = () => {
    for (const k of AFTER) qc.invalidateQueries({ queryKey: [k, branch] });
  };
  const give = useMutation({
    mutationFn: (x: { id: number; what: string }) => withUndo(`Given: ${x.what}`, () => api.post(`/b/${branch}/course-items/${x.id}/given`)),
    onSuccess: refresh,
    onError: (e) => {
      if (isUndone(e)) return;
      toast.error(errorMessage(e));
      refresh();
    },
  });
  const start = useMutation({
    mutationFn: (s: DueSitting) => withUndo(`Starting ${s.courseName} · ${s.label} for ${s.patientName}`, () => api.post<{ visitId: number | null }>(`/b/${branch}/course-sittings/${s.id}/start`)),
    onSuccess: (r, s) => {
      refresh();
      toast.success(s.kind === 'review' ? `${s.patientName} is waiting for the doctor` : s.kind === 'lab' ? `Tests sent to the lab for ${s.patientName}` : `${s.patientName}: sitting started`);
      if (r.visitId && s.kind === 'review') navigate(`/${branch}/visits/${r.visitId}`);
    },
    onError: (e) => !isUndone(e) && toast.error(errorMessage(e)),
  });
  if (isLoading) return <Skeleton className="h-32" />;
  if (error) return <Card className="p-4 text-sm text-critical">{errorMessage(error)}</Card>;
  const today = data!.today;
  const sittings = data!.sittings.filter((s) => textMatch(search, s.patientName, s.patientUhid, s.patientPhone, s.courseName));
  const groups: [string, DueSitting[]][] = [
    ['Waiting from earlier', sittings.filter((s) => indiaDay(s.dueAt) < today && (s.status === 'started' || s.status === 'planned' || s.status === 'missed'))],
    ...(['morning', 'afternoon', 'evening', 'night'] as const).map((p) => [`Today ${p}`, sittings.filter((s) => indiaDay(s.dueAt) === today && partOfDay(s.dueAt) === p)] as [string, DueSitting[]]),
    ['Tomorrow', sittings.filter((s) => indiaDay(s.dueAt) > today)],
  ];
  const any = groups.some(([, xs]) => xs.length);
  const remind = (s: DueSitting) => {
    const when = indiaDay(s.dueAt) === today ? `today at ${time(s.dueAt)}` : `on ${dayName(s.dueAt)} at ${time(s.dueAt)}`;
    window.open(`https://wa.me/${whatsappNumber(s.patientPhone) ?? ''}?text=${encodeURIComponent(`Hello ${s.patientName}, a reminder: your ${s.courseName} treatment (${s.label}) is ${when}. Please come on time.`)}`, '_blank', 'noopener');
  };
  return (
    <Card className="mb-4">
      <CardHeader title="Course sittings" description="Yesterday, today and tomorrow. The nurse presses Given for what she gives: it goes on the patient's bill (the counter collects). Front desk presses Start for a review or a lab sitting." />
      {!any ? (
        <EmptyState icon={Syringe} title={search.trim() ? `No course sittings for “${search.trim()}”` : 'No course sittings now'} description={search.trim() ? undefined : 'They show here when a doctor starts a treatment course.'} />
      ) : (
        groups
          .filter(([, xs]) => xs.length)
          .map(([title, xs]) => (
            <div key={title} className="border-t border-border">
              <div className="bg-subtle/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted uppercase">{title}</div>
              <ul className="divide-y divide-border">
                {xs.map((s) => (
                  <li key={s.id} className={cn('flex flex-wrap items-start justify-between gap-3 px-4 py-3', (s.status === 'done' || s.status === 'cancelled') && 'opacity-60')}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        <span className="tabular-nums">{time(s.dueAt)}</span>
                        <button type="button" className="hover:underline" onClick={() => navigate(`/${branch}/patients/${s.patientId}`)}>
                          {s.patientName}
                        </button>
                        <Badge tone="brand">
                          {s.courseName} · {s.label}
                        </Badge>
                        <Badge tone="neutral">{sittingWhat(s.kind === 'review', s.items)}</Badge>
                        <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                        {s.courseStatus === 'frozen' && (
                          <Badge tone="warning">
                            <Snowflake className="size-3.5" /> Frozen
                          </Badge>
                        )}
                        {s.payMode === 'day_one' && <Badge tone="positive">Paid on day one</Badge>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {s.patientUhid}
                        {s.patientPhone ? ` · ${s.patientPhone}` : ''}
                        {s.kind === 'review' && s.reviewFeePaise ? ` · review fee ${formatRupees(s.reviewFeePaise)}` : ''}
                      </div>
                      {s.note && <p className="mt-1 text-sm font-medium text-warning">Note: {s.note}</p>}
                      {s.items.length > 0 && (
                        <ul className="mt-2 flex flex-wrap items-center gap-2">
                          {s.items.map((i) => (
                            <li key={i.id}>
                              {i.kind === 'note' ? (
                                <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-warning-soft px-3 text-sm text-warning">
                                  <StickyNote className="size-4" /> {i.description}
                                </span>
                              ) : i.kind !== 'test' && s.kind === 'nurse' && !i.givenAt && canGive && s.status !== 'cancelled' && s.courseStatus !== 'closed' ? (
                                <Button size="sm" variant="outline" className="h-10" disabled={give.isPending} onClick={() => give.mutate({ id: i.id, what: `${i.description}${i.kind === 'medicine' ? ` ×${i.quantity}` : ''} · ${s.patientName}` })}>
                                  <Check /> Given: {i.description}
                                  {i.kind === 'medicine' ? ` ×${i.quantity}` : ''}
                                </Button>
                              ) : (
                                <span className={cn('inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm', i.givenAt ? 'border-positive/40 bg-positive-soft text-positive' : 'border-border')}>
                                  {i.givenAt && <Check className="size-4" />}
                                  {i.description}
                                  {i.kind === 'medicine' ? ` ×${i.quantity}` : ''}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => remind(s)} title="Opens WhatsApp with a reminder for this patient">
                        <MessageCircle /> Remind
                      </Button>
                      {canStart && (s.kind !== 'nurse' || s.items.some((i) => i.kind === 'test' && !i.givenAt)) && (s.status === 'planned' || s.status === 'missed') && s.courseStatus !== 'closed' && (
                        <Button size="sm" disabled={start.isPending} onClick={() => start.mutate(s)}>
                          {s.kind === 'review' ? <Stethoscope /> : <FlaskConical />} Start
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
      )}
    </Card>
  );
}
