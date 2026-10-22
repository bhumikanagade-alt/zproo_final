import { BadgePercent, Headset, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { AuthModeSwitch } from '@/features/auth/components/AuthModeSwitch';
import { SocialSignIn } from '@/features/auth/components/SocialSignIn';
import { safeNext } from '@/features/auth/redirect';
import { OtpLoginForm } from './LoginPage';

const PERKS = [
  { icon: BadgePercent, text: 'Member-only offers and cashback' },
  { icon: ShieldCheck, text: 'Secure payments and instant refunds to wallet' },
  { icon: Headset, text: '24×7 help for every booking' },
];

export default function SignupPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  return (
    <>
      <Seo title="Sign up" description="Create your ZPROO GO account with your mobile number." />
      <AuthHeader
        title="Create your account"
        subtitle="Flights, buses, trains, hotels, cabs and more — in one app"
      />
      <AuthModeSwitch />
      <OtpLoginForm next={next} submitLabel="Continue" />
      <ul className="mt-6 space-y-2.5 text-sm text-foreground/80">
        {PERKS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5">
            <Icon aria-hidden className="size-4 text-primary" /> {text}
          </li>
        ))}
      </ul>
      <SocialSignIn next={next} />
      <p className="mt-8 text-center text-xs text-muted">
        By signing up you agree to our{' '}
        <Link to="/terms" className="font-semibold text-foreground hover:text-primary">
          Terms
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="font-semibold text-foreground hover:text-primary">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}
