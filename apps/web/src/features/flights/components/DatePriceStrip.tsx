import type { PaxCounts } from '@zproo/types';
import type { FlightSearch } from '@zproo/validation';
import { Button, cn } from '@zproo/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useDatePrices } from '../api';
import { inr, localDay } from '../format';
import { stripDates } from '../searchDates';

interface DatePriceStripProps {
  from: string;
  to: string;
  /** The date being shown. */
  date: string;
  /** Earliest / latest date this flight can move to. */
  min: string;
  max: string;
  pax: PaxCounts;
  cabin: FlightSearch['cabin'];
  onSelect: (date: string) => void;
}

/** Horizontal strip of dates with the cheapest fare for each, from the flight search API. */
export function DatePriceStrip({
  from,
  to,
  date,
  min,
  max,
  pax,
  cabin,
  onSelect,
}: DatePriceStripProps) {
  const [shift, setShift] = useState(0);
  const dates = stripDates(date, min, max, 7, shift);
  const prices = useDatePrices({ from, to }, dates, pax, cabin);
  const cheapest = Math.min(...prices.flatMap((p) => (p.paise === null ? [] : [p.paise])));
  const first = dates[0];
  const last = dates.at(-1);

  return (
    <section
      aria-label="Fares by date"
      className="flex items-stretch gap-1 rounded-2xl border border-border bg-card p-2 shadow-card"
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-auto shrink-0 px-1.5"
        disabled={!first || first <= min}
        onClick={() => setShift((s) => s - 7)}
        aria-label="Earlier dates"
      >
        <ChevronLeft aria-hidden />
      </Button>
      <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {dates.map((d, i) => {
          const paise = prices[i]?.paise ?? null;
          const loading = prices[i]?.loading ?? false;
          const active = d === date;
          return (
            <li key={d} className="min-w-[6.25rem] flex-1">
              <button
                type="button"
                onClick={() => onSelect(d)}
                aria-pressed={active}
                aria-label={`${localDay(`${d}T00:00:00Z`, 'UTC')}, ${
                  paise !== null ? inr(paise) : 'no fares'
                }`}
                className={cn(
                  'w-full cursor-pointer rounded-xl border px-2 py-2 text-center transition-colors',
                  active
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-border hover:border-foreground/30',
                )}
              >
                <span className="block whitespace-nowrap text-xs font-semibold">
                  {localDay(`${d}T00:00:00Z`, 'UTC')}
                </span>
                <span
                  className={cn(
                    'block text-sm font-extrabold tabular-nums',
                    paise !== null && paise === cheapest && !active && 'text-success',
                  )}
                >
                  {loading ? '…' : paise !== null ? inr(paise) : '—'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto shrink-0 px-1.5"
        disabled={!last || last >= max}
        onClick={() => setShift((s) => s + 7)}
        aria-label="Later dates"
      >
        <ChevronRight aria-hidden />
      </Button>
    </section>
  );
}
