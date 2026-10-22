import type { AdminUserRow, AdminWalletSummary, Paginated } from '@zproo/types';
import { Button, Card, Input } from '@zproo/ui';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Seo } from '@/components/seo/Seo';
import { fieldErrors, useAdminGet, useAdminMutation } from '@/features/admin/api';
import { fmtDateTime, inr } from '@/features/admin/format';
import { ConfirmDialog, DataTable, DemoBadge, Field, FilterSelect, PageHeader, Pagination, SearchBox, selectClass, StatCard, Toolbar } from '@/features/admin/ui';
import { env } from '@/lib/env';

export default function AdminWalletPage() {
  const query = useAdminGet<AdminWalletSummary>('/wallet');
  const d = query.data;
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'credit' | 'debit' | ''>('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ type: 'credit' as 'credit' | 'debit', amount: '', label: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // One id per submit attempt: if the same request is sent twice (double click, retry) the server applies it once.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const customers = useAdminGet<Paginated<AdminUserRow>>('/users', { search: customerSearch.trim(), page: 1, limit: 5 }, { enabled: !env.staticMode && !customer && customerSearch.trim().length >= 2 });
  const adjust = useAdminMutation<{ type: 'credit' | 'debit'; amountPaise: number; label: string; userId?: string; requestId: string }>('post', '/wallet/adjust', {
    success: 'Wallet updated',
    onSuccess: () => {
      setForm({ type: 'credit', amount: '', label: '' });
      setCustomer(null);
      setCustomerSearch('');
      setConfirmOpen(false);
      setRequestId(crypto.randomUUID());
    },
  });
  const amountPaise = Math.round(Number(form.amount) * 100);
  const canSubmit = !adjust.isPending && amountPaise >= 100 && amountPaise <= 10_000_000 && form.label.trim().length >= 3 && (env.staticMode || customer !== null);
  const errors = fieldErrors(adjust.error);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (d?.transactions ?? []).filter((t) => (!type || t.type === type) && (!q || `${t.userName} ${t.label}`.toLowerCase().includes(q)));
  }, [d, search, type]);

  return (
    <div className="space-y-6">
      <Seo title="Wallet · Admin" noIndex />
      <PageHeader icon={Wallet} title="ZPROO Wallet" description="Wallet balances, cashback and manual adjustments." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={env.staticMode ? 'Balance (this browser)' : 'Total balance'} loading={!d} value={d && inr(d.balancePaise)} />
        <StatCard label="Credited" icon={ArrowDownLeft} loading={!d} value={d && inr(d.creditedPaise)} hint="credits applied by staff" />
        <StatCard label="Spent" icon={ArrowUpRight} loading={!d} value={d && inr(d.debitedPaise)} hint="debits applied by staff" />
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-bold">Manual adjustment</h2>
        <form
          className="grid gap-3 sm:grid-cols-[10rem_10rem_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) setConfirmOpen(true);
          }}
        >
          {!env.staticMode && (
            <div className="sm:col-span-4">
              <Field label="Customer" error={errors.userId} hint="Search by name, email or mobile, then choose the customer whose wallet changes.">
                {(id) =>
                  customer ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="rounded-full border border-border px-3 py-1.5 font-semibold">{customer.name}</span>
                      <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => setCustomer(null)}>
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Input id={id} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Start typing a name, email or mobile" />
                      {customers.data && customers.data.items.length > 0 && (
                        <ul className="mt-1 divide-y divide-border rounded-xl border border-border text-sm">
                          {customers.data.items.map((u) => (
                            <li key={u.id}>
                              <button type="button" className="flex w-full justify-between gap-3 px-3 py-2 text-left hover:bg-muted/10" onClick={() => setCustomer({ id: u.id, name: u.fullName })}>
                                <span className="font-semibold">{u.fullName}</span>
                                <span className="text-muted">{u.email ?? u.phone}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {customers.data && customers.data.items.length === 0 && <p className="mt-1 text-xs text-muted">No customer found.</p>}
                    </div>
                  )
                }
              </Field>
            </div>
          )}
          <Field label="Type">
            {(id) => (
              <select id={id} className={`${selectClass} w-full`} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'credit' | 'debit' })}>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            )}
          </Field>
          <Field label="Amount (₹)" error={errors.amountPaise} hint="₹1 to ₹1,00,000">
            {(id) => <Input id={id} inputMode="decimal" type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />}
          </Field>
          <Field label="Reason (recorded in the ledger and audit log)" error={errors.label}>
            {(id) => <Input id={id} value={form.label} placeholder="e.g. Goodwill credit for delayed refund" onChange={(e) => setForm({ ...form, label: e.target.value })} maxLength={80} />}
          </Field>
          <Button type="submit" disabled={!canSubmit}>
            Review
          </Button>
        </form>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`${form.type === 'credit' ? 'Credit' : 'Debit'} ${inr(amountPaise || 0)}${customer ? ` ${form.type === 'credit' ? 'to' : 'from'} ${customer.name}` : ''}?`}
          description={`Reason shown in the ledger and audit log: “${form.label.trim()}”. This changes a real balance and cannot be undone (only reversed with another entry).`}
          confirmLabel={form.type === 'credit' ? 'Apply credit' : 'Apply debit'}
          destructive={form.type === 'debit'}
          pending={adjust.isPending}
          onConfirm={() => adjust.mutate({ type: form.type, amountPaise, label: form.label.trim(), requestId, ...(customer && { userId: customer.id }) })}
        />
        {env.staticMode && <p className="mt-3 text-xs text-muted">Demo mode: adjustments apply to the wallet in this browser, which you can see on the customer Wallet page.</p>}
      </Card>

      <Toolbar>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Customer or description" label="Search transactions" />
        <FilterSelect label="Type" value={type} onChange={(v) => { setType(v); setPage(1); }} allLabel="Credits and debits" options={['credit', 'debit'] as const} />
      </Toolbar>
      <DataTable
        rows={d ? rows.slice((page - 1) * 20, page * 20) : undefined}
        loading={query.isPending}
        error={query.isError ? query.error : undefined}
        rowKey={(t) => t.id}
        empty="No wallet transactions yet."
        columns={[
          { key: 'when', header: 'When', cell: (t) => <span className="whitespace-nowrap text-muted">{fmtDateTime(t.createdAt)}</span> },
          { key: 'who', header: 'Customer', cell: (t) => <span className="flex items-center gap-2 font-semibold">{t.userName} {t.source === 'demo' && <DemoBadge />}</span> },
          { key: 'what', header: 'Description', cell: (t) => t.label },
          {
            key: 'amount',
            header: 'Amount',
            align: 'right',
            cell: (t) => <span className={t.type === 'credit' ? 'font-bold text-green-700' : 'font-bold'}>{t.type === 'credit' ? '+' : '−'} {inr(t.amountPaise)}</span>,
          },
        ]}
        footer={d && <Pagination page={page} limit={20} total={rows.length} onPage={setPage} />}
      />
    </div>
  );
}
