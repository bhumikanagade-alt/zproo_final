import { Button } from '@zproo/ui';
import { ArrowLeft, Bus, PlaneTakeoff, TrainFront } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { BookingSteps } from './BookingSteps';
import { BookingTimer } from './BookingTimer';
import type { CheckoutService } from './steps';

/** Layout for the checkout steps: progress, title, main column and a sticky summary column. */
export function CheckoutShell({
  step,
  service = 'flight',
  title,
  back,
  aside,
  children,
}: {
  step: number;
  service?: CheckoutService;
  title: string;
  back?: { to: string; label: string };
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Seo title={title} noIndex />
      <BookingSteps current={step} service={service} />
      <div className="mt-3 max-w-sm"><BookingTimer compact /></div>
      {back && (
        <Link
          to={back.to}
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> {back.label}
        </Link>
      )}
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">{children}</div>
        {aside && (
          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:self-start">
            {aside}
          </aside>
        )}
      </div>
    </div>
  );
}

const NOTHING = {
  flight: {
    icon: PlaneTakeoff,
    title: 'No flight selected',
    text: 'Search for flights and choose a fare to continue booking.',
    to: '/flights',
    cta: 'Search flights',
  },
  bus: {
    icon: Bus,
    title: 'No bus selected',
    text: 'Search for buses and pick your seats to continue booking.',
    to: '/buses',
    cta: 'Search buses',
  },
  train: {
    icon: TrainFront,
    title: 'No train selected',
    text: 'Search for trains and choose a class to continue booking.',
    to: '/trains',
    cta: 'Search trains',
  },
} as const;

/** Shown when a checkout step is opened with nothing chosen (new tab, cleared storage). */
export function NothingSelected({ service = 'flight' }: { service?: CheckoutService }) {
  const { icon: Icon, title, text, to, cta } = NOTHING[service];
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      <Seo title={title} noIndex />
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-light text-primary">
        <Icon aria-hidden className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 text-muted">{text}</p>
      <Button asChild className="mt-6">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}
