import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function SectionHeader({
  id,
  title,
  subtitle,
  action,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  action?: { to: string; label: string };
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
      <div>
        <h2 id={id} className="text-xl font-extrabold tracking-tight sm:text-2xl lg:text-[1.75rem]">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {action && (
        <Link
          to={action.to}
          className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary hover:underline"
        >
          {action.label} <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  );
}

/**
 * Horizontal, swipeable row on phones (app-style) that becomes a grid from `md` up.
 * `cols` sets the desktop grid, e.g. "md:grid-cols-3 lg:grid-cols-6".
 */
export function Rail({
  cols,
  children,
  label,
}: {
  cols: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <ul
      aria-label={label}
      className={`relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:grid md:gap-5 md:overflow-visible md:px-0 md:pb-0 ${cols}`}
    >
      {children}
    </ul>
  );
}

export function Section({
  id,
  children,
  className = '',
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 ${className}`}
    >
      {children}
    </section>
  );
}
