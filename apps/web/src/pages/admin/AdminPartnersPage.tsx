import { Handshake } from 'lucide-react';
import { CollectionPage, type CollectionConfig } from '@/features/admin/CollectionPage';
import { count, humanize } from '@/features/admin/format';
import { StatusBadge } from '@/features/admin/ui';

const TYPES = ['AIRLINE', 'BUS_OPERATOR', 'HOTEL', 'CAB_FLEET', 'BIKE_RENTAL', 'COURIER', 'TOUR_OPERATOR'] as const;

const config: CollectionConfig<'partners'> = {
  name: 'partners',
  title: 'Partners',
  singular: 'Partner',
  icon: Handshake,
  description: 'Airlines, operators, hotels and fleets who supply inventory, with their commission.',
  search: (p) => [p.name, p.contactName, p.email, p.phone, p.city, p.gstin],
  filter: { label: 'Status', key: 'status', options: ['ACTIVE', 'PENDING', 'SUSPENDED'] },
  stats: (items) => [
    { label: 'Active', value: count(items.filter((p) => p.status === 'ACTIVE').length) },
    { label: 'Awaiting approval', value: count(items.filter((p) => p.status === 'PENDING').length) },
    { label: 'Listings', value: count(items.reduce((s, p) => s + p.listings, 0)) },
    {
      label: 'Avg commission',
      value: items.length ? `${(items.reduce((s, p) => s + p.commissionPct, 0) / items.length).toFixed(1)}%` : '—',
    },
  ],
  columns: [
    {
      key: 'name',
      header: 'Partner',
      cell: (p) => (
        <div>
          <div className="font-semibold">{p.name}</div>
          <div className="text-xs font-normal text-muted">{humanize(p.type)} · {p.city}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (p) => (
        <div className="text-xs">
          <div className="font-semibold">{p.contactName}</div>
          <div className="text-muted">{p.email}</div>
          <div className="text-muted">{p.phone}</div>
        </div>
      ),
    },
    { key: 'gst', header: 'GSTIN', cell: (p) => <span className="font-mono text-xs">{p.gstin ?? '—'}</span> },
    { key: 'commission', header: 'Commission', align: 'right', cell: (p) => `${p.commissionPct}%` },
    { key: 'listings', header: 'Listings', align: 'right', cell: (p) => count(p.listings) },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
  ],
  defaults: { name: '', type: 'BUS_OPERATOR', contactName: '', email: '', phone: '', city: 'Pune', gstin: '', commissionPct: '10', status: 'PENDING', listings: '0' },
  fields: [
    { name: 'name', label: 'Business name', type: 'text', wide: true },
    { name: 'type', label: 'Type', type: 'select', options: TYPES.map((t) => ({ value: t, label: humanize(t) })) },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'contactName', label: 'Contact person', type: 'text' },
    { name: 'phone', label: 'Phone', type: 'text', placeholder: '+91 20 4000 1000' },
    { name: 'email', label: 'Email', type: 'text', wide: true },
    { name: 'gstin', label: 'GSTIN', type: 'text', nullable: true, placeholder: '27ABCDE1234F1Z5' },
    { name: 'commissionPct', label: 'Commission', type: 'percent' },
    { name: 'listings', label: 'Listings', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'ACTIVE', 'SUSPENDED'].map((s) => ({ value: s, label: humanize(s) })) },
  ],
};

export default function AdminPartnersPage() {
  return <CollectionPage config={config} />;
}
