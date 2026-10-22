import { BRAND } from '@zproo/config';
import { BadgePercent, Headset, ShieldCheck, Zap } from 'lucide-react';
import { Section, SectionHeader } from './SectionHeader';

const PROMISES = [
  {
    icon: BadgePercent,
    title: 'No surge pricing',
    text: 'Transparent fares with taxes shown upfront.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure payments',
    text: 'UPI, cards, net banking and ZPROO Wallet.',
  },
  { icon: Zap, title: 'Fast & reliable', text: 'Book any trip in a few taps.' },
  { icon: Headset, title: '24×7 support', text: 'Real help whenever plans change.' },
];

export function WhyUs() {
  return (
    <Section id="why-title">
      <SectionHeader id="why-title" title={`Why travellers choose ${BRAND.name}`} />
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {PROMISES.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 sm:flex-row sm:p-5"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
              <Icon aria-hidden className="size-5" />
            </span>
            <div>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
