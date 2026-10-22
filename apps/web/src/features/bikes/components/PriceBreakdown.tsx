import { cn } from '@zproo/ui';
import { formatDuration } from '../dates';
import { rupees } from '../pricing';
import type { RentalQuote } from '../types';

export function PriceBreakdown({ quote, className }: { quote: RentalQuote; className?: string }) {
  return (
    <dl className={cn('space-y-2 text-sm', className)}>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Rental duration</dt>
        <dd className="font-semibold">{formatDuration(quote.elapsedHours)}</dd>
      </div>
      {quote.billableHours > Math.ceil(quote.elapsedHours) && (
        <p className="text-xs text-muted">Minimum billing of {quote.billableHours} hours applies.</p>
      )}
      <div className="space-y-2 border-t border-border pt-2">
        {quote.lines.map((l) => (
          <div key={l.label} className="flex justify-between gap-4">
            <dt className="text-muted">{l.label}</dt>
            <dd className={cn('shrink-0', l.negative && 'text-success')}>{l.negative ? `-${rupees(l.amount)}` : rupees(l.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4">
          <dt className="text-muted">GST (18%)</dt>
          <dd>{rupees(quote.tax)}</dd>
        </div>
        {quote.couponCode && (quote.couponDiscount ?? 0) > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Coupon {quote.couponCode}</dt>
            <dd className="shrink-0 text-success">-{rupees(quote.couponDiscount ?? 0)}</dd>
          </div>
        )}
      </div>
      <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
        <dt>Estimated total</dt>
        <dd className="text-[22px] leading-7">{rupees(quote.total)}</dd>
      </div>
      <div className="flex justify-between gap-4 rounded-lg bg-neutral-100 px-3 py-2 text-xs">
        <dt>Refundable security deposit (not included above)</dt>
        <dd className="shrink-0 font-semibold">{rupees(quote.deposit)}</dd>
      </div>
      <p className="text-xs text-muted">
        Includes {quote.kmIncluded} km. Fuel and tolls extra. Final charges are confirmed at pickup.
      </p>
    </dl>
  );
}
