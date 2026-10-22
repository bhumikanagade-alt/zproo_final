import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OidcIdentityVerifier } from '../src/providers/identity/OidcIdentityVerifier';

let server: Server;
let signingKey: CryptoKey;
let verifier: OidcIdentityVerifier;

const ISSUER = 'https://accounts.google.com';
const AUDIENCE = 'zproo-web-client-id';

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  signingKey = privateKey;
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  // A local stand-in for the provider's published JWKS endpoint.
  server = createServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  verifier = new OidcIdentityVerifier({
    provider: 'google',
    jwksUrl: `http://127.0.0.1:${port}/certs`,
    issuers: [ISSUER],
    audience: AUDIENCE,
  });
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const idToken = (
  claims: Record<string, unknown> = {},
  opts: { iss?: string; aud?: string; exp?: string } = {},
) =>
  new SignJWT({ email: 'Kabir@Example.com', email_verified: true, name: 'Kabir Mehta', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setSubject('google-sub-1')
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '5m')
    .sign(signingKey);

describe('OidcIdentityVerifier', () => {
  it('verifies a genuine token and normalises its claims', async () => {
    expect(await verifier.verify(await idToken())).toEqual({
      provider: 'google',
      providerUserId: 'google-sub-1',
      email: 'kabir@example.com',
      emailVerified: true,
      name: 'Kabir Mehta',
      picture: null,
    });
  });

  it('accepts Apple-style string booleans', async () => {
    const identity = await verifier.verify(await idToken({ email_verified: 'true' }));
    expect(identity.emailVerified).toBe(true);
  });

  it.each([
    ['another audience', { aud: 'someone-elses-app' }],
    ['another issuer', { iss: 'https://evil.example' }],
    ['an expired token', { exp: '-1m' }],
  ])('rejects %s', async (_name, opts) => {
    await expect(verifier.verify(await idToken({}, opts))).rejects.toThrow(
      'Could not verify your sign-in',
    );
  });

  it('rejects a token signed by another key', async () => {
    const { privateKey } = await generateKeyPair('RS256');
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setSubject('x')
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('5m')
      .sign(privateKey);
    await expect(verifier.verify(forged)).rejects.toThrow('Could not verify your sign-in');
  });
});
