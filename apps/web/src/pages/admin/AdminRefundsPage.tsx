import type { AdminRefundRow, AdminRefundsPage as RefundsPage } from '@zproo/types';
import { Button } from '@zproo/ui';
import { CircleCheck, Clock, TriangleAlert, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { useAdminGet, useAdminMutation } from '@/features/admin/api';
import { count, fmtDate, fmtDateTime, inr, SERVICE_LABELS } from '@/features/admin/format';
import {
  ConfirmDialog,
  DataTable,
  DateRange,
  DemoBadge,
  Field,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchBox,
  StatCard,
  StatusBadge,
  TextArea,
  Toolbar,
  useSearchFilter,
  useUrlFilters,
} from '@/features/admin/ui';
import { hasPermission, useAuthStore } from '@/features/auth/store';

const DEFAULTS = { search: '', status: '', from: '', to: '', sort: 'newest', page: '1' };
type Target = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export default function AdminRefundsPage() {
  const [f, set] = useUrlFilters(DEFAULTS);
  const [search, setSearch] = useSearchFilter(f.search, (v) => set({ search: v }));
  const query = useAdminGet<RefundsPage>('/refunds', { ...f, page: Number(f.page), limit: 20 });
  const d = query.data;
  const user = useAuthStore((s) => s.user);
  const canApprove = hasPermission(user, 'refund:approve');
  const [action, setAction] = useState<{ refund: AdminRefundRow; status: Target } | null>(null);
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const close = () => {
    setAction(null);
    setNote('');
    setReference('');
  };
  const update = useAdminMutation<{ status: Target; note?: string; settlementReference?: string }>('patch', () => `/refunds/${encodeURIComponent(action?.refund.id ?? '')}`, {
    success: 'Refund updated',
    onSuccess: close,
  });
  const needsReference = action?.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      <Seo title="Refunds · Admin" noIndex />
      <PageHeader icon={Undo2} title="Refunds" description="Approve, track and close refunds raised by cancellations." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Waiting" icon={Clock} loading={!d} value={d && count(d.summary.pendingCount)} hint={d && inr(d.summary.pendingPaise)} />
        <StatCard label="Refunded" icon={CircleCheck} loading={!d} value={d && inr(d.summary.completedPaise)} />
        <StatCard label="Failed" icon={TriangleAlert} loading={!d} value={d && count(d.summary.failedCount)} hint="retry from the list" />
        <StatCard label="Showing" loading={!d} value={d && count(d.total)} hint="matching refunds" />
      </div>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Refund ID, booking, customer or reason" label="Search refunds" />
        <FilterSelect label="Status" value={f.status as Target | 'REQUESTED' | ''} onChange={(v) => set({ status: v })} allLabel="All statuses" options={['REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED'] as const} />
        <DateRange from={f.from} to={f.to} onChange={(r) => set(r)} />
      </Toolbar>
      <DataTable
        rows={d?.items}
        loading={query.isPending}
        error={query.isError ? query.error : undefined}
        rowKey={(r) => r.id}
        empty="No refunds match these filters."
        minWidth={940}
        columns={[
          {
            key: 'booking',
            header: 'Booking',
            cell: (r) => (
              <div>
                <Link to={`/admin/bookings?ref=${r.bookingReference}`} className="flex items-center gap-2 font-mono text-xs font-semibold hover:underline">
                  {r.bookingReference} {r.source === 'demo' && <DemoBadge />}
                </Link>
                <div className="text-xs text-muted">{SERVICE_LABELS[r.serviceType]} · {r.customerName}</div>
              </div>
            ),
          },
          { key: 'reason', header: 'Reason', cell: (r) => <span className="line-clamp-2 max-w-64 text-muted">{r.reason}</span> },
          {
            key: 'dates',
            header: 'Requested',
            cell: (r) => (
              <div className="whitespace-nowrap text-xs">
                <div>{fmtDateTime(r.createdAt)}</div>
                {r.completedAt && <div className="text-muted">Done {fmtDate(r.completedAt)}</div>}
              </div>
            ),
          },
          { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <span className="font-bold">{inr(r.amountPaise)}</span> },
          {
            key: 'actions',
            header: '',
            align: 'right',
            cell: (r) =>
              canApprove && r.status !== 'COMPLETED' ? (
                <div className="flex justify-end gap-1.5">
                  {r.status === 'REQUESTED' && (
                    <Button size="sm" variant="outline" onClick={() => setAction({ refund: r, status: 'PROCESSING' })}>
                      Approve
                    </Button>
                  )}
                  {r.status === 'FAILED' ? (
                    <Button size="sm" variant="outline" onClick={() => setAction({ refund: r, status: 'PROCESSING' })}>
                      Retry
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setAction({ refund: r, status: 'COMPLETED' })}>
                      Mark refunded
                    </Button>
                  )}
                </div>
              ) : null,
          },
        ]}
        footer={d && <Pagination page={d.page} limit={d.limit} total={d.total} onPage={(p) => set({ page: String(p) })} />}
      />
      <ConfirmDialog
        open={action !== null}
        onOpenChange={(o) => !o && close()}
        title={
          action?.status === 'COMPLETED'
            ? `Mark ${inr(action.refund.amountPaise)} as refunded?`
            : action?.status === 'FAILED'
              ? 'Mark refund as failed?'
              : `Approve ${action ? inr(action.refund.amountPaise) : ''} refund?`
        }
        description={
          action?.status === 'COMPLETED'
            ? 'Use this only when the money was returned outside the payment gateway (for example a bank transfer). Enter the reference as proof. The booking moves to Refunded.'
            : action?.status === 'FAILED'
              ? 'The refund is parked as failed and is not retried automatically until someone approves a retry.'
              : 'The refund is sent to the payment gateway and shows as processing.'
        }
        confirmLabel={action?.status === 'COMPLETED' ? 'Mark refunded' : action?.status === 'FAILED' ? 'Mark failed' : 'Approve'}
        destructive={action?.status === 'FAILED'}
        pending={update.isPending}
        onConfirm={() => {
          if (!action) return;
          if (needsReference && reference.trim().length < 4) return;
          update.mutate({ status: action.status, ...(note.trim() && { note: note.trim() }), ...(needsReference && { settlementReference: reference.trim() }) });
        }}
      >
        {needsReference && (
          <Field label="Bank or gateway reference" hint="Required, at least 4 characters, e.g. the UTR number.">
            {(id) => <TextArea id={id} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} rows={1} className="min-h-10" />}
          </Field>
        )}
        <Field label="Note (optional)" hint="Saved to the audit log, e.g. the gateway refund ID.">
          {(id) => <TextArea id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="min-h-16" />}
        </Field>
        {action?.status === 'COMPLETED' && (
          <button type="button" className="text-xs font-bold text-danger hover:underline" onClick={() => { setReference(''); setAction({ ...action, status: 'FAILED' }); }}>
            The gateway rejected it — mark as failed instead
          </button>
        )}
      </ConfirmDialog>
    </div>
  );
}
