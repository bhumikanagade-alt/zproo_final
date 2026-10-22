import { IdCard, Star } from 'lucide-react';
import { CollectionPage, type CollectionConfig } from '@/features/admin/CollectionPage';
import { count, humanize } from '@/features/admin/format';
import { StatusBadge } from '@/features/admin/ui';

const VEHICLES = ['BIKE', 'AUTO', 'MINI', 'SEDAN', 'SUV'] as const;

const config: CollectionConfig<'drivers'> = {
  name: 'drivers',
  title: 'Drivers',
  singular: 'Driver',
  icon: IdCard,
  description: 'Cab, auto and bike-taxi drivers: KYC, vehicles and availability.',
  search: (d) => [d.name, d.phone, d.city, d.vehicleNumber, d.licenceNumber],
  filter: { label: 'Status', key: 'status', options: ['ACTIVE', 'PENDING_KYC', 'SUSPENDED'] },
  stats: (items) => [
    { label: 'Online now', value: count(items.filter((d) => d.online && d.status === 'ACTIVE').length) },
    { label: 'Active', value: count(items.filter((d) => d.status === 'ACTIVE').length) },
    { label: 'KYC pending', value: count(items.filter((d) => d.status === 'PENDING_KYC').length) },
    { label: 'Trips completed', value: count(items.reduce((s, d) => s + d.trips, 0)) },
  ],
  columns: [
    {
      key: 'name',
      header: 'Driver',
      cell: (d) => (
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <span aria-hidden className={`size-2 rounded-full ${d.online && d.status === 'ACTIVE' ? 'bg-green-500' : 'bg-border'}`} />
            {d.name}
          </div>
          <div className="text-xs font-normal text-muted">{d.phone} · {d.city}</div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      cell: (d) => (
        <div>
          <div className="font-mono text-xs font-bold">{d.vehicleNumber}</div>
          <div className="text-xs text-muted">{humanize(d.vehicleType)}</div>
        </div>
      ),
    },
    { key: 'licence', header: 'Licence', cell: (d) => <span className="font-mono text-xs">{d.licenceNumber}</span> },
    {
      key: 'rating',
      header: 'Rating',
      cell: (d) => (
        <span className="inline-flex items-center gap-1">
          <Star aria-hidden className="size-3.5 fill-amber-400 text-amber-400" /> {d.rating.toFixed(1)}
        </span>
      ),
    },
    { key: 'trips', header: 'Trips', align: 'right', cell: (d) => count(d.trips) },
    { key: 'status', header: 'Status', cell: (d) => <StatusBadge status={d.status} /> },
  ],
  defaults: { name: '', phone: '', city: 'Pune', vehicleType: 'SEDAN', vehicleNumber: '', licenceNumber: '', status: 'PENDING_KYC', online: false },
  fields: [
    { name: 'name', label: 'Full name', type: 'text' },
    { name: 'phone', label: 'Mobile', type: 'text', placeholder: '+91 98765 43210' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'vehicleType', label: 'Vehicle type', type: 'select', options: VEHICLES.map((v) => ({ value: v, label: humanize(v) })) },
    { name: 'vehicleNumber', label: 'Vehicle number', type: 'text', placeholder: 'MH 12 AB 1234' },
    { name: 'licenceNumber', label: 'Driving licence', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: ['PENDING_KYC', 'ACTIVE', 'SUSPENDED'].map((s) => ({ value: s, label: humanize(s) })) },
    { name: 'online', label: 'Online', type: 'checkbox', hint: 'Online drivers receive ride requests.' },
  ],
};

export default function AdminDriversPage() {
  return <CollectionPage config={config} />;
}
