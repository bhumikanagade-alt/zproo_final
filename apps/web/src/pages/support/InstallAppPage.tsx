import { Button } from '@zproo/ui';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';

/** /install-app: the mobile app is not released yet, so say so positively instead of redirecting. */
export default function InstallAppPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <Seo title="Install the ZPROO GO app" description="The ZPROO GO app is coming soon." />
      <span className="grid size-16 place-items-center rounded-2xl bg-primary-light text-primary">
        <Smartphone aria-hidden className="size-8" />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
        The ZPROO GO app is coming soon. Stay tuned for updates!
      </h1>
      <p className="mt-3 text-base text-muted">
        Until then, you can book buses, flights, trains, hotels and cabs right here on the website.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/buses">Book a bus</Link>
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
