import type { AdminAuditPage as AuditPage } from '@zproo/types';
import { ScrollText } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { useAdminGet } from '@/features/admin/api';
import { fmtDateTime } from '@/features/admin/format';
import { DataTable, PageHeader, Pagination, SearchBox, Toolbar, useSearchFilter, useUrlFilters } from '@/features/admin/ui';

const DEFAULTS = { search: '', page: '1' };

export default function AdminAuditPage() {
  const [f, set] = useUrlFilters(DEFAULTS);
  const [search, setSearch] = useSearchFilter(f.search, (v) => set({ search: v }));
  const query = useAdminGet<AuditPage>('/audit', { search: f.search, page: Number(f.page), limit: 30 });
  const d = query.data;
  return (
    <div className="space-y-6">
      <Seo title="Audit log · Admin" noIndex />
      <PageHeader icon={ScrollText} title="Audit log" description="Who changed what in the admin panel, newest first." />
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search by person, action or record" label="Search the audit log" />
      </Toolbar>
      <DataTable
        rows={d?.items}
        loading={query.isPending}
        error={query.isError ? query.error : undefined}
        rowKey={(e) => e.id}
        empty="No admin activity recorded yet."
        columns={[
          { key: 'when', header: 'When', cell: (e) => <span className="whitespace-nowrap text-muted">{fmtDateTime(e.createdAt)}</span> },
          { key: 'who', header: 'Who', cell: (e) => <span className="font-semibold">{e.actorName}</span> },
          { key: 'action', header: 'Action', cell: (e) => <code className="rounded bg-background px-1.5 py-0.5 text-xs">{e.action}</code> },
          { key: 'what', header: 'Details', cell: (e) => <span className="text-muted">{e.summary}</span> },
          { key: 'record', header: 'Record', cell: (e) => <span className="font-mono text-xs">{e.entityType}{e.entityId ? ` · ${e.entityId}` : ''}</span> },
        ]}
        footer={d && <Pagination page={d.page} limit={d.limit} total={d.total} onPage={(p) => set({ page: String(p) })} />}
      />
    </div>
  );
}
