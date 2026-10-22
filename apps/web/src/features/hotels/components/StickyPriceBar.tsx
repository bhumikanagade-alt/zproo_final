import { Button } from '@zproo/ui';
import { Link } from 'react-router';

interface Props {
  name: string;
  priceLabel: string;
  detail: string;
  to: string;
}

/** Bar fixed to the bottom of the screen so “Select room” is always one tap away. */
export function StickyPriceBar({ name, priceLabel, detail, to }: Props) {
  return (
    <div role="region" aria-label="Price and room selection" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 shadow-raised backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-1 sm:px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="text-lg font-extrabold leading-tight">{priceLabel} <span className="text-xs font-normal text-muted">{detail}</span></p>
        </div>
        <Button asChild size="lg" className="shrink-0"><Link to={to}>Select room</Link></Button>
      </div>
    </div>
  );
}
