import { cn } from '@zproo/ui';
import { Timer } from 'lucide-react';
import { useEffect } from 'react';
import { useBookingSession } from './bookingSession';
import { useCountdown } from '@/hooks/useCountdown';

export function BookingTimer({ compact = false }: { compact?: boolean }) {
  const { started, expiresAt, start } = useBookingSession();
  useEffect(() => {
    if (!started) start();
  }, [started, start]);
  const seconds = useCountdown(expiresAt ?? Date.now());
  if (!started || expiresAt === null) return null;
  const expired = seconds === 0;
  const minutes = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return (
    <div
      role="timer"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold',
        expired || seconds < 120
          ? 'border-danger/40 bg-danger/5 text-danger'
          : 'border-primary/20 bg-primary-light text-primary',
        compact && 'text-xs',
      )}
    >
      <Timer aria-hidden className="size-4 shrink-0" />
      {expired ? 'Booking time expired' : <>Booking held for <span className="tabular-nums">{minutes}:{secs}</span></>}
    </div>
  );
}
