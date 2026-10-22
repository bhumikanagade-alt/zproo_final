import { Label } from '@zproo/ui';
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  /** A single input element; receives id, aria-invalid and aria-describedby. */
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
  action?: ReactNode;
}

/** Label + control + hint/error, wired together for screen readers. */
export function FormField({ label, error, hint, children, action }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': Boolean(error) || undefined,
        ...((error || hint) && { 'aria-describedby': messageId }),
      })
    : children;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {control}
      {error ? (
        <p id={messageId} className="text-xs font-semibold text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
