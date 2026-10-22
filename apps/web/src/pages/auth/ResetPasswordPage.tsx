import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@zproo/ui';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { resetFormSchema } from '@/features/auth/schemas';

export default function ResetPasswordPage() {
  const reset = useAuthFlow((s) => s.reset);
  if (!reset) return <Navigate to="/forgot-password" replace />;
  return <ResetForm reset={reset} />;
}

function ResetForm({
  reset,
}: {
  reset: NonNullable<ReturnType<typeof useAuthFlow.getState>['reset']>;
}) {
  const navigate = useNavigate();
  const flow = useAuthFlow();
  const [error, setError] = useState<string>();
  const [resending, setResending] = useState(false);
  const form = useForm<z.input<typeof resetFormSchema>, unknown, z.output<typeof resetFormSchema>>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  });
  const otp = useWatch({ control: form.control, name: 'otp' });
  const target = reset.identifier.startsWith('+91')
    ? maskPhone(reset.identifier)
    : reset.identifier;

  const onSubmit = form.handleSubmit(async ({ otp: code, newPassword }) => {
    setError(undefined);
    try {
      await authApi.resetPassword(reset.identifier, code, newPassword);
      void navigate('/login', {
        replace: true,
        state: { notice: 'Password updated. Log in with your new password.' },
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const resend = async () => {
    setResending(true);
    setError(undefined);
    try {
      flow.startReset(reset.identifier, await authApi.forgotPassword(reset.identifier));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setResending(false);
    }
  };

  const { errors } = form.formState;
  return (
    <>
      <Seo title="Reset password" noIndex />
      <AuthHeader
        title="Reset password"
        subtitle={
          <>
            If an account exists for <strong className="text-foreground">{target}</strong>, we've
            sent a 6-digit code.
          </>
        }
      />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <FormField label="Reset code" error={errors.otp?.message}>
          <OtpInput
            value={otp}
            onChange={(value) =>
              form.setValue('otp', value, { shouldValidate: form.formState.isSubmitted })
            }
            focusOnMount
          />
        </FormField>
        <DevCodeHint code={reset.devCode} />
        <FormField
          label="New password"
          error={errors.newPassword?.message}
          hint="At least 8 characters with letters and numbers"
        >
          <PasswordInput autoComplete="new-password" {...form.register('newPassword')} />
        </FormField>
        <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...form.register('confirmPassword')} />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Updating…' : 'Update password'}
        </Button>
        <ResendCountdown
          availableAt={reset.resendAt}
          onResend={() => void resend()}
          pending={resending}
        />
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </>
  );
}
