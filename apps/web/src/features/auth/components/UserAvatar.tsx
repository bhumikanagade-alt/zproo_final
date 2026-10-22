import { cn } from '@zproo/ui';
import { initials } from '../initials';

export function UserAvatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={style}
        className={cn('rounded-full object-cover', className)}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-primary-light font-bold text-primary',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
