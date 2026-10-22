import type { SocialProvider } from '@zproo/validation';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { AuthenticationError } from '../../utils/errors';
import type { IdentityVerifier, VerifiedIdentity } from './IdentityVerifier';

interface OidcConfig {
  provider: SocialProvider;
  jwksUrl: string;
  issuers: string[];
  audience: string;
}

/**
 * Verifies OpenID Connect ID tokens against the provider's published signing keys (JWKS,
 * cached by `jose`). Used for Google and Apple; any OIDC provider fits.
 */
export class OidcIdentityVerifier implements IdentityVerifier {
  readonly provider: SocialProvider;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: OidcConfig) {
    this.provider = config.provider;
    this.jwks = createRemoteJWKSet(new URL(config.jwksUrl));
  }

  async verify(idToken: string): Promise<VerifiedIdentity> {
    let payload: JWTPayload & {
      email?: unknown;
      email_verified?: unknown;
      name?: unknown;
      picture?: unknown;
    };
    try {
      ({ payload } = await jwtVerify(idToken, this.jwks, {
        issuer: this.config.issuers,
        audience: this.config.audience,
      }));
    } catch {
      throw new AuthenticationError('Could not verify your sign-in. Please try again.');
    }
    if (!payload.sub)
      throw new AuthenticationError('Could not verify your sign-in. Please try again.');
    return {
      provider: this.provider,
      providerUserId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      // Apple sends "true"/"false" strings; Google sends booleans.
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: typeof payload.name === 'string' ? payload.name : null,
      picture: typeof payload.picture === 'string' ? payload.picture : null,
    };
  }
}
