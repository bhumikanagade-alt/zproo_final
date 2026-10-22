import type { Coupon } from '@zproo/types';
import { Badge } from '@zproo/ui';
import { adminInstant, dayKey } from '@zproo/utils';
import { Ticket } from 'lucide-react';
import { CollectionPage, type CollectionConfig } from '@/features/admin/CollectionPage';
import { count, fmtDate, inr, SERVICE_LABELS, SERVICE_ORDER } from '@/features/admin/format';

// Dates are Indian calendar days, compared as instants (never as date text).
const today = () => dayKey(new Date());
const inDays = (n: number) => dayKey(new Date(Date.now() + n * 86_400_000));
const expired = (c: Coupon) => adminInstant(c.validTo, 'end') < Date.now();
const isLive = (c: Coupon) => c.active && !expired(c) && adminInstant(c.validFrom, 'start') <= Date.now();
const exhausted = (c: Coupon) => c.usageLimit !== null && c.usedCount >= c.usageLimit;

const discountLabel = (c: Pick<Coupon, 'discountType' | 'value' | 'maxDiscountPaise'>) =>
  c.discountType === 'PERCENT' ? `${c.value}% off${c.maxDiscountPaise ? ` (max ${inr(c.maxDiscountPaise)})` : ''}` : `${inr(c.value)} off`;

const config: CollectionConfig<'coupons'> = {
  name: 'coupons',
  title: 'Coupons',
  singular: 'Coupon',
  icon: Ticket,
  description: 'Discount codes customers enter at checkout.',
  search: (c) => [c.code, c.description],
  filter: { label: 'Discount type', key: 'discountType', options: ['PERCENT', 'FLAT'] },
  stats: (items) => [
    { label: 'Live now', value: count(items.filter(isLive).length) },
    { label: 'Total uses', value: count(items.reduce((s, c) => s + c.usedCount, 0)) },
    { label: 'Expired', value: count(items.filter(expired).length) },
    { label: 'Paused', value: count(items.filter((c) => !c.active).length) },
  ],
  columns: [
    {
      key: 'code',
      header: 'Code',
      cell: (c) => (
        <div>
          <div className="font-mono font-bold">{c.code}</div>
          <div className="max-w-64 truncate text-xs font-normal text-muted">{c.description}</div>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      cell: (c) => (
        <div>
          <div className="font-semibold">{discountLabel(c)}</div>
          {c.minOrderPaise > 0 && <div className="text-xs text-muted">on orders over {inr(c.minOrderPaise)}</div>}
        </div>
      ),
    },
    {
      key: 'services',
      header: 'Services',
      cell: (c) => <span className="text-muted">{c.services.length ? c.services.map((s) => SERVICE_LABELS[s]).join(', ') : 'All services'}</span>,
    },
    { key: 'valid', header: 'Valid', cell: (c) => <span className="whitespace-nowrap text-xs text-muted">{fmtDate(c.validFrom)} – {fmtDate(c.validTo)}</span> },
    { key: 'uses', header: 'Used', align: 'right', cell: (c) => `${count(c.usedCount)}${c.usageLimit ? ` / ${count(c.usageLimit)}` : ''}` },
    {
      key: 'state',
      header: 'State',
      cell: (c) =>
        exhausted(c) ? <Badge variant="warning">Used up</Badge> : isLive(c) ? <Badge variant="success">Live</Badge> : expired(c) ? <Badge variant="outline">Expired</Badge> : !c.active ? <Badge variant="outline">Paused</Badge> : <Badge variant="soft">Scheduled</Badge>,
    },
  ],
  // A getter: default dates are worked out when the form opens, not once when the page loads.
  get defaults() {
    return { code: '', description: '', discountType: 'PERCENT', valuePercent: '10', valueFlat: '', maxDiscountPaise: '', minOrderPaise: '0', services: [], validFrom: today(), validTo: inDays(30), usageLimit: '', perUserLimit: '1', active: true };
  },
  prepare: (c) => ({ ...c, valuePercent: c.discountType === 'PERCENT' ? c.value : '', valueFlat: c.discountType === 'FLAT' ? c.value : null }),
  fields: [
    { name: 'code', label: 'Code', type: 'text', placeholder: 'DIWALI25', hint: '3–20 letters or digits' },
    { name: 'discountType', label: 'Discount type', type: 'select', options: [{ value: 'PERCENT', label: 'Percentage' }, { value: 'FLAT', label: 'Flat amount' }] },
    { name: 'description', label: 'Description', type: 'text', wide: true, placeholder: 'Shown to customers with the code' },
    { name: 'valuePercent', label: 'Percent off', type: 'percent', when: (v) => v.discountType === 'PERCENT' },
    { name: 'maxDiscountPaise', label: 'Maximum discount', type: 'money', nullable: true, hint: 'Leave empty for no cap', when: (v) => v.discountType === 'PERCENT' },
    { name: 'valueFlat', label: 'Amount off', type: 'money', when: (v) => v.discountType === 'FLAT' },
    { name: 'minOrderPaise', label: 'Minimum order', type: 'money' },
    { name: 'services', label: 'Valid on', type: 'multiselect', options: SERVICE_ORDER.map((s) => ({ value: s, label: SERVICE_LABELS[s] })), hint: 'None selected = every service' },
    { name: 'validFrom', label: 'Starts', type: 'date' },
    { name: 'validTo', label: 'Ends', type: 'date' },
    { name: 'usageLimit', label: 'Total uses', type: 'number', nullable: true, hint: 'Empty = unlimited' },
    { name: 'perUserLimit', label: 'Uses per customer', type: 'number' },
    { name: 'active', label: 'Active', type: 'checkbox', hint: 'Paused coupons are rejected at checkout.' },
  ],
  transform: ({ valuePercent, valueFlat, ...body }) => ({
    ...body,
    value: body.discountType === 'PERCENT' ? valuePercent : valueFlat,
    ...(body.discountType === 'FLAT' && { maxDiscountPaise: null }),
  }),
};

export default function AdminCouponsPage() {
  return <CollectionPage config={config} />;
}

