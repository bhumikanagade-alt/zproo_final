import { RoleName, UserStatus, type AdminUserDetail, type AdminUserRow, type Paginated } from '@zproo/types';
import { Badge, Button, Card, Skeleton } from '@zproo/ui';
import { Download, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toCsv } from '@zproo/utils';
import { Seo } from '@/components/seo/Seo';
import { useAdminGet, useAdminMutation } from '@/features/admin/api';
import { count, downloadFile, fmtDate, fmtDateTime, humanize, inr, SERVICE_LABELS, timeAgo } from '@/features/admin/format';
import {
  ConfirmDialog,
  DataTable,
  DefinitionList,
  Drawer,
  ErrorState,
  Field,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchBox,
  Section,
  StatCard,
  StatusBadge,
  TextArea,
  Toolbar,
  useSearchFilter,
  useUrlFilters,
} from '@/features/admin/ui';
import { useNotifications } from '@/components/feedback/Notifications';
import { errorMessage } from '@/features/auth/errors';
import { hasPermission, useAuthStore } from '@/features/auth/store';
import { apiGet } from '@/services/http';

const DEFAULTS = { search: '', role: '', status: '', page: '1', user: '' };
const LIMIT = 20;
const cleanFilters = (p: Record<string, string>) => Object.fromEntries(Object.entries(p).filter(([, v]) => v));

export default function AdminUsersPage() {
  const [f, set] = useUrlFilters(DEFAULTS);
  const [search, setSearch] = useSearchFilter(f.search, (v) => set({ search: v }));
  const query = useAdminGet<Paginated<AdminUserRow>>('/users', { search: f.search, role: f.role, status: f.status, page: Number(f.page), limit: LIMIT });
  const data = query.data;

  const { notify } = useNotifications();
  const [exporting, setExporting] = useState(false);
  /** Exports every user matching the current filters (not just the 20 on screen), up to a cap. */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: AdminUserRow[] = [];
      for (let page = 1; ; page += 1) {
        const res = await apiGet<Paginated<AdminUserRow>>('/admin/users', { params: { ...cleanFilters({ search: f.search, role: f.role, status: f.status }), page, limit: 100 } });
        rows.push(...res.items);
        if (rows.length >= res.total || res.items.length === 0) break;
        if (rows.length >= 5000) {
          notify('Exported the first 5,000 users. Narrow the filters for the rest.', 'info');
          break;
        }
      }
      downloadFile(
        `zproo-users-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(
          ['Name', 'Mobile', 'Email', 'Roles', 'Status', 'Joined', 'Last login'],
          rows.map((u) => [u.fullName, u.phone, u.email, u.roles.join(' '), u.status, u.createdAt.slice(0, 10), u.lastLoginAt?.slice(0, 10) ?? '']),
        ),
      );
    } catch (error) {
      notify(`Export failed: ${errorMessage(error)}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Seo title="Users · Admin" noIndex />
      <PageHeader
        icon={Users}
        title="Users"
        description={data ? `${count(data.total)} accounts` : 'Loading…'}
        actions={
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting || !data?.items.length}>
            <Download aria-hidden /> {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, mobile or email" label="Search users" />
        <FilterSelect label="Filter by role" value={f.role as RoleName | ''} onChange={(v) => set({ role: v })} allLabel="All roles" options={Object.values(RoleName)} />
        <FilterSelect label="Filter by status" value={f.status as UserStatus | ''} onChange={(v) => set({ status: v })} allLabel="All statuses" options={Object.values(UserStatus)} />
      </Toolbar>

      <DataTable
        rows={data?.items}
        loading={query.isPending}
        error={query.isError ? query.error : undefined}
        rowKey={(u) => u.id}
        onRowClick={(u) => set({ user: u.id, page: f.page })}
        rowLabel={(u) => `Open ${u.fullName}`}
        empty="No users match these filters."
        columns={[
          { key: 'name', header: 'Name', cell: (u) => u.fullName },
          {
            key: 'contact',
            header: 'Contact',
            cell: (u) => (
              <>
                <div>{u.phone ?? '—'}</div>
                <div className="text-xs text-muted">{u.email ?? ''}</div>
              </>
            ),
          },
          {
            key: 'roles',
            header: 'Roles',
            cell: (u) => (
              <div className="flex flex-wrap gap-1">
                {u.roles.map((r) => (
                  <Badge key={r} variant={r === 'USER' ? 'outline' : 'soft'}>
                    {humanize(r)}
                  </Badge>
                ))}
              </div>
            ),
          },
          { key: 'status', header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
          { key: 'joined', header: 'Joined', cell: (u) => <span className="text-muted">{fmtDate(u.createdAt)}</span> },
          { key: 'login', header: 'Last login', cell: (u) => <span className="text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</span> },
        ]}
        footer={data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={(p) => set({ page: String(p) })} />}
      />
      <UserDrawer key={f.user || 'none'} id={f.user || null} onClose={() => set({ user: '', page: f.page })} />
    </div>
  );
}

function UserDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const me = useAuthStore((s) => s.user);
  const query = useAdminGet<AdminUserDetail>(`/users/${encodeURIComponent(id ?? '')}`, undefined, { enabled: Boolean(id) });
  const u = query.data?.id === id ? query.data : undefined;
  const [statusTarget, setStatusTarget] = useState<UserStatus | null>(null);
  const [reason, setReason] = useState('');
  const [roles, setRoles] = useState<RoleName[] | null>(null);
  // The drawer is keyed by user id, so everything typed here belongs to this one user only.
  const status = useAdminMutation<{ status: UserStatus; reason?: string }>('patch', () => `/users/${encodeURIComponent(id ?? '')}/status`, {
    success: 'Status updated',
    onSuccess: () => {
      setStatusTarget(null);
      setReason('');
    },
  });
  const saveRoles = useAdminMutation<{ roles: RoleName[] }>('put', () => `/users/${encodeURIComponent(id ?? '')}/roles`, {
    success: 'Roles updated',
    onSuccess: () => setRoles(null),
  });
  const isSelf = me?.id === id;
  const canManage = hasPermission(me, 'user:manage') && !isSelf;
  const canRoles = hasPermission(me, 'role:manage');
  const editing = roles ?? u?.roles ?? [];

  return (
    <Drawer
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) {
          setRoles(null);
          onClose();
        }
      }}
      title={u?.fullName ?? 'User'}
      description={u ? `Joined ${fmtDate(u.createdAt)} · last login ${u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'never'}` : undefined}
      footer={
        u &&
        canManage && (
          <>
            {u.status !== 'ACTIVE' && (
              <Button onClick={() => setStatusTarget('ACTIVE')} disabled={status.isPending}>
                Reactivate
              </Button>
            )}
            {u.status === 'ACTIVE' && (
              <>
                <Button variant="outline" onClick={() => setStatusTarget('INACTIVE')}>
                  Deactivate
                </Button>
                <Button variant="destructive" onClick={() => setStatusTarget('SUSPENDED')}>
                  Suspend
                </Button>
              </>
            )}
          </>
        )
      }
    >
      {query.isError && <ErrorState error={query.error} />}
      {!u && !query.isError && <Skeleton className="h-64" />}
      {u && (
        <>
          <div className="flex items-center gap-2">
            <StatusBadge status={u.status} />
            {isSelf && <Badge variant="soft">You</Badge>}
          </div>
          <DefinitionList
            items={[
              ['Mobile', u.phone ?? '—'],
              ['Email', u.email ?? '—'],
              ['User ID', <span key="id" className="font-mono text-xs">{u.id}</span>],
            ]}
          />
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Bookings" value={count(u.stats.bookings)} />
            <StatCard label="Spent" value={inr(u.stats.spentPaise)} />
            <StatCard label="Cancelled" value={count(u.stats.cancelled)} />
          </div>
          <Section
            title="Roles"
            actions={
              canRoles &&
              roles && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setRoles(null)}>
                    Reset
                  </Button>
                  <Button size="sm" disabled={!roles.length || saveRoles.isPending} onClick={() => saveRoles.mutate({ roles })}>
                    Save roles
                  </Button>
                </div>
              )
            }
          >
            <fieldset disabled={!canRoles} className="grid grid-cols-2 gap-2">
              <legend className="sr-only">Roles</legend>
              {Object.values(RoleName).map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary-light disabled:cursor-default">
                  <input
                    type="checkbox"
                    className="accent-[var(--primary)]"
                    checked={editing.includes(r)}
                    onChange={(e) => setRoles(e.target.checked ? [...editing, r] : editing.filter((x) => x !== r))}
                  />
                  {humanize(r)}
                </label>
              ))}
            </fieldset>
            {!canRoles && (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck aria-hidden className="size-3.5" /> Only a super admin can change roles.
              </p>
            )}
          </Section>
          <Section
            title="Recent bookings"
            actions={
              <Link className="text-xs font-bold text-primary hover:underline" to={`/admin/bookings?userId=${encodeURIComponent(u.id)}`}>
                See all
              </Link>
            }
          >
            {u.recentBookings.length === 0 ? (
              <p className="text-sm text-muted">No bookings yet.</p>
            ) : (
              <Card className="divide-y divide-border">
                {u.recentBookings.map((b) => (
                  <Link key={b.reference} to={`/admin/bookings?ref=${b.reference}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-background">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{b.title}</div>
                      <div className="text-xs text-muted">
                        {SERVICE_LABELS[b.serviceType]} · {fmtDate(b.travelDate)} · <span className="font-mono">{b.reference}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold">{inr(b.totalPaise)}</span>
                      <StatusBadge status={b.status} />
                    </div>
                  </Link>
                ))}
              </Card>
            )}
          </Section>
        </>
      )}
      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={(o) => !o && setStatusTarget(null)}
        title={statusTarget === 'ACTIVE' ? `Reactivate ${u?.fullName}?` : `${statusTarget === 'SUSPENDED' ? 'Suspend' : 'Deactivate'} ${u?.fullName}?`}
        description={statusTarget === 'ACTIVE' ? 'They can sign in and book again.' : 'They are signed out and cannot sign in until reactivated.'}
        confirmLabel={statusTarget === 'ACTIVE' ? 'Reactivate' : statusTarget === 'SUSPENDED' ? 'Suspend' : 'Deactivate'}
        destructive={statusTarget !== 'ACTIVE'}
        pending={status.isPending}
        onConfirm={() => statusTarget && status.mutate({ status: statusTarget, ...(reason.trim() && { reason: reason.trim() }) })}
      >
        {statusTarget !== 'ACTIVE' && (
          <Field label="Reason (optional)">{(fid) => <TextArea id={fid} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />}</Field>
        )}
      </ConfirmDialog>
    </Drawer>
  );
}
