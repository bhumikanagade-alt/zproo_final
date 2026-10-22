import { cn } from '@zproo/ui';
import { Check } from 'lucide-react';

export const HOTEL_STEPS = ['Room', 'Guests', 'Review', 'Payment', 'Done'] as const;

/** Hotel checkout progress. `current` is the index of the active step. */
export function HotelSteps({ current }: { current: number }) {
  return (
    <ol aria-label="Booking progress" className="mb-5 flex items-center gap-2 overflow-x-auto text-xs sm:text-sm">
      {HOTEL_STEPS.map((step, i) => (
        <li key={step} aria-current={i === current ? 'step' : undefined} className="flex shrink-0 items-center gap-2">
          <span className={cn('grid size-6 place-items-center rounded-full border text-[11px] font-bold', i < current && 'border-success bg-success text-white', i === current && 'border-primary bg-primary text-primary-foreground', i > current && 'border-border text-muted')}>
            {i < current ? <Check aria-hidden className="size-3.5" /> : i + 1}
          </span>
          <span className={cn('font-semibold', i === current ? 'text-foreground' : 'text-muted')}>{step}</span>
          {i < HOTEL_STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-border sm:w-8" />}
        </li>
      ))}
    </ol>
  );
}
