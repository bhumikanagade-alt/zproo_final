/**
 * Public (browser) configuration. Never put secrets in VITE_* variables — they ship to users.
 * Validated by hand to keep a schema library out of the entry bundle.
 */
function readUrl(name: 'VITE_SITE_URL', value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }
}

const apiUrl = import.meta.env.VITE_API_URL || '/api';

export const env = {
  apiUrl: apiUrl.replace(/\/$/, ''),
  /**
   * Static (demo) mode runs the site entirely in the browser with built-in demo data and no server.
   * It is on ONLY when VITE_DATA_SOURCE is exactly "static"; anything else (including unset) uses the
   * ZPROO GO API, so a live site can never fall back to the demo engine by accident. Production
   * builds refuse to build unless VITE_DATA_SOURCE=api (see vite.config.ts).
   */
  staticMode: import.meta.env.VITE_DATA_SOURCE === 'static',
  /** Absolute site URL. Empty only when prerendering without VITE_SITE_URL (canonical links are then omitted). */
  siteUrl:
    readUrl('VITE_SITE_URL', import.meta.env.VITE_SITE_URL) ??
    (typeof window === 'undefined' ? '' : window.location.origin),
  /**
   * VITE_SITE_URL only (never the browser's origin): for markup that is prerendered, so the server
   * HTML and the client render match exactly (a mismatch makes React discard the prerendered page).
   */
  configuredSiteUrl: readUrl('VITE_SITE_URL', import.meta.env.VITE_SITE_URL) ?? '',
};
