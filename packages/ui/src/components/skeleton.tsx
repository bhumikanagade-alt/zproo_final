import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-xl bg-border/60', className)}
      {...props}
    />
  );
}
