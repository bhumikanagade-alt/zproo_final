import { Button } from '@zproo/ui';
import { Timer } from 'lucide-react';
import { Link } from 'react-router';
import { HOLD_MINUTES, formatCountdown, useHold } from '../hold';

interface Props {
  /** Identifies what is being held (hotel + room + dates), so a different room starts a fresh hold. */
  holdKey: string;
  roomsUrl: string;
}

/** “We're holding this price for you” with a live countdown. Expiry asks the guest to re-check the room. */
export function HoldBanner({ holdKey, roomsUrl }: Props) {
  const { seconds, expired, restart } = useHold(holdKey);
  if (expired) {
    return (
      <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm">
        <p><strong>Your price hold has ended.</strong> Prices and availability may have changed.</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={restart}>Hold again</Button>
          <Button asChild size="sm" variant="outline"><Link to={roomsUrl}>Check rooms</Link></Button>
        </div>
      </div>
    );
  }
  const urgent = seconds <= 120;
  return (
    <div role="status" aria-live="off" className={`mb-5 flex items-center gap-3 rounded-2xl border p-4 text-sm ${urgent ? 'border-danger/30 bg-danger/5' : 'border-primary/20 bg-primary-light'}`}>
      <Timer aria-hidden className={`size-5 ${urgent ? 'text-danger' : 'text-primary'}`} />
      <p>
        We’re holding this price for you for <strong>{HOLD_MINUTES} minutes</strong>. Time left:{' '}
        <strong className="tabular-nums" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds left`}>{formatCountdown(seconds)}</strong>
      </p>
    </div>
  );
}
