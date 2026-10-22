import { cn } from '@zproo/ui';
import { CircleAlert, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export function FormAlert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success';
  children: ReactNode;
}) {
  const Icon = tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium',
        tone === 'error' ? 'bg-danger/8 text-danger' : 'bg-success/10 text-success',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
