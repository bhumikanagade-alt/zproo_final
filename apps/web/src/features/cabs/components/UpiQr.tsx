import { cn } from '@zproo/ui';
import { Check, Copy, Smartphone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { makeQr } from '../qr';
import { buildUpiLink, UPI_PAYEE, UPI_VPA } from '../upi';
import { rupees } from '../fare';
import { focusRing } from './ui';

export function UpiQr({ amount, note }: { amount: number; note: string }) {
  const link = useMemo(() => buildUpiLink({ amount, note }), [amount, note]);
  const matrix = useMemo(() => makeQr(link), [link]);
  const [copied, setCopied] = useState(false);
  const n = matrix.length, quiet = 3, dim = n + quiet * 2;
  const path = useMemo(() => matrix.flatMap((row, y) => row.map((d, x) => (d ? `M${x + quiet} ${y + quiet}h1v1h-1z` : ''))).join(''), [matrix]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(UPI_VPA); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-light to-white">
      <div className="grid gap-5 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
        <figure className="mx-auto text-center">
          <div className="rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/5">
            <svg role="img" aria-label={`UPI QR code to pay ${rupees(amount)} to ${UPI_PAYEE}`} viewBox={`0 0 ${dim} ${dim}`} shapeRendering="crispEdges" className="size-[200px] sm:size-[220px]">
              <rect width={dim} height={dim} fill="#fff" />
              <path d={path} fill="#111" />
            </svg>
          </div>
          <figcaption className="mt-2 text-xs font-medium text-muted">Scan with any UPI app</figcaption>
        </figure>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Amount to pay</p>
            <p className="text-3xl font-bold text-primary">{rupees(amount)}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted">Pay to {UPI_PAYEE}</p>
              <p className="truncate text-sm font-semibold">{UPI_VPA}</p>
            </div>
            <button type="button" onClick={copy} aria-label="Copy UPI ID" className={cn('inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold', focusRing)}>
              {copied ? <><Check aria-hidden className="size-3.5 text-success" />Copied</> : <><Copy aria-hidden className="size-3.5" />Copy</>}
            </button>
          </div>
          <a href={link} className={cn('inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:hidden', focusRing)}>
            <Smartphone aria-hidden className="size-4" />Open UPI app
          </a>
          <ol className="list-inside list-decimal space-y-1 text-xs text-muted">
            <li>Open GPay, PhonePe, Paytm or any UPI app</li>
            <li>Scan the QR (amount is pre-filled)</li>
            <li>Pay, then tap <strong className="text-foreground">Pay &amp; confirm</strong> below</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
