import type { SocialProvider } from '@zproo/validation';

/** Claims extracted from a verified third-party ID token. */
export interface VerifiedIdentity {
  provider: SocialProvider;
  /** Stable user ID at the provider (`sub`). */
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/** Verifies an ID token issued by a social identity provider (signature, issuer, audience, expiry). */
export interface IdentityVerifier {
  readonly provider: SocialProvider;
  verify(idToken: string): Promise<VerifiedIdentity>;
}
