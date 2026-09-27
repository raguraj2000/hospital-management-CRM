/**
 * How a lab result is marked on screen and on the printed report. One copy,
 * used by the server (what gets saved) and the app (live marking while
 * typing), so they can never disagree. Same rules as the hospital's own
 * report template:
 *
 * - 'H' / 'L': a number above / below a numeric normal range. Like the
 *   template, the number is read from the start of the answer, so "8-10"
 *   pus cells is read as 8.
 * - '!': a word answer that isn't the normal one (e.g. Sugar "++" where
 *   normal is "Nil"). Printed bold, with no letter.
 * - null: normal, blank, or a row marked "never flag" (e.g. blood group).
 */
export type LabFlag = 'H' | 'L' | '!' | null;

const NORMAL_WORDS = ['nil', 'absent', 'negative', 'non reactive', 'non-reactive', 'normal', 'not detected'];

export function flagLabValue(
  value: string,
  range: { low: number | null; high: number | null; normalText: string | null; noFlag: boolean },
): LabFlag {
  const result = value.trim();
  if (range.noFlag || !result) return null;
  const n = parseFloat(result.replace(/,/g, ''));

  if (range.low !== null || range.high !== null) {
    if (Number.isNaN(n)) return null; // a word answer against a number range: nothing to compare
    if (range.low !== null && n < range.low) return 'L';
    if (range.high !== null && n > range.high) return 'H';
    return null;
  }
  if (!Number.isNaN(n) || !range.normalText) return null;

  const a = result.toLowerCase();
  const b = range.normalText.trim().toLowerCase();
  if (NORMAL_WORDS.includes(b)) return NORMAL_WORDS.includes(a) ? null : '!';
  return a === b ? null : '!';
}
