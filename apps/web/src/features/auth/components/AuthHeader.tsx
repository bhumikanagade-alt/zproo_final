import type { ReactNode } from 'react';

export function AuthHeader({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <header className="mb-7 space-y-1.5 text-center lg:text-left">
      <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight">{title}</h1>
      <p className="text-sm text-muted">{subtitle}</p>
    </header>
  );
}
