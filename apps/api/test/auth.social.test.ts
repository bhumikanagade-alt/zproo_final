import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, prisma, refreshCookie, resetUsers, signUp } from './helpers';

beforeEach(resetUsers);

const googleUser = {
  providerUserId: 'google-sub-1',
  email: 'kabir@example.com',
  emailVerified: true,
  name: 'Kabir Mehta',
  picture: 'https://example.com/kabir.png',
};

describe('social sign-in', () => {
  it('creates an account on first Google sign-in and reuses it afterwards', async () => {
    const ctx = createTestContext();
    const idToken = ctx.google.add('kabir', googleUser);

    const first = await request(ctx.app)
      .post('/api/auth/social/google')
      .send({ idToken })
      .expect(200);
    expect(first.body.data.user).toMatchObject({
      fullName: 'Kabir Mehta',
      email: 'kabir@example.com',
      emailVerified: true,
      phone: null,
      avatarUrl: 'https://example.com/kabir.png',
      roles: ['USER'],
    });
    expect(refreshCookie(first)).toBeDefined();

    const second = await request(ctx.app)
      .post('/api/auth/social/google')
      .send({ idToken })
      .expect(200);
    expect(second.body.data.user.id).toBe(first.body.data.user.id);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.authIdentity.count()).toBe(1);
  });

  it('links to an existing account with the same verified email', async () => {
    const ctx = createTestContext();
    const { body } = await signUp(ctx, { email: 'kabir@example.com' });
    const idToken = ctx.google.add('kabir', googleUser);
    const res = await request(ctx.app)
      .post('/api/auth/social/google')
      .send({ idToken })
      .expect(200);
    expect(res.body.data.user.id).toBe(body.data.user.id);
    expect(await prisma.auditLog.count({ where: { action: 'AUTH_SOCIAL_LINKED' } })).toBe(1);
  });

  it('never links on an unverified email', async () => {
    const ctx = createTestContext();
    const { body } = await signUp(ctx, { email: 'kabir@example.com' });
    const idToken = ctx.google.add('kabir', { ...googleUser, emailVerified: false });
    const res = await request(ctx.app)
      .post('/api/auth/social/google')
      .send({ idToken })
      .expect(200);
    expect(res.body.data.user.id).not.toBe(body.data.user.id);
    expect(res.body.data.user.email).toBeNull();
  });

  it('rejects tokens the provider did not issue', async () => {
    const ctx = createTestContext();
    const res = await request(ctx.app)
      .post('/api/auth/social/google')
      .send({ idToken: 'forged-token-000000000000' })
      .expect(401);
    expect(res.body.message).toBe('Could not verify your sign-in. Please try again.');
  });

  it('reports providers that are not configured', async () => {
    const ctx = createTestContext();
    const res = await request(ctx.app)
      .post('/api/auth/social/apple')
      .send({ idToken: 'x'.repeat(30) })
      .expect(400);
    expect(res.body).toMatchObject({
      errorCode: 'PROVIDER_NOT_CONFIGURED',
      message: 'Sign in with Apple is not available',
    });
    await request(ctx.app)
      .post('/api/auth/social/facebook')
      .send({ idToken: 'x'.repeat(30) })
      .expect(400);
  });
});
