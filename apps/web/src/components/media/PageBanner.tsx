import type { ReactNode } from 'react';

export type BannerName = 'bus' | 'flight' | 'hotel' | 'bike';

/**
 * Full-width hero section with a static photo behind the content.
 * Images live in /public/assets/banners (bus|flight|hotel|bike-{1024,1920}.webp).
 */
export function PageBanner({
  image,
  className = '',
  children,
}: {
  image: BannerName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`relative isolate overflow-hidden bg-[#0F2437] ${className}`}>
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        <img
          src={`/assets/banners/${image}-1920.webp`}
          srcSet={`/assets/banners/${image}-1024.webp 1024w, /assets/banners/${image}-1920.webp 1920w`}
          sizes="100vw"
          alt=""
          width="1920"
          height="737"
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/30 to-black/60"
      />
      {children}
    </section>
  );
}
