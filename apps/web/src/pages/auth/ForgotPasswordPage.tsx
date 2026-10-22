import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@zproo/ui';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { z } from 'zod';
import { Seo } from '@/components/seo/Seo';
import { authApi } from '@/features/auth/api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { errorMessage } from '@/features/auth/errors';
import { useAuthFlow } from '@/features/auth/flowStore';
import { forgotFormSchema } from '@/features/auth/schemas';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const startReset = useAuthFlow((s) => s.startReset);
  const [error, setError] = useState<string>();
  const form = useForm<
    z.input<typeof forgotFormSchema>,
    unknown,
    z.output<typeof forgotFormSchema>
  >({
    resolver: zodResolver(forgotFormSchema),
    defaultValues: { identifier: '' },
  });

  const onSubmit = form.handleSubmit(async ({ identifier }) => {
    setError(undefined);
    try {
      startReset(identifier.value, await authApi.forgotPassword(identifier.value));
      void navigate('/reset-password');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <>
      <Seo title="Forgot password" description="Reset your ZPROO GO password." />
      <AuthHeader
        title="Forgot password?"
        subtitle="Enter your mobile number or email and we'll send you a reset code."
      />
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
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Sending…' : 'Send reset code'}
        </Button>
      </form>
      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to login
      </Link>
    </>
  );
}
