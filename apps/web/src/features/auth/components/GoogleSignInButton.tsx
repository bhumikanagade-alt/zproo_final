import { useEffect, useRef, useState } from 'react';

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | undefined;

function loadGoogleScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google sign-in failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in failed to load'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Google Identity Services button.
 * The real Google button is rendered when VITE_GOOGLE_CLIENT_ID is configured.
 * A visible fallback is rendered otherwise, so the login/signup UI never silently loses
 * the Google option.
 */
export function GoogleSignInButton({
  onCredential,
  onUnavailable,
}: {
  onCredential: (idToken: string) => void;
  onUnavailable?: () => void;
}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoadError(false);

    loadGoogleScript()
      .then(() => {
        const google = window.google;
        const element = container.current;
        if (cancelled || !google || !element) return;

        element.innerHTML = '';
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callback.current(response.credential),
        });
        google.accounts.id.renderButton(element, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: Math.min(element.offsetWidth || 400, 470),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId || loadError) {
    return (
      <button
        type="button"
        onClick={onUnavailable}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 opacity-100 shadow-sm"
        title="Configure VITE_GOOGLE_CLIENT_ID to enable Google sign-in"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-sm font-bold">
          G
        </span>
        Continue with Google
      </button>
    );
  }

  return <div ref={container} className="flex min-h-12 w-full justify-center overflow-hidden" />;
}
