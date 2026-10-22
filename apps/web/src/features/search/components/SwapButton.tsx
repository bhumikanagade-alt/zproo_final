import { cn } from '@zproo/ui';
import { ArrowLeftRight } from 'lucide-react';

/** Circular swap control placed between From and To fields. */
export function SwapButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Swap origin and destination"
      className={cn(
        'z-10 grid size-10 place-items-center rounded-full border border-border bg-card text-primary shadow-sm transition-transform hover:rotate-180 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <ArrowLeftRight aria-hidden className="size-4" />
    </button>
  );
}
