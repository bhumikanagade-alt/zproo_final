import type { AdminDashboard } from '@zproo/types';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@zproo/ui';
import { ChartColumn } from 'lucide-react';
import { useState } from 'react';
import { Seo } from '@/components/seo/Seo';
import { useAdminGet } from '@/features/admin/api';
import { BarList, ColumnChart, LineChart } from '@/features/admin/charts';
import { count, fmtShortDate, RANGES, humanize, inr, inrCompact, SERVICE_COLORS, SERVICE_LABELS } from '@/features/admin/format';
import { ErrorState, PageHeader, Segmented, StatCard } from '@/features/admin/ui';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<number>(90);
  const query = useAdminGet<AdminDashboard>('/dashboard', { days });
  const d = query.data;
  const totalBookings = d?.byService.reduce((s, x) => s + x.bookings, 0) ?? 0;
  const cancelled = d?.series.reduce((s, p) => s + p.cancelled, 0) ?? 0;

  return (
    <div className="space-y-6">
      <Seo title="Analytics · Admin" noIndex />
      <PageHeader
        icon={ChartColumn}
        title="Analytics"
        description="Trends across services, routes and payment methods."
        actions={<Segmented label="Period" value={days} onChange={setDays} options={RANGES} />}
      />
      {query.isError && <ErrorState error={query.error} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Net revenue" loading={!d} value={d && inr(d.kpis.revenuePaise)} change={d?.kpis.revenueChangePct} />
        <StatCard label="Bookings" loading={!d} value={d && count(d.kpis.bookings)} change={d?.kpis.bookingsChangePct} />
        <StatCard label="Cancellations" loading={!d} value={d && count(cancelled)} hint={d && `${d.kpis.cancellationRatePct}% of bookings`} />
        <StatCard label="Avg per day" loading={!d} value={d && inr(d.kpis.revenuePaise / days)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Net revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {d ? <LineChart title="Net revenue per day" points={d.series.map((p) => ({ label: p.date, value: p.revenuePaise }))} format={inrCompact} formatLabel={fmtShortDate} /> : <Skeleton className="h-60" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings per day</CardTitle>
          </CardHeader>
          <CardContent>
            {d ? (
              <ColumnChart title="Bookings per day" height={220} points={d.series.map((p) => ({ label: p.date, value: p.bookings }))} format={(v) => `${count(v)} bookings`} formatLabel={fmtShortDate} />
            ) : (
              <Skeleton className="h-56" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share of bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {d ? (
              <BarList
                items={d.byService.map((s) => ({
                  key: s.service,
                  label: SERVICE_LABELS[s.service],
                  value: s.bookings,
                  display: `${totalBookings ? Math.round((s.bookings / totalBookings) * 100) : 0}%`,
                  hint: `${count(s.bookings)}`,
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
            <CardTitle className="text-base">Average order by service</CardTitle>
          </CardHeader>
          <CardContent>
            {d ? (
              <BarList
                items={d.byService
                  .map((s) => ({ s, avg: s.bookings ? s.revenuePaise / s.bookings : 0 }))
                  .sort((a, b) => b.avg - a.avg)
                  .map(({ s, avg }) => ({ key: s.service, label: SERVICE_LABELS[s.service], value: avg, display: inr(avg), color: SERVICE_COLORS[s.service] }))}
              />
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking status</CardTitle>
          </CardHeader>
          <CardContent>
            {d ? <BarList items={d.byStatus.map((s) => ({ key: s.status, label: humanize(s.status), value: s.count, display: count(s.count), color: '#6b7280' }))} /> : <Skeleton className="h-48" />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top routes & properties</CardTitle>
          </CardHeader>
          <CardContent>
            {d ? (
              <BarList
                items={d.topRoutes.map((r) => ({
                  key: `${r.service}-${r.label}`,
                  label: `${r.label} · ${SERVICE_LABELS[r.service]}`,
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment methods</CardTitle>
          </CardHeader>
          <CardContent>
            {d ? (
              <BarList items={d.paymentMethods.map((m) => ({ key: m.method, label: m.method, value: m.amountPaise, display: inr(m.amountPaise), hint: `${count(m.count)} payments` }))} />
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
