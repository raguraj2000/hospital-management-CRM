// Add or edit a lab test with its result lines (a group test: CBC with Haemoglobin, Basophils, ...),
// as they print on the report: name, method, unit, normal range.
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { toPaise, type LabTestDetail } from '@platform/shared';
import { Button, Field, Input, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';

interface Line {
  id?: number;
  name: string;
  method: string;
  unit: string;
  refRange: string;
}
const EMPTY: Line = { name: '', method: '', unit: '', refRange: '' };
const blank = (l: Line) => !l.name.trim() && !l.method.trim() && !l.unit.trim() && !l.refRange.trim();

/** "Hematology" -> "DEPARTMENT OF HEMATOLOGY", the heading as it prints on the report. */
const departmentOf = (typed: string) => {
  const d = typed.trim().toUpperCase();
  return !d ? undefined : d === 'OTHER TESTS' || d.startsWith('DEPARTMENT OF ') ? d : `DEPARTMENT OF ${d}`;
};
export const departmentLabel = (department: string) => department.replace('DEPARTMENT OF ', '');

/** `testId`: the test to edit; without it a new test is added. `departments`: the ones already in use, to pick from. */
export function LabTestForm({ branch, testId, departments, onDone, onCancel }: { branch: string; testId?: number; departments: string[]; onDone: () => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ['lab-test', branch, testId], queryFn: () => api.get<{ test: LabTestDetail }>(`/b/${branch}/lab/tests/${testId}`), enabled: testId != null, staleTime: 0, gcTime: 0 });
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [price, setPrice] = useState('');
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = existing.data?.test;
    if (!t) return;
    setName(t.name);
    setDepartment(departmentLabel(t.department));
    setPrice(String(t.pricePaise / 100));
    setLines(t.parameters.map((p) => ({ ...p })));
  }, [existing.data]);

  if (testId != null && existing.isLoading) return <Skeleton className="h-64" />;
  if (testId != null && existing.error) return <p className="text-sm text-critical">{errorMessage(existing.error)}</p>;

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function save() {
    const kept = lines.filter((l) => !blank(l));
    const rupees = Number(price);
    const problem =
      name.trim().length < 2
        ? 'Enter the test name.'
        : price.trim() === '' || !Number.isFinite(rupees) || rupees < 0
          ? 'Enter the price.'
          : kept.some((l) => !l.name.trim())
            ? 'Every result line needs a name.'
            : testId != null && kept.length === 0
              ? 'Add at least one result line.'
              : null;
    setError(problem);
    if (problem) return;
    const body = {
      name: name.trim(),
      pricePaise: toPaise(rupees),
      department: departmentOf(department),
      // A new test with no lines gets one line with its own name (a free-text result).
      parameters: kept.length ? kept.map((l) => ({ id: l.id, name: l.name.trim(), method: l.method.trim(), unit: l.unit.trim(), refRange: l.refRange.trim() })) : undefined,
    };
    setSaving(true);
    try {
      if (testId != null) await api.patch(`/b/${branch}/lab/tests/${testId}`, body);
      else await api.post(`/b/${branch}/lab/tests`, body);
      for (const k of ['lab-tests', 'lab-report']) qc.invalidateQueries({ queryKey: [k, branch] });
      toast.success(testId != null ? `${body.name} saved` : `${body.name} added`);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!saving) save();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr]">
        <Field required label="Test name" htmlFor="test-name">
          <Input id="test-name" autoFocus={testId == null} placeholder="e.g. Complete Blood Count" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Department" htmlFor="test-department">
          <Input id="test-department" list="test-departments" placeholder="e.g. Hematology" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <datalist id="test-departments">
            {departments.map((d) => (
              <option key={d} value={departmentLabel(d)} />
            ))}
          </datalist>
        </Field>
        <Field required label="Price (₹)" htmlFor="test-price">
          <Input id="test-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>

      <div>
        <div className="text-sm font-medium">Result lines</div>
        <p className="mb-2 text-xs text-muted">What the lab enters for this test, as it prints on the report. A line with a normal range is checked high / low; without one it is free text.</p>
        <div className="space-y-2">
          <div className="hidden gap-2 text-xs font-medium text-muted sm:grid sm:grid-cols-[2fr_1.5fr_1fr_1.3fr_2rem]">
            <span>Name</span>
            <span>Method</span>
            <span>Unit</span>
            <span>Normal range</span>
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-2 sm:grid-cols-[2fr_1.5fr_1fr_1.3fr_2rem] sm:border-0 sm:p-0">
              <Input aria-label={`Line ${i + 1}: name`} placeholder="e.g. Basophils" value={l.name} onChange={(e) => setLine(i, { name: e.target.value })} />
              <Input aria-label={`Line ${i + 1}: method`} placeholder="e.g. Microscopy" value={l.method} onChange={(e) => setLine(i, { method: e.target.value })} />
              <Input aria-label={`Line ${i + 1}: unit`} placeholder="e.g. %" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
              <Input aria-label={`Line ${i + 1}: normal range`} placeholder="e.g. 0 - 1" value={l.refRange} onChange={(e) => setLine(i, { refRange: e.target.value })} />
              <Button variant="ghost" size="icon" aria-label={`Remove line ${i + 1}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                <X />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" disabled={lines.length >= 60} onClick={() => setLines((ls) => [...ls, { ...EMPTY }])}>
          <Plus /> Add result line
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {testId != null ? 'Save test' : 'Add test'}
        </Button>
      </div>
    </form>
  );
}
