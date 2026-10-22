import { Button, Popover, PopoverClose, PopoverContent, PopoverTrigger, cn } from '@zproo/ui';
import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';

interface PopoverFieldProps {
  label: string;
  summary: string;
  detail: string;
  icon?: ReactNode;
  error?: string | undefined;
  className?: string;
  children: ReactNode;
}

/** A field card that opens a panel (travellers, guests). */
export function PopoverField({
  label,
  summary,
  detail,
  icon,
  error,
  className,
  children,
}: PopoverFieldProps) {
  const id = useId();
  return (
    <div className={cn('min-w-0', className)}>
      <Popover>
        <PopoverTrigger
          id={id}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'flex h-full min-h-[4.25rem] w-full items-start gap-3 rounded-2xl border bg-card px-4 py-2.5 text-left transition-colors hover:border-foreground/25 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20',
            error ? 'border-danger' : 'border-border',
          )}
        >
          {icon && <span className="mt-5 text-primary [&_svg]:size-5">{icon}</span>}
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">
              {label}
            </span>
            <span className="block truncate text-base font-bold sm:text-lg">{summary}</span>
            <span className="block truncate text-xs text-muted">{detail}</span>
          </span>
          <ChevronDown aria-hidden className="mt-6 size-4 shrink-0 text-muted" />
        </PopoverTrigger>
        <PopoverContent aria-label={label}>
          {children}
          <PopoverClose asChild>
            <Button className="mt-3 w-full" size="sm">
              Done
            </Button>
          </PopoverClose>
        </PopoverContent>
      </Popover>
      {error && (
        <p id={`${id}-error`} className="mt-1 px-1 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
