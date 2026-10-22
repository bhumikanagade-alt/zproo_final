import { Button } from '@zproo/ui';
import { RefreshCw } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { Seo } from '@/components/seo/Seo';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** Router error boundary: 404s get the not-found page, anything else a recoverable error screen. */
export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Seo title="Something went wrong" noIndex />
      <Logo height={40} />
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted">
          We hit an unexpected problem loading this page. Please try again — your bookings are safe.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden /> Try again
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Go to home</Link>
        </Button>
      </div>
    </main>
  );
}
