import { useNavigate } from 'react-router';
import { useState } from 'react';
import { authApi } from '../api';
import { useAuthStore } from '../store';
import { errorMessage } from '../errors';
import { FormAlert } from './FormAlert';
import { GoogleSignInButton } from './GoogleSignInButton';

/** Google sign-in block. The option stays visible even when the Google client ID is missing,
 * so configuration problems are visible instead of silently removing the option. */
export function SocialSignIn({ next }: { next: string }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const onGoogle = async (idToken: string) => {
    setError(undefined);
    try {
      useAuthStore.getState().setSession(await authApi.social('google', idToken));
      void navigate(next, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {error && <FormAlert>{error}</FormAlert>}

      <GoogleSignInButton
        onCredential={(token) => void onGoogle(token)}
        onUnavailable={() =>
          setError('Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to the web app environment and restart the dev server.')
        }
      />

      {!googleConfigured && (
        <p className="text-center text-[11px] leading-4 text-slate-400">
          Google sign-in is shown here, but it must be configured with{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-500">
            VITE_GOOGLE_CLIENT_ID
          </code>{' '}
          before it can authenticate.
        </p>
      )}
    </div>
  );
}
