import type { SocialProvider } from '@zproo/validation';
import type { Env } from '../../config/env';
import type { IdentityVerifier } from './IdentityVerifier';
import { OidcIdentityVerifier } from './OidcIdentityVerifier';

export type { IdentityVerifier, VerifiedIdentity } from './IdentityVerifier';

export type IdentityVerifiers = Partial<Record<SocialProvider, IdentityVerifier>>;

/** Only providers with a configured client ID are enabled. */
export function createIdentityVerifiers(
  env: Pick<Env, 'GOOGLE_OAUTH_CLIENT_ID' | 'APPLE_CLIENT_ID'>,
): IdentityVerifiers {
  const verifiers: IdentityVerifiers = {};
  if (env.GOOGLE_OAUTH_CLIENT_ID) {
    verifiers.google = new OidcIdentityVerifier({
      provider: 'google',
      jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
      issuers: ['https://accounts.google.com', 'accounts.google.com'],
      audience: env.GOOGLE_OAUTH_CLIENT_ID,
    });
  }
  if (env.APPLE_CLIENT_ID) {
    verifiers.apple = new OidcIdentityVerifier({
      provider: 'apple',
      jwksUrl: 'https://appleid.apple.com/auth/keys',
      issuers: ['https://appleid.apple.com'],
      audience: env.APPLE_CLIENT_ID,
    });
  }
  return verifiers;
}
