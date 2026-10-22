import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTestContext,
  prisma,
  refreshCookie,
  resetUsers,
  signUp,
  uniquePhone,
} from './helpers';

beforeEach(resetUsers);

describe('mobile OTP sign-up', () => {
  it('sends a code, verifies it, and creates the account', async () => {
    const ctx = createTestContext();
    const phone = uniquePhone();

    const sent = await request(ctx.app)
      .post('/api/auth/send-otp')
      .send({ phone: phone.slice(3) })
      .expect(200);
    expect(sent.body.data).toEqual({ expiresIn: 300, resendIn: 60 });
    expect(ctx.sms.sent).toHaveLength(1);
    expect(ctx.sms.sent[0]?.to).toBe(phone);

    const verify = await request(ctx.app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: ctx.sms.lastCodeFor(phone) })
      .expect(200);
    expect(verify.body.data).toMatchObject({ status: 'SIGNUP_REQUIRED', phone });
    expect(refreshCookie(verify)).toBeUndefined();

    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({
        signupToken: verify.body.data.signupToken,
        fullName: 'Amit Sharma',
        email: 'Amit@Example.com',
      })
      .expect(201);

    expect(res.body.data.user).toMatchObject({
      fullName: 'Amit Sharma',
      phone,
      email: 'amit@example.com',
      phoneVerified: true,
      emailVerified: false,
      hasPassword: false,
      roles: ['USER'],
    });
    expect(res.body.data.user.permissions).toContain('booking:create');
    expect(res.body.data.user.permissions).not.toContain('admin:access');
    expect(res.body.data.expiresIn).toBe(900);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('zp_rt='),
    );
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\/api\/auth/);

    const audit = await prisma.auditLog.findMany({
      where: { entityId: res.body.data.user.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(audit.map((a) => a.action)).toEqual(['AUTH_REGISTER', 'AUTH_LOGIN']);
  });

  it('signs an existing user straight in', async () => {
    const ctx = createTestContext();
    const { phone } = await signUp(ctx);
    // A different context avoids the 60-second resend cooldown on the same number.
    const again = createTestContext();
    await request(again.app).post('/api/auth/send-otp').send({ phone }).expect(200);
    const res = await request(again.app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: again.sms.lastCodeFor(phone) })
      .expect(200);
    expect(res.body.data.status).toBe('AUTHENTICATED');
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(res)).toBeDefined();
    expect(again.sms.sent[0]?.body).toMatch(/login code/);
  });

  it('answers identically for registered and unregistered numbers', async () => {
    const ctx = createTestContext();
    const { phone } = await signUp(ctx);
    const fresh = createTestContext();
    const known = await request(fresh.app).post('/api/auth/send-otp').send({ phone }).expect(200);
    const unknown = await request(fresh.app)
      .post('/api/auth/send-otp')
      .send({ phone: uniquePhone() })
      .expect(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('rejects a wrong code and counts down the attempts', async () => {
    const ctx = createTestContext();
    const phone = uniquePhone();
    await request(ctx.app).post('/api/auth/send-otp').send({ phone }).expect(200);
    const wrong = ctx.sms.lastCodeFor(phone) === '000000' ? '111111' : '000000';
    const res = await request(ctx.app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: wrong })
      .expect(400);
    expect(res.body).toMatchObject({
      errorCode: 'INVALID_OTP',
      message: 'Incorrect code. 4 attempts left.',
    });
  });

  it('locks the code after 5 wrong attempts, even for the right code', async () => {
    const ctx = createTestContext();
    const phone = uniquePhone();
    await request(ctx.app).post('/api/auth/send-otp').send({ phone }).expect(200);
    const code = ctx.sms.lastCodeFor(phone);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await request(ctx.app).post('/api/auth/verify-otp').send({ phone, otp: wrong }).expect(400);
    }
    const res = await request(ctx.app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: code })
      .expect(400);
    expect(res.body).toMatchObject({
      errorCode: 'OTP_EXPIRED',
      message: 'Too many incorrect attempts. Request a new code.',
    });
  });

  it('makes codes single-use', async () => {
    const ctx = createTestContext();
    const phone = uniquePhone();
    await request(ctx.app).post('/api/auth/send-otp').send({ phone }).expect(200);
    const otp = ctx.sms.lastCodeFor(phone);
    await request(ctx.app).post('/api/auth/verify-otp').send({ phone, otp }).expect(200);
    const res = await request(ctx.app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp })
      .expect(400);
    expect(res.body.errorCode).toBe('OTP_EXPIRED');
  });

  it('only accepts the most recent code', async () => {
    const ctx = createTestContext();
    const phone = uniquePhone();
    await ctx.services.auth.sendPhoneOtp(phone, {});
    const first = ctx.sms.lastCodeFor(phone);
    await ctx.services.auth.sendPhoneOtp(phone, {});
    const second = ctx.sms.lastCodeFor(phone);
    if (first !== second) {
      await request(ctx.app).post('/api/auth/verify-otp').send({ phone, otp: first }).expect(400);
    }
    await request(ctx.app).post('/api/auth/verify-otp').send({ phone, otp: second }).expect(200);
  });

  it('rejects expired codes', async () => {
    const ctx = createTestContext();
    const phone = uniquePhone();
    await request(ctx.app).post('/api/auth/send-otp').send({ phone }).expect(200);
    await prisma.otpCode.updateMany({
      where: { target: phone },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await request(ctx.app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: ctx.sms.lastCodeFor(phone) })
      .expect(400);
    expect(res.body).toMatchObject({
      errorCode: 'OTP_EXPIRED',
      message: 'This code has expired. Request a new one.',
    });
  });

  it('stores only a keyed hash of the code', async () => {
    const ctx = createTestContext();
    const phone = uniquePhone();
    await request(ctx.app).post('/api/auth/send-otp').send({ phone }).expect(200);
    const row = await prisma.otpCode.findFirstOrThrow({ where: { target: phone } });
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.codeHash).not.toContain(ctx.sms.lastCodeFor(phone));
  });

  it('enforces a 60-second resend cooldown per number', async () => {
    const ctx = createTestContext();
    const phone = uniquePhone();
    await request(ctx.app).post('/api/auth/send-otp').send({ phone }).expect(200);
    const res = await request(ctx.app).post('/api/auth/send-otp').send({ phone }).expect(429);
    expect(res.body).toMatchObject({
      errorCode: 'RATE_LIMITED',
      message: 'Please wait a minute before requesting another code.',
    });
    expect(ctx.sms.sent).toHaveLength(1);
    // Other numbers are unaffected.
    await request(ctx.app).post('/api/auth/send-otp').send({ phone: uniquePhone() }).expect(200);
  });

  it('validates the phone number', async () => {
    const ctx = createTestContext();
    const res = await request(ctx.app)
      .post('/api/auth/send-otp')
      .send({ phone: '12345' })
      .expect(400);
    expect(res.body.details).toEqual([
      { path: 'body.phone', message: 'Enter a valid 10-digit mobile number' },
    ]);
  });

  it('includes the code in the response only for the development SMS provider', async () => {
    const { ConsoleSmsProvider } = await import('../src/providers/sms/ConsoleSmsProvider');
    const lines: string[] = [];
    const ctx = createTestContext({
      providers: { sms: new ConsoleSmsProvider((l) => lines.push(l)) },
    });
    const res = await request(ctx.app)
      .post('/api/auth/send-otp')
      .send({ phone: uniquePhone() })
      .expect(200);
    expect(res.body.data.devCode).toMatch(/^\d{6}$/);
    expect(lines.join('')).toContain(res.body.data.devCode);
  });
});

describe('POST /api/auth/register', () => {
  it('rejects an invalid or tampered signup token', async () => {
    const ctx = createTestContext();
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ signupToken: 'x'.repeat(40), fullName: 'Amit Sharma' })
      .expect(401);
    expect(res.body.errorCode).toBe('UNAUTHENTICATED');
  });

  it('cannot register the same number twice with one token', async () => {
    const ctx = createTestContext();
    const phone = uniquePhone();
    await request(ctx.app).post('/api/auth/send-otp').send({ phone });
    const verify = await request(ctx.app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: ctx.sms.lastCodeFor(phone) });
    const body = { signupToken: verify.body.data.signupToken, fullName: 'Amit Sharma' };
    await request(ctx.app).post('/api/auth/register').send(body).expect(201);
    const res = await request(ctx.app).post('/api/auth/register').send(body).expect(409);
    expect(res.body.message).toBe('This mobile number is already registered. Please log in.');
  });

  it('rejects an email that belongs to another account', async () => {
    const ctx = createTestContext();
    await signUp(ctx, { email: 'taken@example.com' });
    const phone = uniquePhone();
    await request(ctx.app).post('/api/auth/send-otp').send({ phone });
    const verify = await request(ctx.app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: ctx.sms.lastCodeFor(phone) });
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({
        signupToken: verify.body.data.signupToken,
        fullName: 'Riya Nair',
        email: 'TAKEN@example.com',
      })
      .expect(409);
    expect(res.body.message).toBe('This email is already linked to another account.');
  });

  it('hashes passwords with argon2id', async () => {
    const ctx = createTestContext();
    const { body } = await signUp(ctx, { password: 'travel2026' });
    expect(body.data.user.hasPassword).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: body.data.user.id } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
  });
});
