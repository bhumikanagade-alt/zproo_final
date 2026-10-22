import { formatINR } from '../data';
import type { PriceBreakdown } from '../pricing';

export function PriceBox({ price, payAtProperty = false }: { price: PriceBreakdown; payAtProperty?: boolean }) {
  return (
    <dl className="space-y-2 text-sm" aria-label="Price breakdown">
      <div className="flex justify-between"><dt>Room price <span className="text-muted">({price.nights} night{price.nights === 1 ? '' : 's'} × {price.rooms} room{price.rooms === 1 ? '' : 's'})</span></dt><dd>{formatINR(price.roomSubtotalPaise)}</dd></div>
      {price.offerDiscountPaise > 0 && <div className="flex justify-between text-primary"><dt>Offer already applied</dt><dd>You save {formatINR(price.offerDiscountPaise)}</dd></div>}
      <div className="flex justify-between"><dt>Taxes &amp; fees</dt><dd>{formatINR(price.taxesPaise)}</dd></div>
      {price.couponDiscountPaise > 0 && <div className="flex justify-between text-primary"><dt>Coupon {price.couponCode}</dt><dd>-{formatINR(price.couponDiscountPaise)}</dd></div>}
      <div className="flex justify-between border-t border-border pt-3 text-lg font-extrabold"><dt>{payAtProperty ? 'Total payable at property' : 'Total payable'}</dt><dd>{formatINR(price.totalPaise)}</dd></div>
    </dl>
  );
}
