import type { SupportTicket, TicketPriority, TicketStatus } from '@zproo/types';
import { Button, cn, Input } from '@zproo/ui';
import { LifeBuoy, Lock, Plus, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { fieldErrors, useAdminGet, useAdminMutation } from '@/features/admin/api';
import { count, fmtDateTime, humanize, timeAgo } from '@/features/admin/format';
import {
  DataTable,
  DefinitionList,
  Drawer,
  Field,
  FilterSelect,
  PageHeader,
  SearchBox,
  Section,
  selectClass,
  StatCard,
  StatusBadge,
  TextArea,
  Toggle,
  Toolbar,
} from '@/features/admin/ui';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
const RANK: Record<TicketPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function AdminSupportPage() {
  const query = useAdminGet<SupportTicket[]>('/tickets');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatus | 'ACTIVE' | ''>('ACTIVE');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const tickets = query.data ?? [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter(
        (t) =>
          (status === '' || (status === 'ACTIVE' ? !['RESOLVED', 'CLOSED'].includes(t.status) : t.status === status)) &&
          (!priority || t.priority === priority) &&
          (!q || [t.number, t.subject, t.customerName, t.customerEmail, t.bookingReference].some((v) => v?.toLowerCase().includes(q))),
      )
      .sort((a, b) => RANK[a.priority] - RANK[b.priority] || b.updatedAt.localeCompare(a.updatedAt));
  }, [tickets, search, status, priority]);

  return (
    <div className="space-y-6">
      <Seo title="Support · Admin" noIndex />
      <PageHeader
        icon={LifeBuoy}
        title="Support"
        description="Customer tickets, most urgent first."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden /> New ticket
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open" loading={query.isPending} value={count(tickets.filter((t) => t.status === 'OPEN').length)} />
        <StatCard label="In progress" loading={query.isPending} value={count(tickets.filter((t) => t.status === 'IN_PROGRESS').length)} />
        <StatCard label="Urgent" loading={query.isPending} value={count(tickets.filter((t) => t.priority === 'URGENT' && !['RESOLVED', 'CLOSED'].includes(t.status)).length)} />
        <StatCard label="Resolved" loading={query.isPending} value={count(tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length)} />
      </div>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Ticket, subject, customer or booking" label="Search tickets" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => setStatus(v)}
          allLabel="All tickets"
          options={[{ value: 'ACTIVE' as const, label: 'Needs work' }, ...STATUSES.map((s) => ({ value: s, label: humanize(s) }))]}
        />
        <FilterSelect label="Priority" value={priority} onChange={setPriority} allLabel="Any priority" options={PRIORITIES} />
      </Toolbar>
      <DataTable
        rows={query.data ? rows : undefined}
        loading={query.isPending}
        error={query.isError ? query.error : undefined}
        rowKey={(t) => t.id}
        onRowClick={(t) => setOpenId(t.id)}
        rowLabel={(t) => `Open ticket ${t.number}`}
        empty="No tickets here. Nice work!"
        columns={[
          {
            key: 'subject',
            header: 'Ticket',
            cell: (t) => (
              <div className="max-w-96">
                <div className="truncate font-semibold">{t.subject}</div>
                <div className="text-xs font-normal text-muted">
                  {t.number} · {humanize(t.category)}
                </div>
              </div>
            ),
          },
          {
            key: 'customer',
            header: 'Customer',
            cell: (t) => (
              <div>
                <div className="font-semibold">{t.customerName}</div>
                <div className="text-xs text-muted">{t.customerEmail}</div>
              </div>
            ),
          },
          { key: 'priority', header: 'Priority', cell: (t) => <StatusBadge status={t.priority} /> },
          { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
          { key: 'assignee', header: 'Assignee', cell: (t) => <span className="text-muted">{t.assignee ?? 'Unassigned'}</span> },
          { key: 'updated', header: 'Updated', cell: (t) => <span className="whitespace-nowrap text-muted">{timeAgo(t.updatedAt)}</span> },
        ]}
      />
      <TicketDrawer ticket={tickets.find((t) => t.id === openId) ?? null} onClose={() => setOpenId(null)} />
      {creating && <NewTicket onClose={() => setCreating(false)} />}
    </div>
  );
}

function TicketDrawer({ ticket, onClose }: { ticket: SupportTicket | null; onClose: () => void }) {
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const id = ticket?.id ?? '';
  const send = useAdminMutation<{ body: string; internal: boolean }>('post', `/tickets/${encodeURIComponent(id)}/messages`, {
    success: (r) => ((r as SupportTicket).messages.at(-1)?.internal ? 'Note added' : 'Reply sent'),
    onSuccess: () => setReply(''),
  });
  const update = useAdminMutation<Partial<Pick<SupportTicket, 'status' | 'priority' | 'assignee'>>>('patch', `/tickets/${encodeURIComponent(id)}/update`, { success: 'Ticket updated' });

  return (
    <Drawer
      open={ticket !== null}
      onOpenChange={(o) => !o && onClose()}
      title={ticket?.subject ?? ''}
      description={ticket && `${ticket.number} · opened ${fmtDateTime(ticket.createdAt)}`}
      footer={
        ticket && (
          <>
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <Button variant="outline" onClick={() => update.mutate({ status: 'RESOLVED' })}>
                Mark resolved
              </Button>
            )}
            {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
              <Button variant="outline" onClick={() => update.mutate({ status: 'OPEN' })}>
                Reopen
              </Button>
            )}
          </>
        )
      }
    >
      {ticket && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm font-semibold">
              Status
              <select className={`${selectClass} w-full`} value={ticket.status} onChange={(e) => update.mutate({ status: e.target.value as TicketStatus })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold">
              Priority
              <select className={`${selectClass} w-full`} value={ticket.priority} onChange={(e) => update.mutate({ priority: e.target.value as TicketPriority })}>
                {PRIORITIES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DefinitionList
            items={[
              ['Customer', ticket.customerName],
              ['Email', ticket.customerEmail],
              ['Mobile', ticket.customerPhone ?? '—'],
              [
                'Booking',
                ticket.bookingReference ? (
                  <Link key="b" className="font-mono text-primary hover:underline" to={`/admin/bookings?ref=${ticket.bookingReference}`}>
                    {ticket.bookingReference}
                  </Link>
                ) : (
                  '—'
                ),
              ],
              ['Category', humanize(ticket.category)],
              ['Assignee', ticket.assignee ?? 'Unassigned'],
            ]}
          />
          <Section title="Conversation">
            <ol className="space-y-3">
              {ticket.messages.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm',
                    m.author === 'CUSTOMER' && 'mr-8 border-border bg-background',
                    m.author === 'AGENT' && !m.internal && 'ml-8 border-primary/20 bg-primary-light/60',
                    m.internal && 'ml-8 border-dashed border-amber-300 bg-amber-50',
                    m.author === 'SYSTEM' && 'mx-auto border-none bg-transparent py-0 text-center text-xs text-muted',
                  )}
                >
                  {m.author !== 'SYSTEM' && (
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 font-bold">
                        {m.internal && <Lock aria-label="Internal note" className="size-3" />}
                        {m.name}
                      </span>
                      <span className="text-muted">{fmtDateTime(m.at)}</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
            </ol>
          </Section>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim()) send.mutate({ body: reply.trim(), internal });
            }}
          >
            <Field label={internal ? 'Internal note (customer cannot see it)' : 'Reply to customer'}>
              {(fid) => <TextArea id={fid} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your message…" maxLength={4000} />}
            </Field>
            <div className="flex items-center justify-between gap-3">
              <Toggle checked={internal} onChange={setInternal} label="Internal note" hideLabel={false} />
              <Button type="submit" disabled={!reply.trim() || send.isPending}>
                <Send aria-hidden /> {internal ? 'Add note' : 'Send reply'}
              </Button>
            </div>
          </form>
        </>
      )}
    </Drawer>
  );
}

function NewTicket({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState({ subject: '', category: 'BOOKING', priority: 'MEDIUM', customerName: '', customerEmail: '', customerPhone: '', bookingReference: '', message: '' });
  const create = useAdminMutation<typeof v>('post', '/tickets', { success: 'Ticket created', onSuccess: onClose });
  const errors = fieldErrors(create.error);
  const text = (name: keyof typeof v, label: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Field label={label} error={errors[name]}>
      {(id) => <Input id={id} value={v[name]} onChange={(e) => setV({ ...v, [name]: e.target.value })} aria-invalid={Boolean(errors[name])} {...extra} />}
    </Field>
  );
  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      title="New ticket"
      description="Log a call or email from a customer."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="new-ticket" disabled={create.isPending}>
            Create ticket
          </Button>
        </>
      }
    >
      <form
        id="new-ticket"
        className="grid gap-4 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ ...v, customerPhone: v.customerPhone || null, bookingReference: v.bookingReference || null } as unknown as typeof v);
        }}
      >
        <div className="sm:col-span-2">{text('subject', 'Subject')}</div>
        <label className="space-y-1 text-sm font-semibold">
          Category
          <select className={`${selectClass} w-full`} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
            {['BOOKING', 'PAYMENT', 'REFUND', 'ACCOUNT', 'FEEDBACK', 'OTHER'].map((c) => (
              <option key={c} value={c}>
                {humanize(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Priority
          <select className={`${selectClass} w-full`} value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value })}>
            {PRIORITIES.map((c) => (
              <option key={c} value={c}>
                {humanize(c)}
              </option>
            ))}
          </select>
        </label>
        {text('customerName', 'Customer name')}
        {text('customerEmail', 'Customer email', { type: 'email' })}
        {text('customerPhone', 'Mobile (optional)')}
        {text('bookingReference', 'Booking reference (optional)')}
        <div className="sm:col-span-2">
          <Field label="What happened?" error={errors.message}>
            {(id) => <TextArea id={id} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />}
          </Field>
        </div>
      </form>
    </Drawer>
  );
}

