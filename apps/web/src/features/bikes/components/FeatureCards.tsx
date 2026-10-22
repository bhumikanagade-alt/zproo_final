import { Card, CardContent } from '@zproo/ui';
import type { Feature } from '../content';

/** Icon + title + text cards (same look as the Hotels landing page feature row). */
export function FeatureCards({ items }: { items: Feature[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map(({ icon: Icon, title, text }) => (
        <Card key={title}>
          <CardContent className="flex gap-3 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
              <Icon aria-hidden className="size-5" />
            </span>
            <div>
              <p className="font-bold">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
