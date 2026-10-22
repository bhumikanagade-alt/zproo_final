import { Check } from 'lucide-react';
import { inr, localTime, travellersLabel } from '../format';
import { selectionTotalPaise, type FareSelection } from '../fareSelection';

/** Where the flight flow ends: shows the saved fare(s). Deliberately has no onward action. */
export function SelectedFaresBar({ selection }: { selection: FareSelection }) {
  const chosen = Object.values(selection.selected).sort((a, b) => a.legIndex - b.legIndex);
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-30 border-t border-border bg-card/95 backdrop-blur lg:bottom-0"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <ul className="min-w-0 space-y-0.5 text-sm">
          {chosen.map((s) => (
            <li key={s.legIndex} className="flex items-center gap-2">
              <Check aria-hidden className="size-4 shrink-0 text-success" />
              <span className="min-w-0 truncate">
                <span className="font-semibold">
                  {s.route.from} → {s.route.to}
                </span>{' '}
                · {s.offer.flightNumber} · {localTime(s.offer.departureAt, s.offer.from.timezone)} ·{' '}
                {s.fare.name} · {inr(s.fare.pricePaise)}
              </span>
            </li>
          ))}
        </ul>
        <div className="text-right">
          <p className="text-xs text-muted">Fare saved · {travellersLabel(selection.pax)}</p>
          <p className="text-xl font-extrabold tabular-nums">{inr(selectionTotalPaise(selection))}</p>
        </div>
      </div>
    </div>
  );
}
