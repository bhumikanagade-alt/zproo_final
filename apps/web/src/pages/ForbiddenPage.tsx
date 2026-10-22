import { Button } from '@zproo/ui';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';

export function ForbiddenPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <Seo title="Access denied" noIndex />
      <span className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary-light text-primary">
        <ShieldAlert aria-hidden className="size-7" />
      </span>
      <p className="text-sm font-bold uppercase tracking-widest text-primary">403</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
        You don't have access to this page
      </h1>
      <p className="mt-3 text-muted">
        Your account doesn't have permission to view it. If you think this is a mistake, contact
        your administrator.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Back to home</Link>
      </Button>
    </section>
  );
}
