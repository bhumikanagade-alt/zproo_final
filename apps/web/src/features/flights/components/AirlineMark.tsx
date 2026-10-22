import { cn } from '@zproo/ui';

/** Brand-neutral airline tile (two-letter code on a colour derived from it). */
const PALETTE = [
  '#d9141e',
  '#0f766e',
  '#1d4ed8',
  '#b45309',
  '#7c3aed',
  '#be185d',
  '#0369a1',
  '#15803d',
];

export function AirlineMark({ code, className }: { code: string; className?: string }) {
  const hue = PALETTE[[...code].reduce((sum, c) => sum + c.charCodeAt(0), 0) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white',
        className,
      )}
      style={{ backgroundColor: hue }}
    >
      {code}
    </span>
  );
}
