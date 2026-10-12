import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import type { PrintHeader } from '@platform/shared';
import { Button, Card, CardHeader, Field, Input, Skeleton, toast, Textarea } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { ReportFooter, ReportHeader, ReportWatermark } from './ReportHeader';

const MAX_IMAGE_BYTES = 300 * 1024;

/** Reads an image file as a data URL (stored with the branch, so it prints offline). */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error('Use a PNG, JPG or WebP image'));
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error('Image is too large (max 300 KB). Crop or shrink it first.'));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the image'));
    r.readAsDataURL(file);
  });
}

function ImagePicker({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (v: string | null) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-subtle">
          {value ? <img src={value} alt="" className="max-h-full max-w-full" /> : <ImagePlus className="size-5 text-muted" />}
        </div>
        <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium hover:bg-subtle">
          {value ? 'Change' : 'Upload'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                onChange(await readImage(f));
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </label>
        {value && (
          <Button size="icon-sm" variant="ghost" aria-label={`Remove ${label}`} onClick={() => onChange(null)}>
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Settings → Print header: what this branch prints at the top of lab reports (and later bills). */
export function PrintHeaderForm({ branch, branchName }: { branch: string; branchName: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['print-header', branch], queryFn: () => api.get<{ header: PrintHeader }>(`/b/${branch}/print-header`) });
  const [h, setH] = useState<PrintHeader | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setH(data.header);
  }, [data]);

  if (isLoading || !h) return <Skeleton className="h-96" />;
  const set = <K extends keyof PrintHeader>(k: K, v: PrintHeader[K]) => setH({ ...h, [k]: v });
  const setDoc = (i: number, k: 'name' | 'degree' | 'role', v: string) => set('doctors', h.doctors.map((d, j) => (j === i ? { ...d, [k]: v } : d)));

  async function save() {
    setSaving(true);
    try {
      await api.put(`/b/${branch}/print-header`, h);
      qc.invalidateQueries({ queryKey: ['print-header', branch] });
      qc.invalidateQueries({ queryKey: ['lab-report', branch] });
      toast.success('Print header saved', { description: `Used on ${branchName} reports from now on.` });
    } catch (e) {
      toast.error(e instanceof ApiError && e.fields ? Object.values(e.fields)[0]![0]! : errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title={`Print header · ${branchName}`} description="Printed at the top of this branch's reports. Tamil text is fine." />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Hospital name (as printed)" htmlFor="ph-title" className="sm:col-span-2">
            <Input id="ph-title" value={h.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. City Hospital" />
          </Field>
          <Field label="Address" htmlFor="ph-address" className="sm:col-span-2">
            <Input id="ph-address" value={h.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="ph-phone">
            <Input id="ph-phone" value={h.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <ImagePicker label="Logo" value={h.logo} onChange={(v) => set('logo', v)} />
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-primary)]" checked={h.watermark} disabled={!h.logo} onChange={(e) => set('watermark', e.target.checked)} />
            <span>
              Print the logo large and faint behind the lab results
              <span className="block text-xs text-muted">{h.logo ? 'A background logo on every page of the lab report.' : 'Choose a logo first.'}</span>
            </span>
          </label>
          <Field label="Lab report footer" htmlFor="ph-footer" className="sm:col-span-2" hint="Printed at the end of the report, under the signatures. Optional.">
            <Textarea id="ph-footer" rows={2} maxLength={300} value={h.footer} onChange={(e) => set('footer', e.target.value)} placeholder="e.g. Lab timings 7 am - 9 pm · This report is for the treating doctor's use." />
          </Field>

          <div className="border-t border-border pt-4 sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Doctors on the header</span>
              {h.doctors.length < 3 && (
                <Button size="sm" variant="outline" onClick={() => set('doctors', [...h.doctors, { name: '', degree: '', role: '' }])}>
                  <Plus /> Add doctor
                </Button>
              )}
            </div>
            {h.doctors.length === 0 && <p className="text-xs text-muted">Optional. Up to 3 doctors.</p>}
            <div className="space-y-2">
              {h.doctors.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1.2fr_1fr_1.4fr_auto]">
                  <Input aria-label="Doctor name" placeholder="Dr. name" value={d.name} onChange={(e) => setDoc(i, 'name', e.target.value)} />
                  <Input aria-label="Degree" placeholder="MBBS MD" value={d.degree} onChange={(e) => setDoc(i, 'degree', e.target.value)} className="max-sm:order-3" />
                  <Input aria-label="Role" placeholder="General physician" value={d.role} onChange={(e) => setDoc(i, 'role', e.target.value)} className="max-sm:order-4 max-sm:col-span-2" />
                  <Button size="icon" variant="ghost" aria-label="Remove doctor" onClick={() => set('doctors', h.doctors.filter((_, j) => j !== i))}>
                    <Trash2 className="text-critical" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 border-t border-border pt-4 sm:col-span-2 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-semibold">Left signature</span>
              <Input aria-label="Left signature name" placeholder="Name (optional)" value={h.leftSignName} onChange={(e) => set('leftSignName', e.target.value)} />
              <Input aria-label="Left signature title" placeholder="Lab Technician" value={h.leftSignTitle} onChange={(e) => set('leftSignTitle', e.target.value)} />
              <ImagePicker label="Signature image" value={h.leftSignImage} onChange={(v) => set('leftSignImage', v)} />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-semibold">Right signature</span>
              <Input aria-label="Right signature name" placeholder="Dr. name" value={h.rightSignName} onChange={(e) => set('rightSignName', e.target.value)} />
              <Input aria-label="Right signature title" placeholder="MBBS, DNB (OG)" value={h.rightSignTitle} onChange={(e) => set('rightSignTitle', e.target.value)} />
              <ImagePicker label="Signature image" value={h.rightSignImage} onChange={(v) => set('rightSignImage', v)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-3">
          <Button variant="outline" onClick={() => setH(data!.header)}>
            Discard
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save print header'}
          </Button>
        </div>
      </Card>

      <Card className="h-fit">
        <CardHeader title="Preview" description="The lab report as it prints: header, background logo, sample results, signatures and footer." />
        <div className="overflow-x-auto bg-[#dfe5e1] p-4">
          <div className="relative mx-auto min-h-[150mm] w-[190mm] origin-top-left overflow-hidden bg-white p-[8mm] shadow max-xl:scale-[0.6] max-xl:mb-[-40%]">
            <ReportWatermark header={h} />
            <div className="relative z-[1]">
              <ReportHeader header={h} />
              <div className="mb-2 text-center text-[14px] font-semibold text-[#1f6b4f]">Laboratory Report</div>
              {/* A made-up patient and two results, only to show the page as it prints. */}
              <div className="mb-2.5 grid grid-cols-2 gap-x-6 gap-y-[3px] rounded-md border border-[#111] px-3 py-[7px] text-[12px]">
                <span><b>Patient Name:</b> Sample Patient</span>
                <span><b>UHID:</b> AH000001</span>
                <span><b>Age / Sex:</b> 34 Y / Female</span>
                <span><b>Report Date:</b> 12/10/2026, 10:30 am</span>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-y border-[#111] text-left"><th className="py-1">Test</th><th>Result</th><th>Unit</th><th>Normal range</th></tr>
                </thead>
                <tbody>
                  <tr><td className="py-1">Haemoglobin</td><td>12.4</td><td>gm/dl</td><td>12 - 15</td></tr>
                  <tr><td className="py-1">Total WBC Count</td><td>7800</td><td>cells/cumm</td><td>4000 - 11000</td></tr>
                  <tr><td className="py-1">Platelet Count</td><td>2.6</td><td>lakhs/cumm</td><td>1.5 - 4.5</td></tr>
                </tbody>
              </table>
              <div className="mt-6 text-center text-[12px] tracking-[.5px]">************ End of the Report ************</div>
              <div className="mt-8 flex justify-between text-[12px]">
                <span>{h.leftSignName || ' '}<br /><b>{h.leftSignTitle || 'Lab Technician'}</b></span>
                <span className="text-right">{h.rightSignName || ' '}<br /><b>{h.rightSignTitle}</b></span>
              </div>
              <ReportFooter header={h} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
