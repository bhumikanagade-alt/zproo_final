import { ChevronDown } from 'lucide-react';
import type { Hotel } from '../data';
import { faqFor, policiesFor } from '../extras';

/** Check-in, ID, children, pets and house rules. */
export function PoliciesSection({ hotel }: { hotel: Hotel }) {
  return (
    <section aria-labelledby="policies-heading" className="mt-7">
      <h2 id="policies-heading" className="text-lg font-extrabold">Hotel policies</h2>
      <dl className="mt-3 divide-y divide-border rounded-xl border border-border text-sm">
        {policiesFor(hotel).map((p) => (
          <div key={p.title} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr]">
            <dt className="font-bold">{p.title}</dt>
            <dd className="text-muted">{p.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Short answers to the questions guests ask most. */
export function FaqSection({ hotel }: { hotel: Hotel }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-7">
      <h2 id="faq-heading" className="text-lg font-extrabold">Frequently asked questions</h2>
      <div className="mt-3 space-y-2">
        {faqFor(hotel).map((f) => (
          <details key={f.q} className="group rounded-xl border border-border px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold">
              {f.q}
              <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
