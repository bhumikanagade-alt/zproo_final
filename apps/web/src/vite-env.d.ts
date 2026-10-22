/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SITE_URL?: string;
  /** Enables "Continue with Google" when set. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** "static" (default): demo data in the browser, no server. "api": use the ZPROO GO API. */
  readonly VITE_DATA_SOURCE?: 'static' | 'api';
  /** Verified customer-support mobile number shown on the site, e.g. "+91 98765 43210". */
  readonly VITE_SUPPORT_PHONE?: string;
  /** Optional form-handling endpoint (e.g. Formspree) for the Contact and Careers forms. */
  readonly VITE_FORM_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
