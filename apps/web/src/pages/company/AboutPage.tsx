import { BRAND } from '@zproo/config';
import { Button } from '@zproo/ui';
import { ArrowRight, BadgePercent, Headset, Layers, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { Seo } from '@/components/seo/Seo';
import { SERVICES } from '@/config/services';

const VALUES = [
  {
    icon: Layers,
    title: 'One app, every journey',
    text: 'Long-distance travel and the daily commute, with one account, one wallet and one place for every ticket.',
  },
  {
    icon: BadgePercent,
    title: 'Honest prices',
    text: 'Taxes and fees shown upfront. No surge pricing on rides.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe by design',
    text: 'Secure payments, verified partners, and privacy built into how we handle your data.',
  },
  {
    icon: Headset,
    title: 'Help that helps',
    text: 'Round-the-clock support from people who can actually fix things.',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <Seo
        title="About us"
        description={`${BRAND.name} is a unified mobility and travel super app: ${BRAND.tagline}`}
      />
      <Logo height={44} />
      <h1 className="mt-6 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">
        Travel is more than a ticket. It's the whole journey.
      </h1>
      <p className="mt-5 max-w-3xl text-lg text-muted">
        {BRAND.name} brings flights, buses, trains, hotels, cabs, bike rentals, holidays and parcel
        delivery together, so getting from here to anywhere takes one app
        instead of eight.
      </p>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {VALUES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-card border border-border bg-card p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-primary-light text-primary">
              <Icon aria-hidden className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-bold">{title}</h2>
            <p className="mt-1 text-muted">{text}</p>
          </li>
        ))}
      </ul>
      <section aria-labelledby="about-services" className="mt-14">
        <h2 id="about-services" className="text-2xl font-extrabold">
          What you can do with {BRAND.name}
        </h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {SERVICES.map(({ type, label, path, icon: Icon }) => (
            <li key={type}>
              <Link
                to={path}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:border-primary/40 hover:text-primary"
              >
                <Icon aria-hidden className="size-4" /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Button asChild size="lg" className="mt-12">
        <Link to="/">
          Start your journey <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
