import { BRAND } from '@zproo/config';
import { cn } from '@zproo/ui';

interface LogoProps {
  /** Rendered height in px; width follows the logo's aspect ratio. */
  height?: number;
  /**
   * `plate` places the logo on a white rounded plate so it stays legible on red or dark
   * backgrounds (the official logo has no white variant).
   */
  surface?: 'none' | 'plate';
  className?: string;
  /** Set when the logo is the page's primary brand mark above the fold. */
  priority?: boolean;
}

/**
 * The official ZPROO GO logo. Always rendered from the brand asset at its original aspect
 * ratio — never recreated, recoloured or stretched.
 */
export function Logo({ height = 36, surface = 'none', className, priority = false }: LogoProps) {
  const { width: w, height: h } = BRAND.assets.logoSize;
  const img = (
    <picture className={cn('contents')}>
      {/* Lossless WebP of the official logo (pixel-identical, smaller); PNG for older browsers. */}
      <source type="image/webp" srcSet={BRAND.assets.logo.replace(/\.png$/, '.webp')} />
      <img
        src={BRAND.assets.logo}
        alt={BRAND.name}
        width={Math.round((w / h) * height)}
        height={height}
        style={{ height, width: 'auto' }}
        className={cn('block max-w-none select-none', surface === 'none' && className)}
        draggable={false}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </picture>
  );
  if (surface === 'none') return img;
  return (
    <span className={cn('inline-flex rounded-2xl bg-white px-3 py-2 shadow-sm', className)}>
      {img}
    </span>
  );
}
