import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@zproo/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';
import type { z } from 'zod';
import { Seo } from '@/components/seo/Seo';
import { authApi } from '@/features/auth/api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { DevCodeHint } from '@/features/auth/components/DevCodeHint';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { ResendCountdown } from '@/features/auth/components/ResendCountdown';
import { errorMessage } from '@/features/auth/errors';
import { useAuthFlow } from '@/features/auth/flowStore';
import { maskPhone } from '@/features/auth/redirect';
import { profileFormSchema } from '@/features/auth/schemas';
import { useAuthStore } from '@/features/auth/store';

export default function VerifyOtpPage() {
  const otp = useAuthFlow((s) => s.otp);
  const signup = useAuthFlow((s) => s.signup);
  if (signup) return <CompleteProfile />;
  if (!otp) return <Navigate to="/login" replace />;
  return <VerifyCode />;
}

function VerifyCode() {
  const navigate = useNavigate();
  const flow = useAuthFlow();
  const otp = flow.otp as NonNullable<typeof flow.otp>;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);

  const verify = async (value = code) => {
    if (value.length !== 6 || pending) return;
    setError(undefined);
    setPending(true);
    try {
      const result = await authApi.verifyOtp(otp.phone, value);
      if (result.status === 'AUTHENTICATED') {
        useAuthStore.getState().setSession(result);
        // The flow is not cleared here: the router renders navigations in a transition, and
        // clearing now would re-render this page without its flow before it unmounts.
        void navigate(otp.next, { replace: true });
      } else {
        flow.startSignup(result.phone, result.signupToken, otp.next);
      }
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    setError(undefined);
    setResending(true);
    try {
      flow.startOtp(otp.phone, otp.next, await authApi.sendOtp(otp.phone));
      setCode('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Seo title="Verify OTP" noIndex />
      <AuthHeader
        title="Verify OTP"
        subtitle={
          <>
            Enter the 6-digit code sent to{' '}
            <strong className="text-foreground">{maskPhone(otp.phone)}</strong>{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Change
            </Link>
          </>
        }
      />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        {error && <FormAlert>{error}</FormAlert>}
        <FormField label="One-time code">
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={(v) => void verify(v)}
            disabled={pending}
            focusOnMount
          />
        </FormField>
        <DevCodeHint code={otp.devCode} />
        <Button type="submit" size="lg" className="w-full" disabled={pending || code.length !== 6}>
          {pending ? 'Verifying…' : 'Verify'}
        </Button>
        <ResendCountdown
          availableAt={otp.resendAt}
          onResend={() => void resend()}
          pending={resending}
        />
      </form>
    </>
  );
}

function CompleteProfile() {
  const navigate = useNavigate();
  const flow = useAuthFlow();
  const signup = flow.signup as NonNullable<typeof flow.signup>;
  const signupDraft = flow.signupDraft;
  const [error, setError] = useState<string>();
  const form = useForm<
    z.input<typeof profileFormSchema>,
    unknown,
    z.output<typeof profileFormSchema>
  >({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: signupDraft?.fullName ?? '',
      email: signupDraft?.email ?? '',
      password: signupDraft?.password ?? '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(undefined);
    try {
      const session = await authApi.register({ signupToken: signup.signupToken, ...values });
      useAuthStore.getState().setSession(session);
      flow.clear();
      void navigate(signup.next, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const { errors } = form.formState;
  return (
    <>
      <Seo title="Complete your profile" noIndex />
      <AuthHeader
        title="Almost there"
        subtitle={
          <>
            <strong className="text-foreground">{maskPhone(signup.phone)}</strong> is verified. Tell
            us your name to create your account.
          </>
        }
      />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <FormField
          label="Full name"
          error={errors.fullName?.message}
          hint="As on your ID — used for tickets"
        >
          <Input
            className="h-12"
            autoComplete="name"
            placeholder="e.g. Amit Sharma"
            {...form.register('fullName')}
          />
        </FormField>
        <FormField
          label="Email (optional)"
          error={errors.email?.message}
          hint="For tickets and invoices"
        >
          <Input
            className="h-12"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...form.register('email')}
          />
        </FormField>
        <FormField
          label="Password (optional)"
          error={errors.password?.message}
          hint="Add one to also log in with a password. At least 8 characters with letters and numbers."
        >
          <PasswordInput
            autoComplete="new-password"
            placeholder="Create a password"
            {...form.register('password')}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </>
  );
}
