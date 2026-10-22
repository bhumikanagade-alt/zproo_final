import type { AdminDashboard } from '@zproo/types';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@zproo/ui';
import { ArrowRight, CalendarCheck, IndianRupee, LifeBuoy, ReceiptText, Undo2, UserPlus, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { useAdminGet } from '@/features/admin/api';
import { BarList, ColumnChart, LineChart } from '@/features/admin/charts';
import { count, fmtShortDate, RANGES, humanize, inr, inrCompact, SERVICE_COLORS, SERVICE_LABELS, timeAgo } from '@/features/admin/format';
import { DataTable, DemoBadge, ErrorState, PageHeader, Segmented, StatCard, StatusBadge } from '@/features/admin/ui';
import { hasPermission, useAuthStore } from '@/features/auth/store';


export default function AdminDashboardPage() {
  const [days, setDays] = useState<number>(30);
  const query = useAdminGet<AdminDashboard>('/dashboard', { days });
  const d = query.data;
  const hidden = d?.revenueHidden === true;
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const loading = query.isPending;
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  return (
    <div className="space-y-6">
      <Seo title="Dashboard · Admin" noIndex />
      <PageHeader
        title={`${greeting}, ${user?.fullName ?? 'there'}`}
        description={
          <>
            Here is how ZPROO GO is doing over the last {days === 365 ? 'year' : `${days} days`}.
            {d?.includesDemoData && <span className="ml-1">Includes generated sample data.</span>}
          </>
        }
        actions={<Segmented label="Period" value={days} onChange={setDays} options={RANGES} />}
      />
      {query.isError && <ErrorState error={query.error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Net revenue" icon={IndianRupee} loading={loading} value={d && (hidden ? '—' : inr(d.kpis.revenuePaise))} change={hidden ? null : d?.kpis.revenueChangePct} hint={hidden ? 'finance access needed' : 'after refunds'} />
        <StatCard label="Bookings" icon={CalendarCheck} loading={loading} value={d && count(d.kpis.bookings)} change={d?.kpis.bookingsChangePct} />
        <StatCard label="Average order" icon={ReceiptText} loading={loading} value={d && (hidden ? '—' : inr(d.kpis.avgOrderPaise))} />
        <StatCard
          label="New customers"
          icon={UserPlus}
          loading={loading}
          value={d && count(d.kpis.newUsers)}
          hint={d && `${count(d.kpis.totalUsers)} total`}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Net cash flow per day</CardTitle>
          </CardHeader>
          <CardContent>
            {d && hidden ? (
              <p className="py-10 text-center text-sm text-muted">Revenue figures are shown to staff with finance access.</p>
            ) : d ? (
              <LineChart
                title="Net cash flow per day (sales minus refunds paid out that day)"
                points={d.series.map((p) => ({ label: p.date, value: p.revenuePaise }))}
                format={inrCompact}
                formatLabel={fmtShortDate}
              />
            ) : (
              <Skeleton className="h-60" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Attention
              icon={Undo2}
              label="Refunds waiting"
              value={d ? (hidden ? count(d.kpis.pendingRefunds) : `${count(d.kpis.pendingRefunds)} · ${inr(d.kpis.pendingRefundsPaise)}`) : '…'}
              to="/admin/refunds?status=REQUESTED"
              show={hasPermission(user, 'payment:read:any')}
            />
            <Attention
              icon={LifeBuoy}
              label="Open support tickets"
              value={d ? count(d.kpis.openTickets) : '…'}
              to="/admin/support"
              show={hasPermission(user, 'support:ticket:manage')}
            />
            <Attention
              icon={XCircle}
              label="Cancellation rate"
              value={d ? `${d.kpis.cancellationRatePct}%` : '…'}
              to="/admin/bookings?status=CANCELLED"
              show
            />
            <div className="pt-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Bookings per day</p>
              {d ? (
                <ColumnChart
                  title="Bookings per day"
                  height={96}
                  points={d.series.map((p) => ({ label: p.date, value: p.bookings }))}
                  format={(v) => `${count(v)} bookings`}
                  formatLabel={fmtShortDate}
                />
              ) : (
                <Skeleton className="h-24" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by service</CardTitle>
          </CardHeader>
          <CardContent>
            {d && hidden ? (
              <p className="py-10 text-center text-sm text-muted">Revenue figures are shown to staff with finance access.</p>
            ) : d ? (
              <BarList
                items={d.byService.map((s) => ({
                  key: s.service,
                  label: SERVICE_LABELS[s.service],
                  value: s.revenuePaise,
                  display: inr(s.revenuePaise),
                  hint: `${count(s.bookings)} bookings`,
                  color: SERVICE_COLORS[s.service],
                }))}
              />
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top routes & properties</CardTitle>
          </CardHeader>
          <CardContent>
            {d && hidden ? (
              <p className="py-10 text-center text-sm text-muted">Revenue figures are shown to staff with finance access.</p>
            ) : d ? (
              <BarList
                items={d.topRoutes.map((r) => ({
                  key: `${r.service}-${r.label}`,
                  label: (
                    <>
                      {r.label} <span className="font-normal text-muted">· {SERVICE_LABELS[r.service]}</span>
                    </>
                  ),
                  value: r.revenuePaise,
                  display: inr(r.revenuePaise),
                  hint: `${count(r.bookings)} bookings`,
                  color: SERVICE_COLORS[r.service],
                }))}
              />
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight">Latest bookings</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/bookings">
              All bookings <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <DataTable
          rows={d?.recentBookings}
          loading={loading}
          rowKey={(b) => b.reference}
          onRowClick={(b) => void navigate(`/admin/bookings?ref=${b.reference}`)}
          rowLabel={(b) => `Open booking ${b.reference}`}
          columns={[
            { key: 'ref', header: 'Reference', cell: (b) => <span className="font-mono text-xs">{b.reference}</span> },
            {
              key: 'trip',
              header: 'Trip',
              cell: (b) => (
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold">
                    {b.title} {b.source === 'demo' && <DemoBadge />}
                  </div>
                  <div className="text-xs text-muted">{SERVICE_LABELS[b.serviceType]} · {b.customerName}</div>
                </div>
              ),
            },
            { key: 'when', header: 'Booked', cell: (b) => <span className="text-muted">{timeAgo(b.createdAt)}</span> },
            { key: 'status', header: 'Status', cell: (b) => <StatusBadge status={b.status} /> },
            { key: 'amount', header: 'Amount', align: 'right', cell: (b) => <span className="font-bold">{inr(b.totalPaise)}</span> },
          ]}
        />
      </section>

      {d && d.paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment methods &amp; booking status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 sm:grid-cols-2">
            <BarList
              items={d.paymentMethods.map((m) => ({ key: m.method, label: m.method, value: m.amountPaise, display: inr(m.amountPaise), hint: `${count(m.count)} payments` }))}
            />
            <BarList
              className="mt-3 sm:mt-0"
              items={d.byStatus.map((s) => ({ key: s.status, label: humanize(s.status), value: s.count, display: count(s.count), color: '#6b7280' }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Attention({
  icon: Icon,
  label,
  value,
  to,
  show,
}: {
  icon: typeof Undo2;
  label: string;
  value: string;
  to: string;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-background">
      <span className="grid size-9 place-items-center rounded-lg bg-primary-light text-primary">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </Link>
  );
}
