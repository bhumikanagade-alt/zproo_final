import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, prisma, resetUsers, signUp } from './helpers';

beforeEach(resetUsers);

describe('/api/me', () => {
  it('requires sign-in', async () => {
    const res = await request(createTestContext().app).get('/api/me').expect(401);
    expect(res.body).toMatchObject({
      errorCode: 'UNAUTHENTICATED',
      message: 'Please sign in to continue',
    });
  });

  it('returns the signed-in user with permissions', async () => {
    const ctx = createTestContext();
    const { accessToken, phone } = await signUp(ctx, { fullName: 'Ananya Iyer' });
    const res = await request(ctx.app)
      .get('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data).toMatchObject({ fullName: 'Ananya Iyer', phone, roles: ['USER'] });
    expect(res.body.data.permissions).toEqual(
      expect.arrayContaining(['profile:read:own', 'wallet:read:own']),
    );
  });

  it('updates the name and records it in the audit log', async () => {
    const ctx = createTestContext();
    const { accessToken, body } = await signUp(ctx);
    const res = await request(ctx.app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: '  Amit K. Sharma ' })
      .expect(200);
    expect(res.body.data.fullName).toBe('Amit K. Sharma');
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'USER_PROFILE_UPDATED' },
    });
    expect(audit).toMatchObject({
      actorId: body.data.user.id,
      before: { fullName: 'Amit Sharma' },
      after: { fullName: 'Amit K. Sharma' },
    });
  });

  it('ignores fields users may not change', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const res = await request(ctx.app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 'Amit Sharma', roles: ['SUPER_ADMIN'], status: 'ACTIVE' })
      .expect(200);
    expect(res.body.data.roles).toEqual(['USER']);
  });

  it('updates personal profile details', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx, { password: 'oldpass9' });
    const res = await request(ctx.app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Amit Sharma',
        dateOfBirth: '1998-05-12',
        gender: 'MALE',
        state: 'Maharashtra',
      })
      .expect(200);
    expect(res.body.data).toMatchObject({
      dateOfBirth: '1998-05-12',
      gender: 'MALE',
      state: 'Maharashtra',
    });
  });

  it('changes the password and rejects the old password', async () => {
    const ctx = createTestContext();
    const { accessToken, phone } = await signUp(ctx, { password: 'oldpass9' });
    await request(ctx.app)
      .post('/api/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'wrongpass9', newPassword: 'newpass9' })
      .expect(401);
    await request(ctx.app)
      .post('/api/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'oldpass9', newPassword: 'newpass9' })
      .expect(200);
    await request(ctx.app)
      .post('/api/auth/login')
      .send({ identifier: phone, password: 'oldpass9' })
      .expect(401);
    await request(ctx.app)
      .post('/api/auth/login')
      .send({ identifier: phone, password: 'newpass9' })
      .expect(200);
  });
});
