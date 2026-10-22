import { Bell } from 'lucide-react';
import { CollectionPage, type CollectionConfig } from '@/features/admin/CollectionPage';
import { count, fmtDateTime, humanize } from '@/features/admin/format';
import { StatusBadge } from '@/features/admin/ui';

const AUDIENCES = ['ALL_USERS', 'RECENT_CUSTOMERS', 'INACTIVE_USERS', 'STAFF'] as const;
const CHANNELS = ['IN_APP', 'PUSH', 'EMAIL', 'SMS'] as const;
const AUDIENCE_HINTS: Record<string, string> = {
  ALL_USERS: 'every active customer',
  RECENT_CUSTOMERS: 'booked in the last 60 days',
  INACTIVE_USERS: 'no sign-in for 60 days',
  STAFF: 'admin, support and operations staff',
};

const config: CollectionConfig<'notifications'> = {
  name: 'notifications',
  title: 'Notifications',
  singular: 'Campaign',
  icon: Bell,
  description: 'Send announcements to customers. In-app and Push campaigns appear in the notification bell of every customer in the audience as soon as they are sent (or when the scheduled time arrives). Email and SMS are recorded only; they are not delivered yet.',
  search: (n) => [n.title, n.body],
  filter: { label: 'Status', key: 'status', options: ['SENT', 'SCHEDULED', 'DRAFT'] },
  stats: (items) => [
    { label: 'Sent', value: count(items.filter((n) => n.status === 'SENT').length) },
    { label: 'Scheduled', value: count(items.filter((n) => n.status === 'SCHEDULED').length) },
    { label: 'Drafts', value: count(items.filter((n) => n.status === 'DRAFT').length) },
    { label: 'Total audience reached', value: count(items.reduce((s, n) => s + n.recipients, 0)) },
  ],
  columns: [
    {
      key: 'title',
      header: 'Message',
      cell: (n) => (
        <div className="max-w-96">
          <div className="font-semibold">{n.title}</div>
          <div className="truncate text-xs font-normal text-muted">{n.body}</div>
        </div>
      ),
    },
    { key: 'audience', header: 'Audience', cell: (n) => humanize(n.audience) },
    { key: 'channels', header: 'Channels', cell: (n) => <span className="text-xs text-muted">{n.channels.map(humanize).join(', ')}</span> },
    { key: 'when', header: 'When', cell: (n) => <span className="whitespace-nowrap text-xs text-muted">{n.sentAt ? fmtDateTime(n.sentAt) : n.scheduledFor ? `For ${fmtDateTime(n.scheduledFor)}` : '—'}</span> },
    { key: 'reach', header: 'Audience', align: 'right', cell: (n) => (n.status === 'SENT' ? count(n.recipients) : '—') },
    { key: 'status', header: 'Status', cell: (n) => <StatusBadge status={n.status} /> },
  ],
  canDelete: (n) => n.status !== 'SENT',
  defaults: { title: '', body: '', audience: 'ALL_USERS', channels: ['IN_APP', 'PUSH'], linkPath: '', delivery: 'now', scheduledFor: '' },
  prepare: (n) => ({ ...n, delivery: n.status === 'SCHEDULED' ? 'schedule' : 'draft' }),
  fields: [
    { name: 'title', label: 'Title', type: 'text', wide: true },
    { name: 'body', label: 'Message', type: 'textarea', hint: 'Up to 500 characters. SMS is cut at 160.' },
    { name: 'audience', label: 'Audience', type: 'select', options: AUDIENCES.map((a) => ({ value: a, label: `${humanize(a)} — ${AUDIENCE_HINTS[a]}` })), wide: true },
    { name: 'channels', label: 'Channels', type: 'multiselect', hint: 'Only In app and Push are shown to customers today.', options: CHANNELS.map((c) => ({ value: c, label: humanize(c) })) },
    { name: 'linkPath', label: 'Opens page', type: 'text', nullable: true, placeholder: '/offers' },
    {
      name: 'delivery',
      label: 'Delivery',
      type: 'select',
      options: [
        { value: 'now', label: 'Send now' },
        { value: 'schedule', label: 'Schedule for later' },
        { value: 'draft', label: 'Save as draft' },
      ],
    },
    { name: 'scheduledFor', label: 'Send at', type: 'datetime', nullable: true, when: (v) => v.delivery === 'schedule' },
  ],
  transform: ({ delivery, ...body }) => ({ ...body, sendNow: delivery === 'now', ...(delivery !== 'schedule' && { scheduledFor: null }) }),
};

export default function AdminNotificationsPage() {
  return <CollectionPage config={config} />;
}
