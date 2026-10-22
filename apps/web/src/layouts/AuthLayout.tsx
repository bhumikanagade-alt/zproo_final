import { BRAND } from '@zproo/config';
import { BadgePercent, Headset, ShieldCheck } from 'lucide-react';
import { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { PageLoader } from '@/components/feedback/PageLoader';

const HIGHLIGHTS = [
  { icon: BadgePercent, text: 'No surge pricing and exclusive member offers' },
  { icon: ShieldCheck, text: 'Secure payments with UPI, cards and wallet' },
  { icon: Headset, text: '24×7 support for every booking' },
];

/** Login, signup and OTP screens: brand panel on desktop, focused single column on mobile. */
export function AuthLayout() {
  const { pathname } = useLocation();
  if (pathname === '/login' || pathname === '/signup') return <Outlet />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-black/10"
        />
        <Link to="/" aria-label="ZPROO GO home" className="relative self-start">
          <Logo height={40} surface="plate" priority />
        </Link>
        <div className="relative max-w-md space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight">
            Travel Smarter.
            <br />
            Go Further.
          </h2>
          <ul className="space-y-3 text-base text-white">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon aria-hidden className="size-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white">{BRAND.description}</p>
      </aside>
      <main id="main" className="flex flex-col bg-card px-5 py-8 sm:px-10">
        <Link to="/" aria-label="ZPROO GO home" className="self-center lg:hidden">
          <Logo height={40} priority />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
