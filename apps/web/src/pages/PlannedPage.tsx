import { Badge, Button } from '@zproo/ui';
import { ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { useRouteMeta } from '@/routes/useRouteMeta';

/**
 * Placeholder for services not offered yet. Keeps every navigation link working (no 404s) and
 * is replaced route by route as services launch.
 */
export default function PlannedPage() {
  const meta = useRouteMeta();
  const title = meta?.title ?? 'Coming soon';
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <Seo title={title} description={meta?.description} noIndex />
      <span className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary-light text-primary">
        <Clock aria-hidden className="size-7" />
      </span>
      {meta && (
        <Badge variant="soft" className="mb-4">
          Coming soon
        </Badge>
      )}
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {meta?.description && <p className="mt-3 text-lg text-muted">{meta.description}</p>}
      <p className="mt-2 text-sm text-muted">
        This service isn't available yet. Flights and buses are open for booking today.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/flights">Book flights</Link>
        </Button>
        <Button asChild>
          <Link to="/buses">Book buses</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft aria-hidden /> Back to home
          </Link>
        </Button>
      </div>
    </section>
  );
}
