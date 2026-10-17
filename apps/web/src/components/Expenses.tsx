// Other expenses: money spent on things that are not medicine stock (a keyboard, a chair, a repair),
// bought from a vendor of the list or from any shop.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { formatRupees, toPaise, VENDOR_PAYMENT_MODES, type Expense, type Vendor, type VendorPaymentMode } from '@platform/shared';
import { Button, Card, CardHeader, ConfirmDelete, Field, Input, NativeSelect, Pager, Skeleton, Table, TBody, TD, TH, THead, toast, TR, usePaged } from '@platform/ui';
import { api, errorMessage } from '@/api/client';
import { fmtDay } from './format';
import { ListSearch, textMatch } from './ListSearch';

const NEW_SHOP = 'new';
const MODE: Record<VendorPaymentMode, string> = { cash: 'Cash', upi: 'UPI', cheque: 'Cheque', bank: 'Bank transfer' };
const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export function Expenses({ branch, vendors }: { branch: string; vendors: Vendor[] }) {
  const qc = useQueryClient();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', branch, from, to],
    queryFn: () => api.get<{ from: string; to: string; expenses: Expense[]; totalPaise: number }>(`/b/${branch}/expenses?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`),
  });
  const [q, setQ] = useState('');
  const found = (data?.expenses ?? []).filter((e) => textMatch(q, e.description, e.vendorName, e.notes));
  const { rows, pager } = usePaged(found, q);
  const [removing, setRemoving] = useState<Expense | null>(null);

  // The add form, on one line.
  const [day, setDay] = useState(istToday);
  const [what, setWhat] = useState('');
  const [shop, setShop] = useState(''); // '' = none, a vendor id, or NEW_SHOP
  const [shopName, setShopName] = useState('');
  const [keepShop, setKeepShop] = useState(true);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<VendorPaymentMode>('cash');
  const ready = what.trim().length >= 2 && Number(amount) > 0 && (shop !== NEW_SHOP || shopName.trim().length >= 2);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['expenses', branch] });
    qc.invalidateQueries({ queryKey: ['vendors', branch] });
  };
  const add = useMutation({
    mutationFn: () =>
      api.post(`/b/${branch}/expenses`, {
        expenseDate: day,
        description: what.trim(),
        vendorId: shop && shop !== NEW_SHOP ? Number(shop) : null,
        vendorName: shop === NEW_SHOP ? shopName.trim() : '',
        addVendor: shop === NEW_SHOP && keepShop,
        amountPaise: toPaise(Number(amount) || 0),
        mode,
      }),
    onSuccess: () => {
      refresh();
      toast.success(`${what.trim()} added · ${formatRupees(toPaise(Number(amount) || 0))}`);
      setWhat('');
      setAmount('');
      setShop('');
      setShopName('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (e: Expense) => api.delete(`/b/${branch}/expenses/${e.id}`),
    onSuccess: () => {
      refresh();
      toast.success('Expense removed');
      setRemoving(null);
    },
  });

  return (
    <Card>
      <CardHeader
        title="Other expenses"
        description="Things bought for the hospital that are not medicines: a keyboard, a chair, a repair, stationery."
        action={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ListSearch className="sm:w-52" label="Search the expenses" placeholder="What or shop…" value={q} onChange={setQ} />
            <Input type="date" aria-label="From" className="w-auto" value={from || data?.from || ''} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-muted">to</span>
            <Input type="date" aria-label="To" className="w-auto" value={to || data?.to || ''} onChange={(e) => setTo(e.target.value)} />
          </div>
        }
      />
      <form
        className="grid grid-cols-2 gap-3 border-b border-border bg-subtle/40 p-4 lg:grid-cols-[9rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_8rem_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !add.isPending) add.mutate();
        }}
      >
        <Field required label="Date" htmlFor="exp-day">
          <Input id="exp-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field required label="What was bought" htmlFor="exp-what">
          <Input id="exp-what" placeholder="e.g. Keyboard for the front desk" maxLength={120} value={what} onChange={(e) => setWhat(e.target.value)} />
        </Field>
        <Field label="Bought from" htmlFor="exp-shop">
          <NativeSelect id="exp-shop" value={shop} onChange={(e) => setShop(e.target.value)}>
            <option value="">Not noted</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
            <option value={NEW_SHOP}>A new shop / vendor…</option>
          </NativeSelect>
        </Field>
        <Field required label="Amount (₹)" htmlFor="exp-amount">
          <Input id="exp-amount" inputMode="decimal" className="text-right" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field required label="Paid by" htmlFor="exp-mode">
          <NativeSelect id="exp-mode" value={mode} onChange={(e) => setMode(e.target.value as VendorPaymentMode)}>
            {VENDOR_PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE[m]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Button type="submit" className="col-span-2 lg:col-span-1" disabled={!ready || add.isPending}>
          <Plus /> {add.isPending ? 'Adding…' : 'Add expense'}
        </Button>
        {shop === NEW_SHOP && (
          <div className="col-span-2 flex flex-wrap items-center gap-3 lg:col-span-full">
            <Input aria-label="Name of the shop" autoFocus placeholder="Name of the shop or vendor" maxLength={80} className="max-w-sm" value={shopName} onChange={(e) => setShopName(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={keepShop} onChange={(e) => setKeepShop(e.target.checked)} />
              Add it to the vendor list
            </label>
          </div>
        )}
      </form>
      {isLoading ? (
        <Skeleton className="m-4 h-24" />
      ) : error ? (
        <p className="p-4 text-sm text-critical">{errorMessage(error)}</p>
      ) : !data || !found.length ? (
        <p className="px-4 py-8 text-center text-sm text-muted">{q ? `Nothing matches “${q}”.` : 'No expenses in these dates.'}</p>
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>What</TH>
                <TH>Bought from</TH>
                <TH>Paid by</TH>
                <TH className="text-right">Amount</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {rows.map((e) => (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap tabular-nums">{fmtDay(e.expenseDate)}</TD>
                  <TD>
                    <div className="font-medium">{e.description}</div>
                    {e.createdByName && <div className="text-xs text-muted">Entered by {e.createdByName}</div>}
                  </TD>
                  <TD>{e.vendorName ?? <span className="text-muted">—</span>}</TD>
                  <TD>{MODE[e.mode]}</TD>
                  <TD className="text-right font-medium tabular-nums">{formatRupees(e.amountPaise)}</TD>
                  <TD className="text-right">
                    <Button size="icon-sm" variant="ghost" aria-label={`Remove ${e.description}`} onClick={() => setRemoving(e)}>
                      <Trash2 className="text-critical" />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted">
              {data.expenses.length} expense{data.expenses.length === 1 ? '' : 's'} · {fmtDay(data.from)} to {fmtDay(data.to)}
            </span>
            <span className="text-xl font-semibold tabular-nums">Total {formatRupees(data.totalPaise)}</span>
          </div>
          <Pager {...pager} />
        </>
      )}
      <ConfirmDelete
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.description ?? 'this expense'}?`}
        description={`${formatRupees(removing?.amountPaise ?? 0)} is taken off the expenses.`}
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </Card>
  );
}
