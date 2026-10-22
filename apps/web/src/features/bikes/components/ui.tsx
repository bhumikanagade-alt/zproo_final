import { Badge, Button, cn } from '@zproo/ui';
import { AlertTriangle, FlaskConical, SearchX } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router';
import type { AvailabilityStatus } from '../types';

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2';

export const inputClass = (error?: string) =>
  cn('h-11 w-full rounded-lg border bg-card px-3 text-[15px]', error ? 'border-danger' : 'border-border', focusRing);

export function DemoNote({ children }: { children?: ReactNode }) {
  return (
    <p role="note" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-amber-900">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        {children ?? (
          <>
            <strong>Demo.</strong> Bikes, prices and availability are sample data. Bookings are simulated, so no reservation is made and no payment is taken.
          </>
        )}
      </span>
    </p>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6', className)}>{children}</div>;
}

export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-3 text-lg font-bold">
      {children}
    </h2>
  );
}

const AVAILABILITY = {
  available: { label: 'Available', variant: 'success' },
  limited: { label: 'Limited stock', variant: 'warning' },
  unavailable: { label: 'Not available', variant: 'danger' },
} as const;

export function AvailabilityBadge({ status, unitsLeft }: { status: AvailabilityStatus; unitsLeft?: number }) {
  const a = AVAILABILITY[status];
  return (
    <Badge variant={a.variant}>
      <span aria-hidden className={cn('size-1.5 rounded-full', status === 'available' ? 'bg-success' : status === 'limited' ? 'bg-warning' : 'bg-danger')} />
      {a.label}
      {status === 'limited' && unitsLeft ? ` · ${unitsLeft} left` : ''}
    </Badge>
  );
}

interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export function TextField({ label, error, hint, className, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={inputClass(error)}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({ label, error, hint, className, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(inputClass(error), 'h-auto min-h-[88px] resize-y py-2.5')}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={inputClass(error)}
        {...props}
      >
        {children}
      </select>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shown when a request fails. Wired for the future API: `onRetry` re-runs the query. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  backTo,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  backTo?: { to: string; label: string };
}) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle aria-hidden className="size-6" />
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        {backTo && (
          <Button asChild variant="outline">
            <Link to={backTo.to}>{backTo.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-primary-light text-primary">
        <SearchX aria-hidden className="size-7" />
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
