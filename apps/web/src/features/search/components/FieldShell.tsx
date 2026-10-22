import { cn } from '@zproo/ui';
import type { ReactNode } from 'react';

interface FieldShellProps {
  id: string;
  label: string;
  icon?: ReactNode;
  error?: string | undefined;
  className?: string;
  children: ReactNode;
}

/** Large tappable field card used across the search forms: small label above, big value below. */
export function FieldShell({ id, label, icon, error, className, children }: FieldShellProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div
        className={cn(
          'relative flex h-full min-h-[4.25rem] items-start gap-3 rounded-2xl border bg-card px-4 py-2.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20 hover:border-foreground/25',
          error ? 'border-danger' : 'border-border',
        )}
      >
        {icon && <span className="mt-5 text-primary [&_svg]:size-5">{icon}</span>}
        <div className="min-w-0 flex-1">
          <label
            htmlFor={id}
            className="block text-[11px] font-bold uppercase tracking-wider text-muted"
          >
            {label}
          </label>
          {children}
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 px-1 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
