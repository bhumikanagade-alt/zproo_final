import { PaymentStatus, type AdminPaymentsPage as PaymentsPage, type ServiceType } from '@zproo/types';
import { CircleCheck, CreditCard, IndianRupee, TriangleAlert, Undo2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { useAdminGet } from '@/features/admin/api';
import { count, fmtDateTime, inr, SERVICE_LABELS, SERVICE_ORDER } from '@/features/admin/format';
import {
  DataTable,
  DateRange,
  DemoBadge,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchBox,
  StatCard,
  StatusBadge,
  Toolbar,
  useSearchFilter,
  useUrlFilters,
} from '@/features/admin/ui';

const DEFAULTS = { search: '', status: '', service: '', from: '', to: '', sort: 'newest', page: '1' };

export default function AdminPaymentsPage() {
  const [f, set] = useUrlFilters(DEFAULTS);
  const [search, setSearch] = useSearchFilter(f.search, (v) => set({ search: v }));
  const navigate = useNavigate();
  const query = useAdminGet<PaymentsPage>('/payments', { ...f, page: Number(f.page), limit: 20 });
  const d = query.data;

  return (
    <div className="space-y-6">
      <Seo title="Payments · Admin" noIndex />
      <PageHeader icon={CreditCard} title="Payments" description="Every gateway payment attempt across services." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Captured" icon={IndianRupee} loading={!d} value={d && inr(d.summary.capturedPaise)} hint={f.from || f.to ? 'in range' : 'all time'} />
        <StatCard label="Success rate" icon={CircleCheck} loading={!d} value={d && `${d.summary.successRatePct}%`} />
        <StatCard label="Failed attempts" icon={TriangleAlert} loading={!d} value={d && count(d.summary.failedCount)} />
        <StatCard label="Refunded" icon={Undo2} loading={!d} value={d && inr(d.summary.refundedPaise)} />
      </div>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Payment ID, booking, customer or method" label="Search payments" />
        <FilterSelect label="Status" value={f.status as PaymentStatus | ''} onChange={(v) => set({ status: v })} allLabel="All statuses" options={Object.values(PaymentStatus)} />
        <FilterSelect<ServiceType> label="Service" value={f.service as ServiceType | ''} onChange={(v) => set({ service: v })} allLabel="All services" options={SERVICE_ORDER.map((s) => ({ value: s, label: SERVICE_LABELS[s] }))} />
        <DateRange from={f.from} to={f.to} onChange={(r) => set(r)} />
      </Toolbar>
      <DataTable
        rows={d?.items}
        loading={query.isPending}
        error={query.isError ? query.error : undefined}
        rowKey={(p) => p.id}
        onRowClick={(p) => void navigate(`/admin/bookings?ref=${p.bookingReference}`)}
        rowLabel={(p) => `Open booking ${p.bookingReference}`}
        empty="No payments match these filters."
        columns={[
          {
            key: 'id',
            header: 'Payment',
            cell: (p) => (
              <span className="flex flex-col">
                <span className="font-mono text-xs">{p.id}</span>
                <span className="text-[11px] font-normal text-muted">{fmtDateTime(p.createdAt)}</span>
              </span>
            ),
          },
          {
            key: 'booking',
            header: 'Booking',
            cell: (p) => (
              <div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  {p.bookingReference} {p.source === 'demo' && <DemoBadge />}
                </div>
                <div className="text-xs text-muted">{SERVICE_LABELS[p.serviceType]} · {p.customerName}</div>
              </div>
            ),
          },
          { key: 'method', header: 'Method', cell: (p) => p.method },
          { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
          { key: 'amount', header: 'Amount', align: 'right', cell: (p) => <span className="font-bold">{inr(p.amountPaise)}</span> },
        ]}
        footer={d && <Pagination page={d.page} limit={d.limit} total={d.total} onPage={(p) => set({ page: String(p) })} />}
      />
    </div>
  );
}
