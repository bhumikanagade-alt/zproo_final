import { FlaskConical } from 'lucide-react';

const WHAT = {
  flight: 'Flights, airlines',
  bus: 'Buses, operators',
  train: 'Trains, timetables, availability, PNRs',
} as const;

/** Shown whenever results come from a development provider rather than real inventory. */
export function DemoBanner({ service = 'flight' }: { service?: keyof typeof WHAT }) {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-amber-900"
    >
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <strong>Demo inventory.</strong> {WHAT[service]} and payments here are simulated for testing
        — no real tickets are issued and no money is charged.
      </span>
    </p>
  );
}
