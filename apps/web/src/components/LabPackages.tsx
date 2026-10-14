// Lab packages: several tests at one price (Fever profile...). Made in Lab > Tests & prices (owner, branch admin);
// ticked like a test wherever tests are ordered (the doctor's Lab tab, Direct lab test).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatRupees, toPaise, type LabPackage, type LabTest } from '@platform/shared';
import { Badge, Button, Card, CardHeader, cn, ConfirmDelete, Dialog, EmptyState, Field, Input, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';

export const useLabPackages = (branch: string, enabled = true) =>
  useQuery({ queryKey: ['lab-packages', branch], queryFn: () => api.get<{ packages: LabPackage[] }>(`/b/${branch}/lab/packages`), enabled, staleTime: 60_000 });

/** The packages as tick boxes, above the single tests. */
export function PackagePicker({ packages, tests, picked, onChange }: { packages: LabPackage[]; tests: LabTest[]; picked: number[]; onChange: (ids: number[]) => void }) {
  if (!packages.length) return null;
  const nameOf = new Map(tests.map((t) => [t.id, t.name]));
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Packages</div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {packages.map((p) => (
          <li key={p.id}>
            <label className={cn('flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm', picked.includes(p.id) ? 'border-brand bg-brand/5' : 'border-border hover:bg-subtle')}>
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-primary)]" checked={picked.includes(p.id)} onChange={(e) => onChange(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 font-medium">
                  <span className="truncate">
                    <Package className="mr-1 inline size-3.5 text-brand" />
                    {p.name}
                  </span>
                  <span className="tabular-nums">{formatRupees(p.pricePaise)}</span>
                </span>
                <span className="block truncate text-xs text-muted">{p.testIds.map((id) => nameOf.get(id) ?? '?').join(', ')}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lab > Tests & prices: the packages of the branch, with add / edit / delete for those who manage tests. */
export function LabPackagesCard({ branch, tests, canManage }: { branch: string; tests: LabTest[]; canManage: boolean }) {
  const qc = useQueryClient();
  const { data } = useLabPackages(branch);
  const [editing, setEditing] = useState<LabPackage | 'new' | null>(null);
  const [deleting, setDeleting] = useState<LabPackage | null>(null);
  const nameOf = new Map(tests.map((t) => [t.id, t.name]));
  const remove = useMutation({
    mutationFn: (p: LabPackage) => api.delete(`/b/${branch}/lab/packages/${p.id}`),
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ['lab-packages', branch] });
      setDeleting(null);
      toast.success(`${p.name} deleted`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const packages = data?.packages ?? [];
  return (
    <Card className="mb-4">
      <CardHeader
        title={`Packages (${packages.length})`}
        description="Several tests at one price. Ordered with one tick; the bill lists each test, adding up to the package price."
        action={
          canManage && (
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus /> New package
            </Button>
          )
        }
      />
      {packages.length === 0 ? (
        <EmptyState icon={Package} title="No packages yet" description={canManage ? 'Example: Fever profile = CBC + Widal + Malaria at ₹600.' : 'The owner or branch admin can make them.'} />
      ) : (
        <ul className="divide-y divide-border">
          {packages.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="font-medium">{p.name}</div>
                <div className="truncate text-sm text-muted">{p.testIds.map((id) => nameOf.get(id) ?? '?').join(', ')}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tabular-nums">{formatRupees(p.pricePaise)}</span>
                {p.testsPaise > p.pricePaise && <Badge tone="positive">saves {formatRupees(p.testsPaise - p.pricePaise)}</Badge>}
                {canManage && (
                  <>
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <PackageForm branch={branch} tests={tests} initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'package'}?`}
        description="Tests already ordered stay as they are."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </Card>
  );
}

function PackageForm({ branch, tests, initial, onClose }: { branch: string; tests: LabTest[]; initial: LabPackage | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? String(initial.pricePaise / 100) : '');
  const [ids, setIds] = useState<number[]>(initial?.testIds ?? []);
  const sum = tests.filter((t) => ids.includes(t.id)).reduce((s, t) => s + t.pricePaise, 0);
  const save = useMutation({
    mutationFn: () => {
      const body = { name, pricePaise: toPaise(Number(price) || 0), testIds: ids };
      return initial ? api.put(`/b/${branch}/lab/packages/${initial.id}`, body) : api.post(`/b/${branch}/lab/packages`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-packages', branch] });
      toast.success(`${name} saved`);
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title={initial ? `Edit ${initial.name}` : 'New package'} description="Tick the tests, then set the package price.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!save.isPending) save.mutate();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Field required label="Name" htmlFor="pkg-name">
            <Input id="pkg-name" autoFocus placeholder="e.g. Fever profile" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field required label="Package price (₹)" htmlFor="pkg-price" hint={sum ? `Tests one by one: ${formatRupees(sum)}` : undefined}>
            <Input id="pkg-price" inputMode="decimal" className="text-right" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </div>
        <ul className="grid max-h-[40vh] gap-1.5 overflow-y-auto sm:grid-cols-2">
          {tests.map((t) => (
            <li key={t.id}>
              <label className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm', ids.includes(t.id) ? 'border-brand bg-brand/5' : 'border-border hover:bg-subtle')}>
                <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={ids.includes(t.id)} onChange={(e) => setIds((s) => (e.target.checked ? [...s, t.id] : s.filter((x) => x !== t.id)))} />
                <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                <span className="text-muted tabular-nums">{formatRupees(t.pricePaise)}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending || name.trim().length < 2 || ids.length < 2 || price === ''}>
            {save.isPending ? 'Saving…' : 'Save package'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
