import { Badge } from '@zproo/ui';
import { adminInstant, dayKey } from '@zproo/utils';
import { BadgePercent, Star } from 'lucide-react';
import { CollectionPage, type CollectionConfig } from '@/features/admin/CollectionPage';
import { count, fmtDate, SERVICE_LABELS, SERVICE_ORDER } from '@/features/admin/format';

const today = () => dayKey(new Date());
const inDays = (n: number) => dayKey(new Date(Date.now() + n * 86_400_000));
const expired = (o: { validTo: string }) => adminInstant(o.validTo, 'end') < Date.now();
const started = (o: { validFrom?: string | null }) => !o.validFrom || adminInstant(o.validFrom, 'start') <= Date.now();
const isLive = (o: { active: boolean; validTo: string; validFrom?: string | null }) => o.active && !expired(o) && started(o);

const config: CollectionConfig<'offers'> = {
  name: 'offers',
  title: 'Offers',
  singular: 'Offer',
  icon: BadgePercent,
  description: 'Promotions shown on the Offers page and home page. Link one to a coupon code.',
  search: (o) => [o.title, o.subtitle, o.couponCode],
  filter: { label: 'Service', key: 'service', options: ['ALL', ...SERVICE_ORDER] },
  stats: (items) => [
    { label: 'Live', value: count(items.filter(isLive).length) },
    { label: 'Featured', value: count(items.filter((o) => o.featured).length) },
    { label: 'Expired', value: count(items.filter(expired).length) },
    { label: 'Hidden', value: count(items.filter((o) => !o.active).length) },
  ],
  columns: [
    {
      key: 'title',
      header: 'Offer',
      cell: (o) => (
        <div className="max-w-80">
          <div className="flex items-center gap-1.5 font-semibold">
            {o.featured && <Star aria-label="Featured" className="size-3.5 fill-amber-400 text-amber-400" />}
            {o.title}
          </div>
          <div className="truncate text-xs font-normal text-muted">{o.subtitle}</div>
        </div>
      ),
    },
    { key: 'service', header: 'Service', cell: (o) => (o.service === 'ALL' ? 'All services' : SERVICE_LABELS[o.service]) },
    { key: 'code', header: 'Coupon', cell: (o) => (o.couponCode ? <span className="font-mono text-xs font-bold">{o.couponCode}</span> : <span className="text-muted">—</span>) },
    { key: 'cta', header: 'Button', cell: (o) => <span className="text-xs text-muted">{o.ctaLabel} → {o.ctaPath}</span> },
    { key: 'until', header: 'Runs', cell: (o) => <span className="whitespace-nowrap text-muted">{o.validFrom ? `${fmtDate(o.validFrom)} – ` : 'Until '}{fmtDate(o.validTo)}</span> },
    { key: 'order', header: 'Order', align: 'right', cell: (o) => o.sortOrder },
    {
      key: 'state',
      header: 'State',
      cell: (o) => (!o.active ? <Badge variant="outline">Hidden</Badge> : expired(o) ? <Badge variant="outline">Expired</Badge> : !started(o) ? <Badge variant="soft">Scheduled</Badge> : <Badge variant="success">Live</Badge>),
    },
  ],
  // A getter: dates are worked out when the form opens (Indian dates), not once when the page loads.
  get defaults() {
    return { title: '', subtitle: '', service: 'ALL', couponCode: '', ctaLabel: 'Book now', ctaPath: '/offers', validFrom: today(), validTo: inDays(30), featured: false, active: true, sortOrder: '10' };
  },
  fields: [
    { name: 'title', label: 'Title', type: 'text', wide: true, placeholder: 'Flat ₹150 off bus tickets' },
    { name: 'subtitle', label: 'Subtitle', type: 'text', wide: true },
    { name: 'service', label: 'Service', type: 'select', options: [{ value: 'ALL', label: 'All services' }, ...SERVICE_ORDER.map((s) => ({ value: s, label: SERVICE_LABELS[s] }))] },
    { name: 'couponCode', label: 'Coupon code', type: 'text', nullable: true, placeholder: 'Optional' },
    { name: 'ctaLabel', label: 'Button label', type: 'text' },
    { name: 'ctaPath', label: 'Button link', type: 'text', hint: 'A site path, e.g. /buses' },
    { name: 'validFrom', label: 'Show from', type: 'date', nullable: true, hint: 'Leave empty to go live straight away.' },
    { name: 'validTo', label: 'Show until', type: 'date' },
    { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower shows first' },
    { name: 'featured', label: 'Featured', type: 'checkbox', hint: 'Featured offers lead the home page carousel.' },
    { name: 'active', label: 'Visible on the website', type: 'checkbox' },
  ],
};

export default function AdminOffersPage() {
  return <CollectionPage config={config} />;
}
