import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import type { PrintHeader } from '@platform/shared';
import { Button, Card, CardHeader, Field, Input, Skeleton, toast } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';
import { ReportHeader } from './ReportHeader';

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
        <CardHeader title="Preview" description="How it prints on A4 (scaled)." />
        <div className="overflow-x-auto bg-[#dfe5e1] p-4">
          <div className="mx-auto w-[190mm] origin-top-left bg-white p-[8mm] shadow max-xl:scale-[0.6] max-xl:mb-[-40%]">
            <ReportHeader header={h} />
            <div className="text-center text-[14px] font-semibold text-[#1f6b4f]">Laboratory Report</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
