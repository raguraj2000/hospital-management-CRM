import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useState } from 'react';
import type { PrintHeader } from '@platform/shared';
import { Card, CardHeader, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/core/api/client';
import { ImagePicker } from './PrintHeaderForm';

/** The branch's logo, where every screen and paper takes it from (the same query the side menu and the reports use). */
export const useBranchLogo = (branch: string | undefined) =>
  useQuery({ queryKey: ['print-header', branch], queryFn: () => api.get<{ header: PrintHeader }>(`/b/${branch}/print-header`), enabled: !!branch, staleTime: 5 * 60_000 });

/**
 * Branch settings: upload the branch logo. It shows at the top of the side menu and prints on bills and lab
 * reports. The rest of the printed header (name, address, doctors, signatures, footer) is in Lab > Report header.
 */
export function BranchLogoCard({ branch, branchName }: { branch: string; branchName: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useBranchLogo(branch);
  const [saving, setSaving] = useState(false);
  if (isLoading || !data) return <Skeleton className="h-40" />;
  const h = data.header;

  async function save(logo: string | null, watermark = h.watermark) {
    setSaving(true);
    try {
      // Without a logo there is nothing to print in the background.
      await api.put(`/b/${branch}/print-header`, { ...h, logo, watermark: logo ? watermark : false });
      await qc.invalidateQueries({ queryKey: ['print-header', branch] });
      qc.invalidateQueries({ queryKey: ['lab-report', branch] });
      toast.success(logo ? (watermark !== h.watermark ? (watermark ? 'The logo prints faint behind bills and lab reports' : 'No logo behind bills and lab reports') : 'Branch logo saved') : 'Branch logo removed', { description: `${branchName}: side menu, bills and lab reports.` });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader title="Branch logo" description={`${branchName}: side menu, bills and lab reports.`} />
      <div className={`p-4 ${saving ? 'opacity-60' : ''}`}>
        <ImagePicker label={h.logo ? 'Current logo' : 'No logo yet'} value={h.logo} onChange={(v) => void save(v ?? null)} />
        <label className={`mt-3 flex items-start gap-2.5 text-sm ${h.logo ? '' : 'opacity-50'}`}>
          <input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-primary)]" checked={!!h.watermark} disabled={!h.logo || saving} onChange={(e) => void save(h.logo ?? null, e.target.checked)} />
          <span>
            <span className="font-medium">Print the logo in the background</span>
            <span className="block text-xs text-muted">Large and faint behind the bills, receipts and lab reports.{!h.logo && ' Upload a logo first.'}</span>
          </span>
        </label>
        <p className="mt-3 text-xs text-muted">
          The printed header is edited in{' '}
          <Link to={`/${branch}/lab?tab=header`} className="font-medium text-brand hover:underline">
            Lab → Report header
          </Link>
          .
        </p>
      </div>
    </Card>
  );
}
