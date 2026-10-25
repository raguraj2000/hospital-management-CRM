// Treatment courses: one complaint treated over several sittings (checked in the browser AND again by the API).
import { z } from 'zod';

export const COURSE_PAY_MODES = ['per_sitting', 'day_one'] as const;
export type CoursePayMode = (typeof COURSE_PAY_MODES)[number];
export const SITTING_KINDS = ['nurse', 'review', 'lab'] as const;
export type SittingKind = (typeof SITTING_KINDS)[number];

export const courseItemInputSchema = z
  .object({
    /** note: a line of the doctor's between the others ("Give slowly"); never given or billed. */
    kind: z.enum(['medicine', 'test', 'charge', 'note']),
    medicineId: z.number().int().positive().optional(),
    testId: z.number().int().positive().optional(),
    /** Charges: what for (IV set, Dressing...). Notes: the note. */
    description: z.string().trim().max(200).optional(),
    quantity: z.number().int().min(1).max(100).default(1),
    /** Charges only: the amount. */
    amountPaise: z.number().int().min(0).max(10_000_000).optional(),
  })
  .refine((i) => (i.kind === 'medicine' ? !!i.medicineId : i.kind === 'test' ? !!i.testId : !!i.description), { message: 'Pick what to give', path: ['kind'] });

/** The doctor's notes on a sitting. */
const sittingNote = z.string().trim().max(500).transform((v) => (v === '' ? null : v)).nullable().optional();

export const sittingInputSchema = z.object({
  /** When it is due (ISO date-time). */
  dueAt: z.string().datetime({ offset: true, message: 'Pick the day and time' }),
  kind: z.enum(SITTING_KINDS),
  /** Review only: the doctor's fee; leave empty for none. */
  reviewFeePaise: z.number().int().min(0).max(10_000_000).nullable().optional(),
  note: sittingNote,
  /** In the order the doctor put them (notes in between). */
  items: z.array(courseItemInputSchema).max(30).default([]),
});
export type SittingInput = z.input<typeof sittingInputSchema>;

export const courseInputSchema = z.object({
  name: z.string().trim().min(2, 'Give the course a name (e.g. Dengue)').max(80),
  payMode: z.enum(COURSE_PAY_MODES),
  /** Day 1 of the course (India date); not given = the first sitting's day. */
  startDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Empty is allowed: the doctor adds sittings day by day on the patient's course page. */
  sittings: z.array(sittingInputSchema).max(60),
});
export type CourseInput = z.input<typeof courseInputSchema>;

export const courseCloseSchema = z.object({ reason: z.string().trim().min(3, 'Say why the course is closed').max(200) });

export interface CourseItem {
  id: number;
  kind: 'medicine' | 'test' | 'charge' | 'note';
  medicineId: number | null;
  testId: number | null;
  description: string;
  quantity: number;
  pricePaise: number;
  prepaid: boolean;
  givenAt: string | null;
}
export interface CourseSitting {
  id: number;
  dueAt: string;
  kind: SittingKind;
  reviewFeePaise: number | null;
  status: 'planned' | 'started' | 'done' | 'missed' | 'cancelled';
  visitId: number | null;
  doneAt: string | null;
  note: string | null;
  items: CourseItem[];
}
export interface TreatmentCourse {
  id: number;
  patientId: number;
  visitId: number;
  name: string;
  payMode: CoursePayMode;
  status: 'active' | 'frozen' | 'closed';
  doctorName: string | null;
  frozenAt: string | null;
  closedAt: string | null;
  closedReason: string | null;
  creditPaise: number;
  createdAt: string;
  sittings: CourseSitting[];
}
/** A sitting on the "Today's treatments" list. */
export interface DueSitting extends CourseSitting {
  courseId: number;
  courseName: string;
  courseStatus: TreatmentCourse['status'];
  payMode: CoursePayMode;
  patientId: number;
  patientName: string;
  patientUhid: string;
  patientPhone: string | null;
  /** "Day 2 evening": the sitting's place in its course. */
  label: string;
}

/** "Morning" / "Afternoon" / "Evening" / "Night" for a time of day in India. */
export function partOfDay(iso: string): string {
  const h = Number(new Date(iso).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }));
  // After midnight until 5 am is still the night (a sitting at 12:30 am is not "morning").
  return h < 5 ? 'night' : h < 12 ? 'morning' : h < 16 ? 'afternoon' : h < 20 ? 'evening' : 'night';
}
/** India date of an ISO time: "2026-10-14". */
export const indiaDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** Parts of the day a sitting can be at, with the usual clock time (India). */
export const PARTS_OF_DAY = [
  { key: 'morning', label: 'Morning', hhmm: '08:00' },
  { key: 'afternoon', label: 'Afternoon', hhmm: '14:00' },
  { key: 'evening', label: 'Evening', hhmm: '18:00' },
  { key: 'night', label: 'Night', hhmm: '21:00' },
] as const;
export type PartOfDay = (typeof PARTS_OF_DAY)[number]['key'];

/** A course template: the usual sittings, by day number (1 = the day it starts) and part of the day. */
export const courseTemplateSchema = z.object({
  name: z.string().trim().min(2, 'Give the template a name (e.g. Dengue)').max(80),
  sittings: z
    .array(
      z.object({
        day: z.number().int().min(1).max(30),
        part: z.enum(['morning', 'afternoon', 'evening', 'night']),
        kind: z.enum(SITTING_KINDS),
        reviewFeePaise: z.number().int().min(0).max(10_000_000).nullable().optional(),
        note: sittingNote,
        items: z.array(courseItemInputSchema).max(30).default([]),
      }),
    )
    .min(1, 'Add at least one sitting')
    .max(60),
});
export type CourseTemplateInput = z.input<typeof courseTemplateSchema>;
export interface CourseTemplate extends z.infer<typeof courseTemplateSchema> {
  id: number;
}

/** "+ Add now": given right now (dizzy -> glucose): medicines and charges, saved as given and put on the bill. */
export const courseNowSchema = z.object({
  items: z
    .array(courseItemInputSchema)
    .min(1, 'Pick what was given')
    .max(30)
    .refine((xs) => xs.every((i) => i.kind !== 'test'), { message: 'A test is added for later (the lab takes the sample)' }),
});

/** Change a planned sitting: its time and (unless paid on day one) what is in it. */
export const sittingEditSchema = z.object({
  dueAt: z.string().datetime({ offset: true }).optional(),
  reviewFeePaise: z.number().int().min(0).max(10_000_000).nullable().optional(),
  /** review / lab / nurse: what the sitting is, worked out from what is in it. */
  kind: z.enum(SITTING_KINDS).optional(),
  note: sittingNote,
  items: z.array(courseItemInputSchema).max(30).optional(),
});

/**
 * What a sitting is, from what is in it: with the doctor = a review (OP token); only lab tests = a lab visit;
 * anything given (a drip, an injection, a charge) = the nurse. One sitting can hold all of them at once.
 */
export function sittingKindOf(review: boolean, items: { kind: string }[]): SittingKind {
  if (review) return 'review';
  const real = items.filter((i) => i.kind !== 'note');
  return real.length > 0 && real.every((i) => i.kind === 'test') ? 'lab' : 'nurse';
}
