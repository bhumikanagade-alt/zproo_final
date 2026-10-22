import { cn } from '@zproo/ui';
import { Bike as BikeIcon } from 'lucide-react';
import { useState } from 'react';
import type { BikeImage as BikeImageData } from '../types';

/** Bike photo/illustration. Falls back to an icon tile if the file is missing or fails to load. */
export function BikeImage({ image, priority = false, className }: { image: BikeImageData | undefined; priority?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return (
      <div role="img" aria-label={image?.alt ?? 'Bike image unavailable'} className={cn('grid size-full place-items-center bg-neutral-100 text-muted', className)}>
        <BikeIcon aria-hidden className="size-10" />
      </div>
    );
  }
  return (
    <img
      src={image.src}
      alt={image.alt}
      width={480}
      height={320}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('size-full object-cover', className)}
    />
  );
}
