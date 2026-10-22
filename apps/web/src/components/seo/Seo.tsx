import { BRAND } from '@zproo/config';
import { useLocation } from 'react-router';
import { env } from '@/lib/env';

interface SeoProps {
  title?: string;
  description?: string;
  /** Hide from search engines (placeholders, account and admin pages). */
  noIndex?: boolean;
  /** Absolute or root-relative image for social cards. */
  image?: string;
}

const DEFAULT_DESCRIPTION =
  'Flights, Buses, Trains, Hotels, Cabs, Bikes, Holidays & Parcels — all in one app.';

/** Page metadata. React 19 hoists these tags into <head>. */
export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  noIndex = false,
  image,
}: SeoProps) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} | ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
  const canonical = env.siteUrl ? `${env.siteUrl}${pathname === '/' ? '' : pathname}` : undefined;
  const ogImage = env.siteUrl
    ? new URL(image ?? BRAND.assets.logo, `${env.siteUrl}/`).toString()
    : undefined;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={BRAND.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {canonical && <meta property="og:url" content={canonical} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </>
  );
}
