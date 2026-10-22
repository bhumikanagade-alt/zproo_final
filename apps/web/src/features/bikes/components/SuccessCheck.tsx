/**
 * Green "success" check for the booking confirmation: a soft ring pulses, the circle draws itself
 * and the tick follows. Pure CSS (see globals.css); with reduced motion it just shows the final tick.
 */
export function SuccessCheck({ className = 'size-24' }: { className?: string }) {
  return (
    <span className={`bike-check-pop relative inline-grid place-items-center rounded-full bg-success/10 text-success ${className}`} aria-hidden>
      <span className="bike-check-ring absolute inset-0 rounded-full bg-success/30" />
      <svg viewBox="0 0 52 52" className="relative size-[70%]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle className="bike-check-circle" cx="26" cy="26" r="24" strokeWidth="3" />
        <path className="bike-check-mark" d="M15 27l8 8 15-17" strokeWidth="4" />
      </svg>
    </span>
  );
}
