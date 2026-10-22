import { Button } from '@zproo/ui';
import { GitCompareArrows, X } from 'lucide-react';
import { Link } from 'react-router';
import { MAX_COMPARE, useCompare } from '../compare';
import { findHotel } from '../data';

/** Sticky bar at the bottom of the results with the hotels picked for comparison. */
export function CompareBar({ query }: { query: string }) {
  const ids = useCompare((s) => s.ids);
  const remove = useCompare((s) => s.remove);
  const clear = useCompare((s) => s.clear);
  if (ids.length === 0) return null;
  const hotels = ids.map((id) => findHotel(id)).filter((h) => h !== undefined);
  const to = `/hotels/compare?ids=${ids.join(',')}${query ? `&${query}` : ''}`;
  return (
    <div role="region" aria-label="Compare hotels" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card p-3 shadow-raised">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <GitCompareArrows aria-hidden className="size-4 text-primary" /> Compare ({ids.length}/{MAX_COMPARE})
        </p>
        <ul className="flex flex-1 flex-wrap gap-2">
          {hotels.map((h) => (
            <li key={h.id} className="flex items-center gap-1 rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary">
              {h.name}
              <button type="button" onClick={() => remove(h.id)} aria-label={`Remove ${h.name} from comparison`}>
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>Clear</Button>
        {ids.length >= 2 ? (
          <Button asChild size="sm"><Link to={to}>Compare hotels</Link></Button>
        ) : (
          <span className="text-xs text-muted">Pick at least 2 hotels</span>
        )}
      </div>
    </div>
  );
}
