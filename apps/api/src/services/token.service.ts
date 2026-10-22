import type { RoleName } from '@zproo/types';
import { jwtVerify, SignJWT } from 'jose';
import type { Env } from '../config/env';
import { AUTH } from '../config/constants';
import { hmacSha256, randomToken } from '../utils/crypto';
import { AuthenticationError } from '../utils/errors';

export interface AccessClaims {
  userId: string;
  roles: RoleName[];
  /** Refresh-token family = one signed-in device/session. */
  sessionId: string;
}

export class TokenService {
  private readonly accessKey: Uint8Array;

  constructor(
    private readonly env: Pick<
      Env,
      'JWT_SECRET' | 'JWT_REFRESH_SECRET' | 'accessTokenTtlSeconds' | 'REFRESH_TOKEN_TTL_DAYS'
    >,
  ) {
    this.accessKey = new TextEncoder().encode(env.JWT_SECRET);
  }

  get accessTokenTtlSeconds(): number {
    return this.env.accessTokenTtlSeconds;
  }

  get refreshTokenTtlMs(): number {
    return this.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  signAccessToken(claims: AccessClaims): Promise<string> {
    return new SignJWT({ roles: claims.roles, sid: claims.sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(claims.userId)
      .setJti(randomToken(12))
      .setIssuer(AUTH.issuer)
      .setAudience(AUTH.audience.access)
      .setIssuedAt()
      .setExpirationTime(`${this.env.accessTokenTtlSeconds}s`)
      .sign(this.accessKey);
  }

  async verifyAccessToken(token: string): Promise<AccessClaims> {
    try {
      const { payload } = await jwtVerify(token, this.accessKey, {
        algorithms: ['HS256'],
        issuer: AUTH.issuer,
        audience: AUTH.audience.access,
      });
      if (!payload.sub || typeof payload.sid !== 'string' || !Array.isArray(payload.roles))
        throw new Error('claims');
      return { userId: payload.sub, sessionId: payload.sid, roles: payload.roles as RoleName[] };
    } catch {
      throw new AuthenticationError('Your session has expired. Please sign in again.');
    }
  }

  /** Short-lived proof that the caller verified `phone` by OTP; exchanged for an account at /auth/register. */
  signSignupToken(phone: string): Promise<string> {
    return new SignJWT({ phone })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(AUTH.issuer)
      .setAudience(AUTH.audience.signup)
      .setIssuedAt()
      .setExpirationTime(`${AUTH.signupTokenTtlSeconds}s`)
      .sign(this.accessKey);
  }

  async verifySignupToken(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, this.accessKey, {
        algorithms: ['HS256'],
        issuer: AUTH.issuer,
        audience: AUTH.audience.signup,
      });
      if (typeof payload.phone !== 'string') throw new Error('claims');
      return payload.phone;
    } catch {
      throw new AuthenticationError(
        'Your verification has expired. Please verify your mobile number again.',
      );
    }
  }

  /** Opaque refresh token; only its keyed hash is stored. */
  newRefreshToken(): { token: string; hash: string } {
    const token = randomToken(32);
    return { token, hash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return hmacSha256(this.env.JWT_REFRESH_SECRET, token);
  }
}
