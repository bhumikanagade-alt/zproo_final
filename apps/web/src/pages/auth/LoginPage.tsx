import { zodResolver } from '@hookform/resolvers/zod';
import { Button, cn, Input } from '@zproo/ui';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import type { z } from 'zod';
import { Seo } from '@/components/seo/Seo';
import { authApi } from '@/features/auth/api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { AuthModeSwitch } from '@/features/auth/components/AuthModeSwitch';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { SocialSignIn } from '@/features/auth/components/SocialSignIn';
import { errorMessage } from '@/features/auth/errors';
import { useAuthFlow } from '@/features/auth/flowStore';
import { safeNext } from '@/features/auth/redirect';
import { passwordLoginFormSchema, phoneFormSchema } from '@/features/auth/schemas';
import { useAuthStore } from '@/features/auth/store';

type Method = 'otp' | 'password';

export default function LoginPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const next = safeNext(params.get('next'));
  const [method, setMethod] = useState<Method>(notice ? 'password' : 'otp');

  return (
    <>
      <Seo title="Log in" description="Log in to ZPROO GO with your mobile number or email." />
      <AuthHeader title="Welcome back" subtitle="Log in to continue your journey" />
      <AuthModeSwitch />
      {notice && (
        <div className="mb-5">
          <FormAlert tone="success">{notice}</FormAlert>
        </div>
      )}
      <div
        role="radiogroup"
        aria-label="Login method"
        className="mb-5 grid grid-cols-2 gap-2 text-sm font-semibold"
      >
        {(
          [
            ['otp', 'Mobile OTP'],
            ['password', 'Password'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={method === value}
            onClick={() => setMethod(value)}
            className={cn(
              'h-10 rounded-xl border transition-colors',
              method === value
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border text-foreground/70 hover:border-foreground/30',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {method === 'otp' ? <OtpLoginForm next={next} /> : <PasswordLoginForm next={next} />}
      <SocialSignIn next={next} />
      <p className="mt-8 text-center text-xs text-muted">
        By continuing you agree to our{' '}
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

/** Also used by the signup page: the same mobile OTP flow creates or signs into an account. */
export function OtpLoginForm({
  next,
  submitLabel = 'Get OTP',
}: {
  next: string;
  submitLabel?: string;
}) {
  const navigate = useNavigate();
  const startOtp = useAuthFlow((s) => s.startOtp);
  const [error, setError] = useState<string>();
  const form = useForm<z.input<typeof phoneFormSchema>, unknown, z.output<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: useAuthFlow.getState().otp?.phone.replace(/^\+91/, '') ?? '' },
  });

  const onSubmit = form.handleSubmit(async ({ phone }) => {
    setError(undefined);
    try {
      startOtp(phone, next, await authApi.sendOtp(phone));
      // `next` stays in the URL so every guard agrees on where the user ends up.
      void navigate(next === '/' ? '/verify-otp' : `/verify-otp?next=${encodeURIComponent(next)}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <FormAlert>{error}</FormAlert>}
      <FormField label="Mobile number" error={form.formState.errors.phone?.message}>
        <PhoneInput {...form.register('phone')} />
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Sending…' : submitLabel} <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}

function PasswordLoginForm({ next }: { next: string }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const form = useForm<
    z.input<typeof passwordLoginFormSchema>,
    unknown,
    z.output<typeof passwordLoginFormSchema>
  >({
    resolver: zodResolver(passwordLoginFormSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async ({ identifier, password }) => {
    setError(undefined);
    try {
      useAuthStore.getState().setSession(await authApi.login(identifier.value, password));
      void navigate(next, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      form.resetField('password');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <FormAlert>{error}</FormAlert>}
      <FormField label="Mobile number or email" error={form.formState.errors.identifier?.message}>
        <Input
          className="h-12"
          autoComplete="username"
          placeholder="98765 43210 or you@example.com"
          {...form.register('identifier')}
        />
      </FormField>
      <FormField
        label="Password"
        error={form.formState.errors.password?.message}
        action={
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Forgot password?
          </Link>
        }
      >
        <PasswordInput
          autoComplete="current-password"
          placeholder="Enter password"
          {...form.register('password')}
        />
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Logging in…' : 'Login'}
      </Button>
    </form>
  );
}
