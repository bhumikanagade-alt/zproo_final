import { ChevronDown } from 'lucide-react';
import type { Faq } from '../content';

/** Native <details> accordion: keyboard and screen-reader friendly with no extra JS. */
export function FaqList({ items }: { items: readonly Faq[] }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
            {f.q}
            <ChevronDown aria-hidden className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-sm text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
