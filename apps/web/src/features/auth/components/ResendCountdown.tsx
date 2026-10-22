import { Button } from '@zproo/ui';
import { useCountdown } from '@/hooks/useCountdown';

interface ResendCountdownProps {
  availableAt: number;
  onResend: () => void;
  pending?: boolean;
}

export function ResendCountdown({ availableAt, onResend, pending }: ResendCountdownProps) {
  const seconds = useCountdown(availableAt);
  if (seconds > 0) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return (
      <p className="text-center text-sm text-muted" aria-live="polite">
        Resend OTP in{' '}
        <span className="font-bold tabular-nums text-foreground">
          {mm}:{ss}
        </span>
      </p>
    );
  }
  return (
    <p className="text-center text-sm text-muted">
      Didn't get it?{' '}
      <Button
        type="button"
        variant="link"
        className="h-auto p-0"
        onClick={onResend}
        disabled={pending}
      >
        {pending ? 'Sending…' : 'Resend OTP'}
      </Button>
    </p>
  );
}
