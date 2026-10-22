import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function Label({ className, ...props }: ComponentProps<'label'>) {
  // eslint-disable-next-line jsx-a11y/label-has-associated-control -- htmlFor is passed by callers
  return <label className={cn('text-xs font-semibold text-muted', className)} {...props} />;
}
