import { Skeleton } from '@zproo/ui';

/** Same footprint as the loaded widget (flight form) so nothing jumps when it arrives. */
export function SearchWidgetSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading search"
      className="rounded-[1.75rem] border border-border bg-card shadow-raised"
    >
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.15fr_1.15fr_0.85fr_0.85fr_1fr]">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[4.25rem] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-full lg:mx-auto lg:w-72" />
      </div>
    </div>
  );
}
