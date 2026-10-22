import { cn } from '@zproo/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { BikeImage as BikeImageData } from '../types';
import { BikeImage } from './BikeImage';
import { focusRing } from './ui';

export function BikeGallery({ images }: { images: BikeImageData[] }) {
  const [i, setI] = useState(0);
  const count = images.length;
  const go = (n: number) => setI((n + count) % count);
  return (
    <div>
      <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-border bg-neutral-100" aria-roledescription="carousel" aria-label="Bike photos">
        <BikeImage image={images[i]} priority />
        {count > 1 && (
          <>
            <button type="button" aria-label="Previous image" onClick={() => go(i - 1)} className={cn('absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow hover:bg-card', focusRing)}>
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button type="button" aria-label="Next image" onClick={() => go(i + 1)} className={cn('absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow hover:bg-card', focusRing)}>
              <ChevronRight aria-hidden className="size-5" />
            </button>
            <p role="status" className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
              {i + 1} / {count}
            </p>
          </>
        )}
      </div>
      {count > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((img, n) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => setI(n)}
                aria-label={`Show image ${n + 1}`}
                aria-current={n === i}
                className={cn('block aspect-[3/2] w-full overflow-hidden rounded-lg border-2 bg-neutral-100', focusRing, n === i ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100')}
              >
                <BikeImage image={img} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
