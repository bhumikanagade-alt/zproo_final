import { BellRing, MapPinned, Smartphone, WifiOff } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { SERVICES } from '@/config/services';
import { Section } from './SectionHeader';

const FEATURES = [
  { icon: MapPinned, text: 'Live cab and bike tracking' },
  { icon: BellRing, text: 'Trip alerts and gate changes' },
  { icon: WifiOff, text: 'Tickets available offline' },
];

export function AppPromo() {
  return (
    <Section id="app-title">
      <div className="grid items-center gap-10 overflow-hidden rounded-[1.75rem] border border-border bg-card px-6 pt-10 sm:px-10 lg:grid-cols-2 lg:px-14 lg:pt-0">
        <div className="lg:py-14">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <Smartphone aria-hidden className="size-4" /> Mobile app
          </p>
          <h2 id="app-title" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your whole trip, in your pocket
          </h2>
          <p className="mt-3 text-muted">
            Book, pay, track and get help on the go. The ZPROO GO app is coming soon to Android and
            iOS.
          </p>
          <ul className="mt-6 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 font-semibold">
                <span className="grid size-9 place-items-center rounded-xl bg-primary-light text-primary">
                  <Icon aria-hidden className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            {['Google Play', 'App Store'].map((store) => (
              <span key={store} className="rounded-xl border border-border px-4 py-2 text-sm">
                <span className="block text-[10px] font-semibold uppercase text-muted">
                  Coming soon on
                </span>
                <span className="font-bold">{store}</span>
              </span>
            ))}
          </div>
        </div>
        {/* Phone illustration built from the real UI pieces (decorative). */}
        <div
          aria-hidden
          className="mx-auto w-64 translate-y-6 rounded-t-[2.5rem] border-[10px] border-b-0 border-foreground bg-background px-4 pt-5 shadow-2xl lg:translate-y-12"
        >
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-foreground/80" />
          <Logo height={22} />
          <p className="mt-3 text-sm font-bold">Where to next?</p>
          <div className="mt-3 grid grid-cols-3 gap-2 pb-8">
            {SERVICES.map(({ type, label, icon: Icon }) => (
              <div
                key={type}
                className="flex flex-col items-center gap-1 rounded-xl bg-card py-2.5 text-[10px] font-semibold shadow-sm"
              >
                <Icon className="size-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
