import { Button } from '@zproo/ui';
import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <Seo title="Page not found" noIndex />
      <span className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary-light text-primary">
        <Compass aria-hidden className="size-7" />
      </span>
      <p className="text-sm font-bold uppercase tracking-widest text-primary">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">This page took a wrong turn</h1>
      <p className="mt-3 text-muted">The page you are looking for doesn't exist or has moved.</p>
      <Button asChild className="mt-8">
        <Link to="/">Back to home</Link>
      </Button>
    </section>
  );
}
