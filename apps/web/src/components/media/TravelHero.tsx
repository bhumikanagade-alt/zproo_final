import type { ReactNode } from 'react';
import type { BannerName } from './PageBanner';

/** Hero images: the shared banners plus the railway scene (train-{1024,1920}.webp). */
export type HeroImage = BannerName | 'train';

/**
 * Cinematic hero for the bus and flight pages: the photo and headline sit ABOVE the
 * search card, which only overlaps the lower edge of the banner (the subject stays visible).
 * Images live in /public/assets/banners (bus|flight-{1024,1920}.webp) — swap the files to restyle.
 */
const OBJECT_POSITION: Record<HeroImage, string> = {
  // Subject (bus / aircraft) sits right of centre; keep it in frame on narrow screens.
  bus: 'object-[68%_50%] lg:object-[68%_80%]',
  flight: 'object-[66%_50%] lg:object-[66%_60%]',
  // Pool, villa and sunset: keep the resort on the right in frame.
  hotel: 'object-[70%_50%] lg:object-[70%_75%]',
  // Cruiser sits right of centre against the skyline; keep it in frame on phones.
  bike: 'object-[78%_50%] sm:object-[70%_50%] lg:object-[62%_70%]',
  // Locomotive and headlight sit on the right; keep them in frame on phones.
  train: 'object-[82%_50%] sm:object-[72%_50%] lg:object-[60%_55%]',
};

export function TravelHero({
  image,
  eyebrow,
  title,
  subtitle,
  search,
  children,
}: {
  image: HeroImage;
  /** Optional small label above the title. */
  eyebrow?: string;
  title: string;
  subtitle: string;
  /** The search widget; rendered as a floating card over the hero's lower edge. */
  search: ReactNode;
  /** Content shown below the search card (feature cards). */
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate bg-background">
      <div className="relative h-[380px] overflow-hidden bg-[#0F2437] md:h-[460px] lg:h-[520px]">
        <img
          src={`/assets/banners/${image}-1920.webp`}
          srcSet={`/assets/banners/${image}-1024.webp 1024w, /assets/banners/${image}-1920.webp 1920w`}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          width="1920"
          height="737"
          decoding="async"
          fetchPriority="high"
          className={`absolute inset-0 h-full w-full animate-fade-in object-cover ${OBJECT_POSITION[image]}`}
        />
        {/* Light scrim only behind the headline (left / top), not over the subject. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-transparent sm:bg-gradient-to-r sm:from-black/55 sm:via-black/20 sm:to-transparent sm:[background-size:70%_100%] sm:bg-no-repeat"
        />
        {/* Soft fade into the page background. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
        />
        <div className="relative mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-14 lg:px-8 lg:pt-20">
          {eyebrow ? (
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="max-w-xl text-3xl font-extrabold tracking-tight text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.45)] sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-md text-base text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.5)] sm:text-lg">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-14 w-[94%] max-w-[1280px] animate-fade-in md:-mt-20 lg:-mt-16">
        {search}
      </div>

      {children ? (
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-6 sm:px-6 lg:px-8">{children}</div>
      ) : null}
    </section>
  );
}
