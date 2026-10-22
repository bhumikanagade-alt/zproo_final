import { cn } from '@zproo/ui';
import { IMAGE_SLOTS, type ImageId } from '@/config/images';
import manifest from '@/config/imageManifest.json';
import { SceneArt } from './SceneArt';

interface ManifestEntry {
  width: number;
  height: number;
  widths: number[];
  color: string;
}

const images = manifest as Record<string, ManifestEntry | undefined>;

interface TravelImageProps {
  id: ImageId;
  /** Rendered width hints for the browser, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes: string;
  /** Above-the-fold images load eagerly with high priority; everything else is lazy. */
  priority?: boolean;
  className?: string;
  /** Override the slot's default alt text. Pass "" for purely decorative use. */
  alt?: string;
}

/**
 * A responsive, lazily loaded travel photo (WebP at 480/960/1600 px). Slots without a published
 * photo render an illustration instead of a broken image. Fills its parent: size the parent.
 */
export function TravelImage({ id, sizes, priority = false, className, alt }: TravelImageProps) {
  const slot = IMAGE_SLOTS[id];
  const label = alt ?? slot.alt;
  const entry = images[id];

  if (!entry) {
    return <SceneArt scene={slot.scene} label={label} className={cn('size-full', className)} />;
  }

  const base = `/assets/${id}`;
  const largest = entry.widths.at(-1) ?? entry.width;
  return (
    <img
      src={`${base}-${largest}.webp`}
      srcSet={entry.widths.map((w) => `${base}-${w}.webp ${w}w`).join(', ')}
      sizes={sizes}
      width={entry.width}
      height={entry.height}
      alt={label}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      style={{ backgroundColor: entry.color }}
      className={cn('size-full object-cover', className)}
    />
  );
}
