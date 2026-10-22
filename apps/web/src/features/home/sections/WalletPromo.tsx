import { Button } from '@zproo/ui';
import { ArrowRight, BadgePercent, RotateCcw, Zap } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { Section } from './SectionHeader';

const PERKS = [
  {
    icon: Zap,
    title: 'One-tap payments',
    text: 'Pay for any booking without re-entering card details.',
  },
  {
    icon: RotateCcw,
    title: 'Instant refunds',
    text: 'Cancellations credited to your wallet immediately.',
  },
  { icon: BadgePercent, title: 'Cashback', text: 'Earn cashback on flights, buses and hotels.' },
];

export function WalletPromo() {
  return (
    <Section id="wallet-title">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-primary px-6 py-10 text-primary-foreground sm:px-10 lg:px-14 lg:py-14">
        <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10" />
        <div
          aria-hidden
          className="absolute -bottom-32 left-1/3 size-96 rounded-full bg-black/10"
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">ZPROO Wallet</p>
            <h2
              id="wallet-title"
              className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl"
            >
              Your travel money, one tap away
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {PERKS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span>
                    <span className="block font-bold">{title}</span>
                    <span className="block text-sm text-white">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8 bg-white text-primary hover:bg-white/90">
              <Link to="/wallet">
                Open ZPROO Wallet <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          {/* Illustrative wallet card (decorative). */}
          <div
            aria-hidden
            className="mx-auto w-full max-w-sm rotate-[-4deg] rounded-3xl bg-white p-6 text-foreground shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <Logo height={24} />
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-bold text-green-800">
                Active
              </span>
            </div>
            <p className="mt-6 text-xs font-semibold text-muted">Wallet balance</p>
            <p className="text-4xl font-extrabold tracking-tight">₹2,450</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold">
              {['+ ₹500', '+ ₹1,000', '+ ₹2,000'].map((amount) => (
                <span key={amount} className="rounded-xl border border-border py-2">
                  {amount}
                </span>
              ))}
            </div>
            <span className="mt-4 block rounded-full bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground">
              Add Money
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}
