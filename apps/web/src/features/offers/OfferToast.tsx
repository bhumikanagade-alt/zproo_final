import { Check } from 'lucide-react';

export function OfferToast({ code }: { code: string }) {
  return (
    <div
      className="offer-toast fixed right-5 top-5 z-[9999] flex items-center gap-3 rounded-2xl border border-green-200 bg-white px-4 py-3 shadow-[0_12px_35px_rgba(0,0,0,0.16)]"
      role="status"
      aria-live="polite"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-green-100 text-green-600">
        <Check className="size-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">Coupon copied!</p>
        <p className="text-xs text-muted">{code} copied to clipboard</p>
      </div>
    </div>
  );
}
