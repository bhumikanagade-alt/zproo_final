import { cn } from '@zproo/ui';
import { Logo } from '@/components/brand/Logo';

/** Loading state for lazily loaded pages. `fullscreen` doubles as the app splash. */
export function PageLoader({ fullscreen = false }: { fullscreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-5',
        fullscreen ? 'min-h-dvh bg-card' : 'min-h-[50vh]',
      )}
    >
      {fullscreen && <Logo height={48} priority />}
      <span
        aria-hidden
        className="size-7 animate-spin rounded-full border-[3px] border-primary-light border-t-primary"
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
