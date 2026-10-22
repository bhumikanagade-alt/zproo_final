import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function Overlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] animate-fade-in',
        className,
      )}
      {...props}
    />
  );
}

function CloseButton() {
  return (
    <DialogPrimitive.Close
      className="absolute right-4 top-4 rounded-full p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Close"
    >
      <X className="size-5" aria-hidden />
    </DialogPrimitive.Close>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-card border border-border bg-card p-6 shadow-xl animate-pop-in focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <CloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const Sheet = DialogPrimitive.Root;

/** Full-height panel sliding in from the right — used for the mobile menu. */
export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm flex-col overflow-y-auto bg-card shadow-xl animate-slide-in-right focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <CloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-bold', className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted', className)} {...props} />;
}
