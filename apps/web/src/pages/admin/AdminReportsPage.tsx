import type { AdminReport, ReportType } from '@zproo/types';
import { toCsv } from '@zproo/utils';
import { Button, Card, cn } from '@zproo/ui';
import { Download, FileChartColumn } from 'lucide-react';
import { useState } from 'react';
import { Seo } from '@/components/seo/Seo';
import { useAdminGet } from '@/features/admin/api';
import { count, daysAgo, downloadFile, humanize, isoDay } from '@/features/admin/format';
import { DataTable, DateRange, ErrorState, PageHeader, Segmented } from '@/features/admin/ui';

const TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'revenue', label: 'Revenue', description: 'Gross, refunds and net per day' },
  { value: 'services', label: 'By service', description: 'Bookings, cancellations and revenue per service' },
  { value: 'bookings', label: 'Bookings', description: 'Every booking with its status and amount' },
  { value: 'payments', label: 'Payments', description: 'Gateway payments and failures' },
  { value: 'refunds', label: 'Refunds', description: 'Refunds raised, with their status' },
  { value: 'users', label: 'Sign-ups', description: 'New accounts in the period' },
];

const PRESETS = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
  { value: 'month', label: 'This month' },
] as const;

export default function AdminReportsPage() {
  const [type, setType] = useState<ReportType>('revenue');
  const [range, setRange] = useState({ from: daysAgo(29), to: isoDay(new Date()) });
  const [preset, setPreset] = useState<string>('30');
  const query = useAdminGet<AdminReport>('/reports', { type, ...range }, { enabled: Boolean(range.from && range.to) });
  const r = query.data;

  const applyPreset = (p: string) => {
    setPreset(p);
    const today = new Date();
    if (p === 'month') setRange({ from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDay(today) });
    else setRange({ from: daysAgo(Number(p) - 1), to: isoDay(today) });
  };

  return (
    <div className="space-y-6">
      <Seo title="Reports · Admin" noIndex />
      <PageHeader
        icon={FileChartColumn}
        title="Reports"
        description="Pick a report and a period, preview it, and download it as CSV for Excel or Sheets."
        actions={
          <Button disabled={!r?.rows.length} onClick={() => r && downloadFile(`zproo-${r.type}-${r.from}-to-${r.to}.csv`, toCsv(r.columns, r.rows))}>
            <Download aria-hidden /> Download CSV
          </Button>
        }
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={type === t.value}
            onClick={() => setType(t.value)}
            className={cn(
              'rounded-card border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              type === t.value ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/30',
            )}
          >
            <div className="font-bold">{t.label}</div>
            <div className="text-sm text-muted">{t.description}</div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Quick range" value={preset} onChange={applyPreset} options={PRESETS} />
        <DateRange
          from={range.from}
          to={range.to}
          onChange={(v) => {
            setPreset('');
            setRange(v);
          }}
        />
      </div>
      {query.isError && <ErrorState error={query.error} />}
      {r && Object.keys(r.totals).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(r.totals).map(([k, v]) => (
            <Card key={k} className="px-4 py-3">
              <div className="text-xs font-semibold text-muted">{humanize(k)}</div>
              <div className="text-lg font-extrabold tabular-nums">
                {['amount', 'gross', 'refunds', 'net', 'captured', 'completed'].includes(k) ? `₹${v.toLocaleString('en-IN')}` : count(v)}
              </div>
            </Card>
          ))}
        </div>
      )}
      <DataTable<(string | number)[]>
        rows={r ? r.rows.slice(0, 200) : undefined}
        loading={query.isPending}
        rowKey={(row) => row.join('|')}
        empty="No data in this period."
        minWidth={Math.max(640, (r?.columns.length ?? 5) * 130)}
        columns={(r?.columns ?? []).map((c, i) => ({
          key: c,
          header: c,
          align: typeof r?.rows[0]?.[i] === 'number' ? ('right' as const) : undefined,
          cell: (row) => {
            const v = row[i];
            return typeof v === 'number' ? v.toLocaleString('en-IN') : <span className={i === 0 ? 'font-semibold' : 'text-muted'}>{v}</span>;
          },
        }))}
        footer={r && r.rows.length > 200 && <p className="border-t border-border px-4 py-3 text-sm text-muted">Showing the first 200 of {count(r.rows.length)} rows. Download the CSV for all of them.</p>}
      />
    </div>
  );
}
