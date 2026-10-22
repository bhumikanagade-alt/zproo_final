/**
 * Single source of truth for ZPROO GO brand values shared by the web app,
 * API (emails, PDFs) and documentation. The logo itself is a file asset —
 * never re-draw it; reference it via these paths.
 */
export const BRAND = {
  name: 'ZPROO GO',
  tagline: 'Travel Smarter. Go Further.',
  description: 'Unified Mobility & Travel Super App',
  assets: {
    /** Official full-colour logo (transparent background). */
    logo: '/assets/brand/zproo-go-logo.png',
    /** Intrinsic pixel size of `logo`, used to reserve layout space and keep the aspect ratio. */
    logoSize: { width: 302, height: 77 },
    favicon: '/assets/brand/favicon.png',
  },
  colors: {
    primary: '#D9141E',
    primaryHover: '#B80F18',
    primaryLight: '#FDECEC',
    background: '#F8FAFC',
    foreground: '#111827',
    muted: '#6B7280',
    border: '#E5E7EB',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
} as const;
