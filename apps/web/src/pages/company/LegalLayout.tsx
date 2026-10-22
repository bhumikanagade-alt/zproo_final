import { FileWarning } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

interface LegalLayoutProps {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
}

/** Long-form policy page with an on-page table of contents. */
export function LegalLayout({ title, description, updated, sections }: LegalLayoutProps) {
  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Seo title={title} description={description} />
      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-muted">{description}</p>
        <p className="mt-1 text-sm text-muted">Last updated {updated}</p>
      </header>
      <div
        role="note"
        className="mt-6 flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-amber-900"
      >
        <FileWarning aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p>
          <strong>Draft for legal review.</strong> This page sets out how ZPROO GO intends to
          operate. It must be reviewed and approved by qualified counsel, and the company's legal
          details added, before the service launches.
        </p>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="lg:sticky lg:top-32 lg:self-start">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">On this page</p>
          <ol className="space-y-2 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-foreground/75 hover:text-primary">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-3xl space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-32">
              <h2 id={`${s.id}-h`} className="text-xl font-bold">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-foreground/85 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
                {s.body}
              </div>
            </section>
          ))}
          <p className="border-t border-border pt-6 text-sm text-muted">
            Questions? Visit the{' '}
            <Link to="/help" className="font-semibold text-primary hover:underline">
              Help Center
            </Link>
            .
          </p>
        </div>
      </div>
    </article>
  );
}
