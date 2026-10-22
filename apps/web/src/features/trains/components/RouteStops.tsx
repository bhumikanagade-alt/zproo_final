import type { TrainStop } from '@zproo/types';

/** The stations between boarding and destination, with times and day of the run. */
export function RouteStops({ stops }: { stops: TrainStop[] }) {
  if (stops.length === 0)
    return <p className="text-sm text-muted">Route details are not available.</p>;
  const firstDay = stops[0]?.day ?? 1;
  return (
    <ol className="relative space-y-3 border-l-2 border-primary/30 pl-5 text-sm" aria-label="Route">
      {stops.map((s, i) => (
        <li key={s.code} className="relative">
          <span
            aria-hidden
            className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-primary bg-card"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-semibold">
              {s.name} <span className="text-xs font-normal text-muted">({s.code})</span>
            </p>
            <p className="tabular-nums text-muted">
              {i === 0
                ? `Dep ${s.departure}`
                : i === stops.length - 1
                  ? `Arr ${s.arrival}`
                  : `${s.arrival} – ${s.departure}`}
              {s.day > firstDay && (
                <span className="ml-1 text-xs font-bold text-primary" title="Day of the journey">
                  Day {s.day - firstDay + 1}
                </span>
              )}
            </p>
          </div>
          <p className="text-xs text-muted">{s.distanceKm - (stops[0]?.distanceKm ?? 0)} km</p>
        </li>
      ))}
    </ol>
  );
}
