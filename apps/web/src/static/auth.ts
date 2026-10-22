import type { AuthSession, OtpSent, VerifyOtpResult } from '@zproo/types';
import {
  forgotPasswordSchema,
  passwordLoginSchema,
  registerSchema,
  resetPasswordSchema,
  sendOtpSchema,
  updateProfileSchema,
  changePasswordRequestSchema,
  verifyOtpSchema,
  type Identifier,
} from '@zproo/validation';
import {
  currentUser,
  db,
  parse,
  publicUser,
  randomDigits,
  randomId,
  save,
  sha256,
  StaticError,
  unauthenticated,
  type StaticRequest,
  type StaticResult,
  type StoredUser,
} from './core';

const OTP_SECONDS = 300;

function session(user: StoredUser): AuthSession {
  if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
    throw new StaticError(403, 'ACCOUNT_DISABLED', 'This account is disabled. Please contact support.');
  }
  db().sessionUserId = user.id;
  user.lastLoginAt = new Date().toISOString();
  save();
  return { user: publicUser(user), accessToken: `static.${user.id}`, expiresIn: 900 };
}

/** Demo OTP: the code is returned to the page (as a development SMS provider would print it). */
function sendCode(target: string): OtpSent {
  const code = randomDigits(6);
  db().otps[target] = { code, expiresAt: Date.now() + OTP_SECONDS * 1000 };
  save();
  return { expiresIn: OTP_SECONDS, resendIn: 30, devCode: code };
}

function checkCode(target: string, code: string) {
  const otp = db().otps[target];
  if (!otp || otp.expiresAt < Date.now()) {
    throw new StaticError(400, 'OTP_EXPIRED', 'This code has expired. Request a new one.');
  }
  if (otp.code !== code)
    throw new StaticError(400, 'INVALID_OTP', 'Incorrect code. Please try again.');
  db().otps = without(db().otps, target);
}

const without = <T>(record: Record<string, T>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

const findUser = (id: Identifier) =>
  db().users.find((u) => (id.type === 'phone' ? u.phone === id.value : u.email === id.value));

export async function authRoutes(req: StaticRequest): Promise<StaticResult | null> {
  const { method, path, body } = req;

  if (method === 'POST' && path === '/auth/send-otp') {
    const { phone } = parse(sendOtpSchema, body, 'body');
    return { data: sendCode(phone), message: 'Code sent' };
  }

  if (method === 'POST' && path === '/auth/verify-otp') {
    const { phone, otp } = parse(verifyOtpSchema, body, 'body');
    checkCode(phone, otp);
    const user = db().users.find((u) => u.phone === phone);
    if (user)
      return { data: { status: 'AUTHENTICATED', ...session(user) } satisfies VerifyOtpResult };
    const signupToken = `${randomId()}${randomId()}`;
    db().signupTokens[signupToken] = phone;
    save();
    return { data: { status: 'SIGNUP_REQUIRED', signupToken, phone } satisfies VerifyOtpResult };
  }

  if (method === 'POST' && path === '/auth/register') {
    const input = parse(registerSchema, body, 'body');
    const phone = db().signupTokens[input.signupToken];
    if (!phone)
      throw new StaticError(401, 'UNAUTHENTICATED', 'Please verify your mobile number again');
    if (db().users.some((u) => u.phone === phone)) {
      throw new StaticError(409, 'CONFLICT', 'This mobile number is already registered');
    }
    if (input.email && db().users.some((u) => u.email === input.email)) {
      throw new StaticError(409, 'CONFLICT', 'This email is already registered');
    }
    const user: StoredUser = {
      id: randomId(),
      fullName: input.fullName,
      phone,
      email: input.email ?? null,
      passwordHash: input.password ? await sha256(input.password) : null,
      avatarUrl: null,
      dateOfBirth: null,
      gender: null,
      state: null,
      createdAt: new Date().toISOString(),
    };
    db().users.push(user);
    db().signupTokens = without(db().signupTokens, input.signupToken);
    return { status: 201, data: session(user), message: 'Welcome to ZPROO GO' };
  }

  if (method === 'POST' && path === '/auth/login') {
    const { identifier, password } = parse(passwordLoginSchema, body, 'body');
    const user = findUser(identifier);
    if (!user?.passwordHash || user.passwordHash !== (await sha256(password))) {
      throw new StaticError(
        401,
        'INVALID_CREDENTIALS',
        'Incorrect mobile number/email or password',
      );
    }
    return { data: session(user) };
  }

  if (method === 'POST' && path.startsWith('/auth/social/')) {
    throw new StaticError(
      400,
      'PROVIDER_NOT_CONFIGURED',
      'Social sign-in is not available in the demo',
    );
  }

  if (method === 'POST' && path === '/auth/refresh') {
    const user = db().users.find((u) => u.id === db().sessionUserId);
    if (!user) throw unauthenticated();
    return { data: session(user) };
  }

  if (method === 'POST' && (path === '/auth/logout' || path === '/auth/logout-all')) {
    db().sessionUserId = null;
    save();
    return { data: null, message: 'Signed out' };
  }

  if (method === 'POST' && path === '/auth/forgot-password') {
    const { identifier } = parse(forgotPasswordSchema, body, 'body');
    // Same answer whether or not the account exists (as the real API does).
    return {
      data: sendCode(`reset:${identifier.value}`),
      message: 'If the account exists, a code was sent',
    };
  }

  if (method === 'POST' && path === '/auth/reset-password') {
    const { identifier, otp, newPassword } = parse(resetPasswordSchema, body, 'body');
    checkCode(`reset:${identifier.value}`, otp);
    const user = findUser(identifier);
    if (!user)
      throw new StaticError(400, 'OTP_EXPIRED', 'This code has expired. Request a new one.');
    user.passwordHash = await sha256(newPassword);
    save();
    return { data: null, message: 'Password updated' };
  }

  if (path === '/me' && method === 'GET') return { data: publicUser(currentUser()) };
  if (path === '/me' && method === 'PATCH') {
    const user = currentUser();
    const changes = parse(updateProfileSchema, body, 'body');
    user.fullName = changes.fullName;
    if (changes.dateOfBirth !== undefined) user.dateOfBirth = changes.dateOfBirth;
    if (changes.gender !== undefined) user.gender = changes.gender;
    if (changes.state !== undefined) user.state = changes.state;
    if (changes.avatarUrl !== undefined) user.avatarUrl = changes.avatarUrl;
    save();
    return { data: publicUser(user), message: 'Profile updated' };
  }

  if (path === '/me/password' && method === 'POST') {
    const changes = parse(changePasswordRequestSchema, body, 'body');
    const user = currentUser();
    if (!user.passwordHash || user.passwordHash !== (await sha256(changes.currentPassword))) {
      throw new StaticError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
    }
    user.passwordHash = await sha256(changes.newPassword);
    save();
    db().sessionUserId = null;
    save();
    return { data: null, message: 'Password changed. Please sign in again.' };
  }
  return null;
}
