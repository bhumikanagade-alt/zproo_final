import type { RoleName } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, grantRole, refreshCookie, resetUsers, signUp } from './helpers';

beforeEach(resetUsers);

/** Signs up, grants `role`, and refreshes so the new access token carries it. */
async function signInAs(
  ctx: ReturnType<typeof createTestContext>,
  role: RoleName,
  fullName = 'Staff Member',
) {
  const { cookie, body } = await signUp(ctx, { fullName });
  await grantRole(body.data.user.id, role);
  const res = await request(ctx.app).post('/api/auth/refresh').set('Cookie', cookie).expect(200);
  expect(refreshCookie(res)).toBeDefined();
  return res.body.data.accessToken as string;
}

describe('admin authorization', () => {
  it('rejects anonymous requests', async () => {
    await request(createTestContext().app).get('/api/admin/users').expect(401);
  });

  it('forbids customers', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    const res = await request(ctx.app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(res.body).toMatchObject({ errorCode: 'FORBIDDEN' });
  });

  it('forbids staff without the specific permission', async () => {
    const ctx = createTestContext();
    // Operators can open the admin panel but may not list users.
    const token = await signInAs(ctx, 'OPERATOR');
    await request(ctx.app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('lets support agents list and search users', async () => {
    const ctx = createTestContext();
    await signUp(ctx, { fullName: 'Ishaan Reddy', email: 'ishaan@example.com' });
    await signUp(ctx, { fullName: 'Myra Kulkarni' });
    const token = await signInAs(ctx, 'SUPPORT', 'Support Agent');

    const all = await request(ctx.app)
      .get('/api/admin/users?limit=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(all.body.data).toMatchObject({ page: 1, limit: 2, total: 3 });
    expect(all.body.data.items).toHaveLength(2);
    expect(all.body.data.items[0]).not.toHaveProperty('passwordHash');

    const search = await request(ctx.app)
      .get('/api/admin/users?search=reddy')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(search.body.data.items.map((u: { fullName: string }) => u.fullName)).toEqual([
      'Ishaan Reddy',
    ]);

    const byRole = await request(ctx.app)
      .get('/api/admin/users?role=SUPPORT')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(byRole.body.data.total).toBe(1);

    await request(ctx.app)
      .get('/api/admin/users?role=KING')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('does not trust roles a client claims', async () => {
    const ctx = createTestContext();
    const { accessToken } = await signUp(ctx);
    await request(ctx.app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Role', 'SUPER_ADMIN')
      .query({ role: 'SUPER_ADMIN' })
      .expect(403);
  });
});
