import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        soft: 'bg-primary-light text-primary',
        success: 'bg-success/10 text-green-800',
        warning: 'bg-warning/15 text-amber-800',
        danger: 'bg-danger/10 text-danger',
        outline: 'border border-border text-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
