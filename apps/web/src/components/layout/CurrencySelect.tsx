// import { Currency } from '@zproo/types';
// import { cn } from '@zproo/ui';
// import { ChevronDown } from 'lucide-react';
// import { useId } from 'react';
// import { usePreferences } from '@/store/preferences';

// const LABELS: Record<Currency, string> = { INR: '₹ INR', USD: '$ USD', AED: 'AED' };
// const SUPPORTED_CURRENCIES: Currency[] = [Currency.INR];

// export function CurrencySelect({ className }: { className?: string }) {
//   const id = useId();
//   const setCurrency = usePreferences((s) => s.setCurrency);
//   return (
//     <div className={cn('relative', className)}>
//       <label htmlFor={id} className="sr-only">
//         Display currency
//       </label>
//       <select
//         id={id}
//         value="INR"
//         onChange={(e) => setCurrency(e.target.value as Currency)}
//         className="h-9 cursor-pointer appearance-none rounded-full border border-border bg-card pl-3 pr-8 text-sm font-semibold text-foreground transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
//       >
//         {SUPPORTED_CURRENCIES.map((code) => (
//           <option key={code} value={code}>
//             {LABELS[code]}
//           </option>
//         ))}
//       </select>
//       <ChevronDown
//         aria-hidden
//         className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
//       />
//     </div>
//   );
// }
