import type { AdminBookingDetail, AdminBookingsPage as BookingsPage, BookingStatus, ServiceType } from '@zproo/types';
import { BookingStatus as BookingStatuses } from '@zproo/types';
import { toCsv } from '@zproo/utils';
import { Button, Card, Skeleton } from '@zproo/ui';
import { CalendarCheck, Download, Ban } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useNotifications } from '@/components/feedback/Notifications';
import { Seo } from '@/components/seo/Seo';
import { useAdminGet, useAdminMutation } from '@/features/admin/api';
import { count, downloadFile, fmtDate, fmtDateTime, humanize, inr, SERVICE_LABELS, SERVICE_ORDER, timeAgo } from '@/features/admin/format';
import {
  ConfirmDialog,
  DataTable,
  DateRange,
  DefinitionList,
  DemoBadge,
  Drawer,
  ErrorState,
  Field,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchBox,
  Section,
  StatusBadge,
  TextArea,
  Toggle,
  Toolbar,
  useSearchFilter,
  useUrlFilters,
} from '@/features/admin/ui';
import { errorMessage } from '@/features/auth/errors';
import { hasPermission, useAuthStore } from '@/features/auth/store';
import { apiGet } from '@/services/http';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
] as const;

const DEFAULTS = { search: '', service: '', status: '', from: '', to: '', sort: 'newest', page: '1', ref: '', userId: '' };
const LIMIT = 20;
/** One export never pulls more than this many rows (a huge export is better run as a report). */
const EXPORT_CAP = 5000;

export default function AdminBookingsPage() {
  const [f, set] = useUrlFilters(DEFAULTS);
  const [search, setSearch] = useSearchFilter(f.search, (search) => set({ search }));
  const params = { search: f.search, service: f.service, status: f.status, from: f.from, to: f.to, sort: f.sort, userId: f.userId };
  const query = useAdminGet<BookingsPage>('/bookings', { ...params, page: Number(f.page), limit: LIMIT });
  const data = query.data;
  const [exporting, setExporting] = useState(false);
  const { notify } = useNotifications();

  async function exportCsv() {
    setExporting(true);
    try {
      const rows: BookingsPage['items'] = [];
      let capped = false;
      for (let page = 1; ; page += 1) {
        const res = await apiGet<BookingsPage>('/admin/bookings', { params: { ...cleanParams(params), page, limit: 100 } });
        rows.push(...res.items);
        if (rows.length >= res.total || res.items.length === 0) break;
        if (rows.length >= EXPORT_CAP) {
          capped = true;
          break;
        }
      }
      if (capped) notify(`Exported the first ${count(EXPORT_CAP)} bookings. Narrow the filters or use Reports for the rest.`, 'info');
      downloadFile(
        `zproo-bookings-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(
          ['Reference', 'Created', 'Service', 'Customer', 'Contact', 'Trip', 'Details', 'Travel date', 'Status', 'Payment', 'Amount (₹)'],
          rows.map((b) => [b.reference, b.createdAt, b.serviceType, b.customerName, b.customerContact, b.title, b.subtitle, b.travelDate, b.status, b.paymentStatus, b.totalPaise / 100]),
        ),
      );
    } catch (error) {
      // A failed page must not leave a half-empty file or a silent click.
      notify(`Export failed: ${errorMessage(error)}`, 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Seo title="Bookings · Admin" noIndex />
      <PageHeader
        icon={CalendarCheck}
        title="Bookings"
        description={data ? `${count(data.total)} bookings · ${inr(data.summary.totalPaise)} net paid (after refunds)` : 'Loading…'}
        actions={
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting || !data?.total}>
            <Download aria-hidden /> {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      {data && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick status filter">
          {(['', 'CONFIRMED', 'PENDING_PAYMENT', 'PROCESSING', 'REFUND_PENDING', 'CANCELLED', 'COMPLETED'] as const).map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => set({ status: s })}
              aria-pressed={f.status === s}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${f.status === s ? 'border-foreground bg-foreground text-white' : 'border-border bg-card text-muted hover:text-foreground'}`}
            >
              {s ? humanize(s) : 'All'}
              {s && data.summary.byStatus[s] !== undefined && <span className="ml-1 opacity-70">{count(data.summary.byStatus[s] ?? 0)}</span>}
            </button>
          ))}
        </div>
      )}

      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Reference, customer, email or mobile" label="Search bookings" />
        <FilterSelect<ServiceType>
          label="Service"
          value={f.service as ServiceType | ''}
          onChange={(v) => set({ service: v })}
          allLabel="All services"
          options={SERVICE_ORDER.map((s) => ({ value: s, label: SERVICE_LABELS[s] }))}
        />
        <FilterSelect<BookingStatus>
          label="Status"
          value={f.status as BookingStatus | ''}
          onChange={(v) => set({ status: v })}
          allLabel="All statuses"
          options={Object.values(BookingStatuses)}
        />
        <DateRange from={f.from} to={f.to} onChange={(r) => set(r)} />
        <FilterSelect label="Sort" value={f.sort as (typeof SORTS)[number]['value']} onChange={(v) => set({ sort: v || 'newest' })} options={SORTS} />
      </Toolbar>

      <DataTable
        rows={data?.items}
        loading={query.isPending}
        error={query.isError ? query.error : undefined}
        rowKey={(b) => b.reference}
        onRowClick={(b) => set({ ref: b.reference, page: f.page })}
        rowLabel={(b) => `Open booking ${b.reference}`}
        empty="No bookings match these filters."
        minWidth={900}
        columns={[
          {
            key: 'ref',
            header: 'Reference',
            cell: (b) => (
              <span className="flex flex-col">
                <span className="font-mono text-xs">{b.reference}</span>
                <span className="text-[11px] font-normal text-muted">{timeAgo(b.createdAt)}</span>
              </span>
            ),
          },
          {
            key: 'trip',
            header: 'Trip',
            cell: (b) => (
              <div className="max-w-72">
                <div className="flex items-center gap-2 truncate font-semibold">
                  {b.title} {b.source === 'demo' && <DemoBadge />}
                </div>
                <div className="truncate text-xs text-muted">
                  {SERVICE_LABELS[b.serviceType]} · {b.subtitle}
                </div>
              </div>
            ),
          },
          {
            key: 'customer',
            header: 'Customer',
            cell: (b) => (
              <div>
                <div className="font-semibold">{b.customerName}</div>
                <div className="text-xs text-muted">{b.customerContact}</div>
              </div>
            ),
          },
          { key: 'travel', header: 'Travel', cell: (b) => <span className="whitespace-nowrap text-muted">{fmtDate(b.travelDate)}</span> },
          {
            key: 'status',
            header: 'Status',
            cell: (b) => (
              <div className="flex flex-col items-start gap-1">
                <StatusBadge status={b.status} />
                <span className="text-[11px] text-muted">{humanize(b.paymentStatus)}</span>
              </div>
            ),
          },
          { key: 'amount', header: 'Amount', align: 'right', cell: (b) => <span className="font-bold">{inr(b.totalPaise)}</span> },
        ]}
        footer={data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={(p) => set({ page: String(p) })} />}
      />

      <BookingDrawer reference={f.ref || null} onClose={() => set({ ref: '', page: f.page })} />
    </div>
  );
}

const cleanParams = (p: Record<string, string>) => Object.fromEntries(Object.entries(p).filter(([, v]) => v));

export function BookingDrawer({ reference, onClose }: { reference: string | null; onClose: () => void }) {
  const query = useAdminGet<AdminBookingDetail>(`/bookings/${encodeURIComponent(reference ?? '')}`, undefined, { enabled: Boolean(reference) });
  const b = query.data?.reference === reference ? query.data : undefined;
  const user = useAuthStore((s) => s.user);
  const canRefund = hasPermission(user, 'refund:approve');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  // Staff without refund approval cannot raise a refund, so for them the choice starts (and stays) off.
  const [refund, setRefund] = useState(canRefund);
  const [manual, setManual] = useState<{ id: string; reference: string; note: string } | null>(null);
  const resetDialogs = () => {
    setCancelOpen(false);
    setReason('');
    setRefund(canRefund);
    setManual(null);
  };
  // Nothing typed for one booking may carry over to the next one.
  useEffect(resetDialogs, [reference, canRefund]); // eslint-disable-line react-hooks/exhaustive-deps
  const cancel = useAdminMutation<{ reason: string; refund: boolean }, AdminBookingDetail>('post', () => `/bookings/${encodeURIComponent(reference ?? '')}/cancel`, {
    success: 'Booking cancelled',
    onSuccess: resetDialogs,
  });
  const refundAction = useAdminMutation<{ id: string; status: string; note?: string; settlementReference?: string }>('patch', (v) => `/refunds/${encodeURIComponent(v.id)}`, {
    success: 'Refund updated',
    onSuccess: () => setManual(null),
  });
  const canCancel = b && hasPermission(user, 'booking:manage') && ['PENDING_PAYMENT', 'PROCESSING', 'CONFIRMED', 'INITIATED'].includes(b.status);
  const refundable = b ? Math.max(0, b.totalPaise - b.refunds.filter((r) => r.status !== 'FAILED').reduce((s, r) => s + r.amountPaise, 0)) : 0;
  const isPaid = b ? ['SUCCESS', 'PARTIALLY_REFUNDED'].includes(b.paymentStatus) : false;

  return (
    <Drawer
      open={Boolean(reference)}
      onOpenChange={(open) => !open && onClose()}
      title={
        <span className="flex items-center gap-2">
          <span className="font-mono">{reference}</span>
          {b?.source === 'demo' && <DemoBadge />}
        </span>
      }
      description={b ? `${SERVICE_LABELS[b.serviceType]} · booked ${fmtDateTime(b.createdAt)}` : undefined}
      footer={
        b && (
          <>
            {b.userId && hasPermission(user, 'user:read:any') && (
              <Button asChild variant="outline">
                <Link to={`/admin/users?user=${b.userId}`}>View customer</Link>
              </Button>
            )}
            {canCancel && (
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                <Ban aria-hidden /> Cancel booking
              </Button>
            )}
          </>
        )
      }
    >
      {query.isError && <ErrorState error={query.error} />}
      {!b && !query.isError && <Skeleton className="h-64" />}
      {b && (
        <>
          <Card className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="truncate font-bold">{b.title}</div>
              <div className="truncate text-sm text-muted">{b.subtitle}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-extrabold">{inr(b.totalPaise)}</div>
              <StatusBadge status={b.status} />
            </div>
          </Card>
          <DefinitionList
            items={[
              ['Customer', b.customerName],
              ['Contact', b.customerContact || '—'],
              ['Travel date', fmtDate(b.travelDate)],
              ['Payment', humanize(b.paymentStatus)],
            ]}
          />
          <Section title="Travellers">
            <ul className="divide-y divide-border rounded-xl border border-border text-sm">
              {b.passengers.map((p, i) => (
                <li key={i} className="flex justify-between gap-3 px-4 py-2.5">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-right text-muted">{p.detail}</span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Fare">
            <ul className="space-y-1.5 text-sm">
              {b.priceLines.map((l) => (
                <li key={l.label} className="flex justify-between">
                  <span className="text-muted">{l.label}</span>
                  <span className="tabular-nums">{l.paise < 0 ? `− ${inr(-l.paise)}` : inr(l.paise)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-border pt-2 font-bold">
                <span>Total</span>
                <span className="tabular-nums">{inr(b.totalPaise)}</span>
              </li>
            </ul>
          </Section>
          <Section title="Payments">
            {b.payments.length === 0 ? (
              <p className="text-sm text-muted">No online payment (pay later / at pickup).</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5">
                    <div>
                      <div className="font-semibold">
                        {p.method} · {inr(p.amountPaise)}
                      </div>
                      <div className="font-mono text-[11px] text-muted">{p.id}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
          {b.refunds.length > 0 && (
            <Section title="Refunds">
              <ul className="space-y-2 text-sm">
                {b.refunds.map((r) => (
                  <li key={r.id} className="space-y-2 rounded-xl border border-border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{inr(r.amountPaise)}</div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-muted">{r.reason}</div>
                    {canRefund && (r.status === 'REQUESTED' || r.status === 'PROCESSING' || r.status === 'FAILED') && (
                      <div className="flex flex-wrap gap-2">
                        {r.status !== 'PROCESSING' && (
                          <Button size="sm" variant="outline" disabled={refundAction.isPending} onClick={() => refundAction.mutate({ id: r.id, status: 'PROCESSING' })}>
                            Mark processing
                          </Button>
                        )}
                        {r.status !== 'FAILED' && (
                          <Button size="sm" disabled={refundAction.isPending} onClick={() => setManual({ id: r.id, reference: '', note: '' })}>
                            Mark refunded
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section title="Timeline">
            <ol className="relative space-y-3 border-l border-border pl-5 text-sm">
              {b.timeline.map((t, i) => (
                <li key={i}>
                  <span aria-hidden className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-primary" />
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-xs text-muted">{fmtDateTime(t.at)}</div>
                </li>
              ))}
            </ol>
          </Section>
          {b.notes.length > 0 && (
            <Section title="Notes">
              <ul className="list-inside list-disc text-sm text-muted">
                {b.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
      <ConfirmDialog
        open={manual !== null}
        onOpenChange={(open) => !open && setManual(null)}
        title="Mark this refund as paid?"
        description="Use this only when the money was already returned outside the payment gateway (for example a bank transfer). Enter the bank or gateway reference as proof."
        confirmLabel="Mark refunded"
        pending={refundAction.isPending}
        onConfirm={() => {
          if (!manual || manual.reference.trim().length < 4) return;
          refundAction.mutate({ id: manual.id, status: 'COMPLETED', settlementReference: manual.reference.trim(), ...(manual.note.trim() && { note: manual.note.trim() }) });
        }}
      >
        <Field label="Bank or gateway reference" hint="At least 4 characters, e.g. the UTR number.">
          {(id) => <TextArea id={id} value={manual?.reference ?? ''} onChange={(e) => setManual((m) => m && { ...m, reference: e.target.value })} maxLength={100} rows={1} />}
        </Field>
        <Field label="Note (optional)">
          {(id) => <TextArea id={id} value={manual?.note ?? ''} onChange={(e) => setManual((m) => m && { ...m, note: e.target.value })} maxLength={300} />}
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(open) => (open ? setCancelOpen(true) : resetDialogs())}
        title={`Cancel ${reference}?`}
        description="The customer is told their booking is cancelled. This cannot be undone."
        confirmLabel="Cancel booking"
        destructive
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate({ reason: reason.trim() || 'Cancelled by support', refund: canRefund && isPaid && refund })}
      >
        <Field label="Reason" hint="Shown in the audit log and the refund.">
          {(id) => <TextArea id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Operator cancelled the service" maxLength={300} />}
        </Field>
        {b && isPaid && canRefund && refundable > 0 && (
          <Toggle checked={refund} onChange={setRefund} label={`Refund ${inr(refundable)}`} description="Raises a refund request for the finance team to process." />
        )}
        {b && isPaid && !canRefund && (
          <p className="text-sm text-muted">You can cancel this paid booking, but raising its refund needs refund approval permission. Ask someone with that permission to refund it.</p>
        )}
        {b && isPaid && canRefund && !refund && (
          <p className="text-sm text-danger">The customer has paid. Cancelling without a refund is recorded as a “no refund” decision with your reason.</p>
        )}
      </ConfirmDialog>
    </Drawer>
  );
}
