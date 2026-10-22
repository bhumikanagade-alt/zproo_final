import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 8,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-4 text-foreground shadow-raised animate-fade-in focus:outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
