import { env } from '@/lib/env';

/** Shown only when codes aren't really sent (development SMS provider, or the static demo). */
export function DevCodeHint({ code }: { code?: string | undefined }) {
  if (!code) return null;
  return (
    <p className="rounded-xl border border-dashed border-warning/60 bg-warning/10 px-3 py-2 text-center text-xs text-amber-800">
      {env.staticMode ? 'Demo mode' : 'Development mode'} — your code is{' '}
      <strong className="font-mono text-sm tracking-widest">{code}</strong>
    </p>
  );
}
