import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, FilePlus2, ReceiptText } from 'lucide-react';
import { formatRupees, type OpBill } from '@platform/shared';
import { Badge, Button, Card, CardHeader, Skeleton, toast } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { useCan } from '@/state/auth';
import { billLabel, billTone } from '@/components/format';


/** Bill box on the consultation screen: create the bill, see its status. */
export function VisitBill({ branch, visitId }: { branch: string; visitId: number }) {
  const canReceive = useCan('billing.receive');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['visit-bills', branch, visitId],
    queryFn: () => api.get<{ bills: OpBill[]; unbilledLab: { id: number; testName: string; pricePaise: number }[] }>(`/b/${branch}/visits/${visitId}/bills`),
  });
  const create = useMutation({
    mutationFn: () => api.post<{ bill: OpBill }>(`/b/${branch}/visits/${visitId}/bills`),
    onSuccess: ({ bill }) => {
      qc.invalidateQueries({ queryKey: ['visit-bills', branch, visitId] });
      qc.invalidateQueries({ queryKey: ['patient-bills', branch] });
      navigate(`/${branch}/billing/${bill.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const bills = data?.bills ?? [];
  const openBill = bills.find((b) => b.editable);
  const unbilled = data?.unbilledLab ?? [];
  const canCreate = canReceive && !openBill && (bills.length === 0 || unbilled.length > 0);

  return (
    <Card>
      <CardHeader title="Bill" description="Consultation + lab tests. Medicines are paid at the pharmacy." icon={ReceiptText} iconTone="positive" action={bills.length > 0 && <Link to={`/${branch}/visits/${visitId}/bill/print`} className="text-sm font-medium text-brand hover:underline">Print bill</Link>} />
      {isLoading ? (
        <Skeleton className="m-4 h-12" />
      ) : (
        <div className="divide-y divide-border">
          {bills.map((b) => (
            <Link key={b.id} to={`/${branch}/billing/${b.id}`} className="flex min-h-11 items-center justify-between px-4 py-2.5 text-sm hover:bg-subtle">
              <span className="font-mono text-xs font-medium">{b.billNo}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{formatRupees(b.totalPaise)}</span>
                <Badge tone={billTone[b.status]} dot>
                  {billLabel[b.status]}
                </Badge>
                <ChevronRight className="size-5 text-muted" />
              </span>
            </Link>
          ))}
          {bills.length === 0 && <p className="px-4 py-3 text-sm text-muted">Not billed yet.</p>}
          {unbilled.length > 0 && bills.length > 0 && (
            <p className="px-4 py-2.5 text-xs font-medium text-warning">
              {unbilled.length} new lab test{unbilled.length > 1 ? 's' : ''} not billed ({formatRupees(unbilled.reduce((s, x) => s + x.pricePaise, 0))})
              {openBill ? ' — open the unpaid bill and press Update.' : '.'}
            </p>
          )}
          {canCreate && (
            <div className="p-3">
              <Button className="w-full" variant="outline" disabled={create.isPending} onClick={() => create.mutate()}>
                <FilePlus2 /> {bills.length ? 'Bill the new lab tests' : 'Create bill'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
