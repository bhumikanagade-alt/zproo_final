import type { TrainAvailability } from '@zproo/types';
import { Badge, cn } from '@zproo/ui';
import { CircleCheck, CircleSlash, Clock3, Users } from 'lucide-react';
import { availabilityTone, availabilityWords } from '../format';

const ICON = {
  AVAILABLE: CircleCheck,
  RAC: Users,
  WAITLIST: Clock3,
  REGRET: CircleSlash,
  NOT_AVAILABLE: CircleSlash,
  BOOKING_CLOSED: Clock3,
} as const;

/** Provider label ("GNWL 12") plus plain words and an icon — meaning never relies on colour. */
export function AvailabilityBadge({
  availability,
  showWords = true,
  className,
}: {
  availability: Pick<TrainAvailability, 'status' | 'label'>;
  showWords?: boolean;
  className?: string;
}) {
  const Icon = ICON[availability.status];
  return (
    <Badge variant={availabilityTone(availability)} className={cn('gap-1', className)}>
      <Icon aria-hidden className="size-3" />
      <span className="font-bold tabular-nums">{availability.label}</span>
      {showWords && availability.status !== 'AVAILABLE' && (
        <span className="font-medium">· {availabilityWords(availability)}</span>
      )}
    </Badge>
  );
}
