import type { AdminInventoryPage as InventoryPage, ServiceType } from '@zproo/types';
import { Star } from 'lucide-react';
import { useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { ADMIN_NAV } from '@/config/navigation';
import { useAdminGet, useAdminMutation } from '@/features/admin/api';
import { count, inr } from '@/features/admin/format';
import {
  DataTable,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchBox,
  StatCard,
  Toggle,
  Toolbar,
  useSearchFilter,
  useUrlFilters,
} from '@/features/admin/ui';
import { NotFoundPage } from '@/pages/NotFoundPage';

const DEFAULTS = { search: '', listed: '', page: '1' };

/** Catalogue of one service (flights, buses, …): browse it and hide items from the website. */
export default function AdminInventoryPage() {
  const { section = '' } = useParams();
  const item = ADMIN_NAV.find((n) => n.segment === section && n.service);
  if (!item?.service) return <NotFoundPage />;
  return <Inventory key={item.service} service={item.service} label={item.label} icon={item.icon} />;
}

function Inventory({ service, label, icon }: { service: ServiceType; label: string; icon: (typeof ADMIN_NAV)[number]['icon'] }) {
  const [f, set] = useUrlFilters(DEFAULTS);
  const [search, setSearch] = useSearchFilter(f.search, (v) => set({ search: v }));
  const path = `/inventory/${service.toLowerCase()}`;
  const query = useAdminGet<InventoryPage>(path, { search: f.search, listed: f.listed, page: Number(f.page), limit: 25 });
  const d = query.data;
  const toggle = useAdminMutation<{ id: string; listed: boolean }, { name: string; listed: boolean }>('patch', (v) => `${path}/${encodeURIComponent(v.id)}`, {
    success: (r) => (r.listed ? `${r.name} is listed on the website` : `${r.name} is hidden from the website`),
  });

  return (
    <div className="space-y-6">
      <Seo title={`${label} · Admin`} noIndex />
      <PageHeader icon={icon} title={label} description="The catalogue customers can search and book. Hide an item to stop selling it." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Listed" loading={!d} value={d && count(d.stats.listed)} />
        <StatCard label="Hidden" loading={!d} value={d && count(d.stats.unlisted)} />
        <StatCard label="Bookings" loading={!d} value={d && count(d.stats.bookings)} hint="all time" />
        <StatCard label="Revenue" loading={!d} value={d && inr(d.stats.revenuePaise)} hint="all time" />
      </div>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder={`Search ${label.toLowerCase()}`} label={`Search ${label}`} />
        <FilterSelect
          label="Visibility"
          value={f.listed as 'true' | 'false' | ''}
          onChange={(v) => set({ listed: v })}
          allLabel="Listed and hidden"
          options={[
            { value: 'true', label: 'Listed only' },
            { value: 'false', label: 'Hidden only' },
          ]}
        />
      </Toolbar>
      <DataTable
        rows={d?.items}
        loading={query.isPending}
        error={query.isError ? query.error : undefined}
        rowKey={(i) => i.id}
        empty="Nothing matches this search."
        minWidth={980}
        columns={[
          {
            key: 'name',
            header: 'Item',
            cell: (i) => (
              <div className={i.listed ? '' : 'opacity-60'}>
                <div className="font-semibold">{i.name}</div>
                <div className="max-w-72 truncate text-xs text-muted">{i.subtitle}</div>
              </div>
            ),
          },
          ...(d?.columns ?? []).slice(0, 4).map((c) => ({
            key: c,
            header: c,
            cell: (i: InventoryPage['items'][number]) => <span className="text-muted">{i.facts[c] ?? '—'}</span>,
          })),
          {
            key: 'price',
            header: 'From',
            align: 'right' as const,
            cell: (i) => (
              <div>
                <div className="font-bold">{i.priceFromPaise !== null ? inr(i.priceFromPaise) : '—'}</div>
                {i.rating !== null && (
                  <div className="inline-flex items-center gap-0.5 text-xs text-muted">
                    <Star aria-hidden className="size-3 fill-amber-400 text-amber-400" /> {i.rating}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'listed',
            header: 'On website',
            align: 'right' as const,
            cell: (i) => (
              <div className="flex justify-end">
                <Toggle checked={i.listed} onChange={(listed) => toggle.mutate({ id: i.id, listed })} label={`Show ${i.name} on the website`} hideLabel />
              </div>
            ),
          },
        ]}
        footer={d && <Pagination page={d.page} limit={d.limit} total={d.total} onPage={(p) => set({ page: String(p) })} />}
      />
    </div>
  );
}
