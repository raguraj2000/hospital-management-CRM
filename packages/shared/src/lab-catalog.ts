// The clinic's standard lab tests. Loaded into a
// branch with "Load standard tests"; every branch can then change prices and ranges.

export type ParamType = 'number' | 'text';

export interface CatalogParameter {
  name: string;
  method: string;
  unit: string;
  refRange: string;
  type: ParamType;
  /** Quick-pick buttons on the results screen. */
  options?: string[];
  /** Never mark H/L (e.g. blood group). */
  noFlag?: boolean;
}

export interface CatalogTest {
  department: string;
  name: string;
  /** 'panel' prints on the lab report; 'card' prints on the card-test report. */
  kind: 'panel' | 'card';
  parameters: CatalogParameter[];
}

const R = (name: string, method: string, unit: string, refRange: string, extra: Partial<CatalogParameter> = {}): CatalogParameter => ({
  name,
  method,
  unit,
  refRange,
  type: 'number',
  ...extra,
});
const T = (name: string, method: string, refRange: string, options: string[], extra: Partial<CatalogParameter> = {}): CatalogParameter => ({
  name,
  method,
  unit: '',
  refRange,
  type: 'text',
  options,
  ...extra,
});
const CARD = (name: string): CatalogParameter => T(name, 'Card Test', 'Negative', ['NEGATIVE', 'POSITIVE']);

const WB = '(WB-EDTA) Automated';
const NIL = ['Nil', 'Trace', '+', '++', '+++'];

export const LAB_DEPARTMENTS = ['DEPARTMENT OF HEMATOLOGY', 'DEPARTMENT OF BIOCHEMISTRY', 'DEPARTMENT OF SEROLOGY', 'DEPARTMENT OF CLINICAL PATHOLOGY', 'CARD TESTS'] as const;

export const LAB_CATALOG: CatalogTest[] = [
  // ---------------- Hematology
  {
    department: 'DEPARTMENT OF HEMATOLOGY',
    name: 'Complete Blood Count',
    kind: 'panel',
    parameters: [
      R('Haemoglobin', WB, 'gm/dl', '12 - 15'),
      R('Total WBC Count', WB, 'cells/cumm', '4000 - 11000'),
      R('Red Blood Count (RBC)', WB, 'Million/cumm', '3.5 - 5.5'),
      R('Hematocrit (PCV)', WB, '%', '36 - 47'),
      R('Mean Corpuscular Volume (MCV)', WB, 'fl', '79 - 96'),
      R('Mean Corpuscular Hb (MCH)', WB, 'pg', '27 - 31'),
      R('Mean Corpuscular Hb Conc. (MCHC)', WB, 'gm/dl', '32 - 36'),
      R('Platelet Count', WB, 'lakhs/cumm', '1.5 - 4.5'),
      R('RDW-SD', WB, 'fl', '37 - 54'),
      R('RDW-CV', WB, '%', '12 - 15'),
    ],
  },
  {
    department: 'DEPARTMENT OF HEMATOLOGY',
    name: 'Differential Counts',
    kind: 'panel',
    parameters: [R('Neutrophils', WB, '%', '42 - 75'), R('Lymphocytes', WB, '%', '20 - 45'), R('Monocytes', WB, '%', '0 - 10'), R('Eosinophils', WB, '%', '0 - 6'), R('Basophils', WB, '%', '0.0 - 2.0')],
  },
  {
    department: 'DEPARTMENT OF HEMATOLOGY',
    name: 'Coagulation (BT / CT)',
    kind: 'panel',
    parameters: [R('Bleeding Time (BT)', 'Capillary Tube Method', 'mins', '2 - 6'), R('Clotting Time (CT)', 'Capillary Tube Method', 'mins', '2 - 8')],
  },
  {
    department: 'DEPARTMENT OF HEMATOLOGY',
    name: 'Blood Grouping & Rh Typing',
    kind: 'panel',
    parameters: [
      T('ABO Group', 'Slide Agglutination', '', ['A', 'B', 'AB', 'O'], { noFlag: true }),
      T('Rh (D) Typing', 'Slide Agglutination', '', ['POSITIVE', 'NEGATIVE'], { noFlag: true }),
    ],
  },
  // ---------------- Biochemistry
  {
    department: 'DEPARTMENT OF BIOCHEMISTRY',
    name: 'Blood Sugar',
    kind: 'panel',
    parameters: [
      R('Fasting Blood Sugar (FBS)', 'Plasma, GOD-POD', 'mg/dl', '70 - 100'),
      R('Post Prandial Blood Sugar (PPBS)', 'Plasma, GOD-POD', 'mg/dl', '70 - 140'),
      R('HbA1c (Glycated Haemoglobin)', '(WB-EDTA) HPLC', '%', '4.0 - 5.6'),
    ],
  },
  {
    department: 'DEPARTMENT OF BIOCHEMISTRY',
    name: 'Renal Function Test',
    kind: 'panel',
    parameters: [R('Blood Urea', 'Serum Urease & GLDH', 'mg/dl', '10 - 45'), R('Serum Creatinine', 'Serum Jaffes', 'mg/dl', '0.5 - 1.2'), R('Uric Acid - Serum', 'Serum Enzymatic', 'mg/dl', '3.5 - 7.2')],
  },
  {
    department: 'DEPARTMENT OF BIOCHEMISTRY',
    name: 'Liver Function Tests (LFT)',
    kind: 'panel',
    parameters: [
      R('Bilirubin Total', 'Serum Diazo', 'mg/dl', '0.2 - 1.2'),
      R('Bilirubin Direct', 'Serum Diazo', 'mg/dl', '0.0 - 0.5'),
      R('Bilirubin Indirect', 'Calculated', 'mg/dl', '0.3 - 1.0'),
      R('AST / SGOT', 'Serum, Kinetic - IFCC', 'U/L', '5 - 36'),
      R('ALT / SGPT', 'Serum, Kinetic - IFCC', 'U/L', '0 - 55'),
      R('Alkaline Phosphatase (ALP)', 'Serum, Kinetic - IFCC', 'U/L', '35 - 150'),
      R('Total Protein', 'Serum Biuret', 'g/dl', '6.3 - 8.2'),
      R('Serum Albumin', 'Serum, Bromocresol green', 'g/dl', '3.5 - 5'),
      R('Serum Globulin', 'Calculated', 'g/dl', '2.5 - 5'),
    ],
  },
  // ---------------- Serology
  {
    department: 'DEPARTMENT OF SEROLOGY',
    name: 'Serum Beta hCG (Quantitative)',
    kind: 'panel',
    parameters: [R('Serum Beta hCG', 'CLIA', 'mIU/ml', 'Non-pregnant: < 5', { noFlag: true })],
  },
  // ---------------- Clinical pathology
  {
    department: 'DEPARTMENT OF CLINICAL PATHOLOGY',
    name: 'Urine Routine Analysis',
    kind: 'panel',
    parameters: [
      T('Colour', 'Visual', 'Pale yellow', ['Pale yellow', 'Yellow', 'Dark yellow', 'Red'], { noFlag: true }),
      T('Appearance', 'Visual', 'Clear', ['Clear', 'Slightly turbid', 'Turbid']),
      R('Specific Gravity', 'Reagent Strip', '', '1.005 - 1.030', { options: ['1.010', '1.015', '1.020', '1.025'] }),
      R('pH', 'Reagent Strip', '', '4.5 - 8.0', { options: ['5.0', '6.0', '7.0', '8.0'] }),
      T('Albumin', 'Reagent Strip', 'Nil', NIL),
      T('Sugar', 'Reagent Strip', 'Nil', NIL),
      T('Ketone Bodies', 'Reagent Strip', 'Nil', ['Nil', '+', '++']),
      T('Bile Salts', "Fouchet / Hay's Test", 'Absent', ['Absent', 'Present']),
      T('Bile Pigments', "Fouchet / Hay's Test", 'Absent', ['Absent', 'Present']),
      T('Urobilinogen', 'Reagent Strip', 'Normal', ['Normal', 'Increased']),
      T('Blood', 'Reagent Strip', 'Nil', ['Nil', '+', '++']),
    ],
  },
  {
    department: 'DEPARTMENT OF CLINICAL PATHOLOGY',
    name: 'Urine Deposits (Microscopy)',
    kind: 'panel',
    parameters: [
      R('Pus Cells', 'Microscopy', '/hpf', '0 - 5', { options: ['Nil', '1-2', '2-4', '4-6', '8-10'] }),
      R('Epithelial Cells', 'Microscopy', '/hpf', '0 - 5', { options: ['Nil', '1-2', '2-4', 'Few'] }),
      R('RBCs', 'Microscopy', '/hpf', '0 - 2', { options: ['Nil', '1-2', '2-4'] }),
      T('Casts', 'Microscopy', 'Nil', ['Nil', 'Present']),
      T('Crystals', 'Microscopy', 'Nil', ['Nil', 'Calcium oxalate', 'Uric acid', 'Amorphous']),
      T('Bacteria', 'Microscopy', 'Nil', ['Nil', 'Few', 'Present']),
      T('Yeast Cells', 'Microscopy', 'Nil', ['Nil', 'Present']),
    ],
  },
  // ---------------- Card tests (printed on the card-test report)
  { department: 'CARD TESTS', name: 'WIDAL CARD TEST (IgM & IgG)', kind: 'card', parameters: [CARD('Widal IgM Antibody'), CARD('Widal IgG Antibody')] },
  {
    department: 'CARD TESTS',
    name: 'DENGUE NS1 Ag & Ab TEST (IgM & IgG)',
    kind: 'card',
    parameters: [CARD('Dengue NS1 Antigen'), CARD('Dengue IgM Antibody'), CARD('Dengue IgG Antibody')],
  },
  { department: 'CARD TESTS', name: 'MALARIA CARD TEST', kind: 'card', parameters: [CARD('P. falciparum Antigen'), CARD('P. vivax Antigen')] },
  { department: 'CARD TESTS', name: 'HBsAg (HEPATITIS B)', kind: 'card', parameters: [CARD('HBsAg')] },
  { department: 'CARD TESTS', name: 'HCV (HEPATITIS C)', kind: 'card', parameters: [CARD('HCV Antibody')] },
  { department: 'CARD TESTS', name: 'HIV I & II', kind: 'card', parameters: [CARD('HIV I & II Antibody')] },
  { department: 'CARD TESTS', name: 'VDRL', kind: 'card', parameters: [CARD('VDRL')] },
  { department: 'CARD TESTS', name: 'URINE PREGNANCY TEST', kind: 'card', parameters: [CARD('Urine hCG')] },
];

const NORMAL_WORDS = ['nil', 'absent', 'negative', 'non reactive', 'non-reactive', 'normal', 'not detected'];

/**
 * H (high), L (low), '!' (abnormal word result) or '' (normal / can't tell).
 * Same rules as the paper template: "a - b" ranges, "< x" / "> x", and normal words.
 */
export function flagResult(value: string, refRange: string, noFlag = false): '' | 'H' | 'L' | '!' {
  const res = String(value ?? '').trim();
  const rng = String(refRange ?? '').trim();
  if (noFlag || !res) return '';
  const v = parseFloat(res.replace(/,/g, ''));
  const m = rng.match(/(-?\d*\.?\d+)\s*[-–]\s*(-?\d*\.?\d+)/);
  if (!isNaN(v) && m) {
    if (v < +m[1]!) return 'L';
    if (v > +m[2]!) return 'H';
    return '';
  }
  if (m) return ''; // number range but a word result (e.g. Pus cells: Nil)
  const lt = rng.match(/^[<≤]\s*(\d*\.?\d+)/);
  const gt = rng.match(/^[>≥]\s*(\d*\.?\d+)/);
  if (!isNaN(v) && lt) return v > +lt[1]! ? 'H' : '';
  if (!isNaN(v) && gt) return v < +gt[1]! ? 'L' : '';
  if (!isNaN(v)) return '';
  const a = res.toLowerCase();
  const b = rng.toLowerCase();
  if (!b) return '';
  if (NORMAL_WORDS.includes(b)) return NORMAL_WORDS.includes(a) ? '' : '!';
  return a === b ? '' : '!';
}
