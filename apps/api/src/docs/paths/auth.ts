import {
  forgotPasswordSchema,
  passwordLoginSchema,
  registerSchema,
  resetPasswordSchema,
  sendOtpSchema,
  socialLoginSchema,
  updateProfileSchema,
  changePasswordRequestSchema,
  verifyOtpSchema,
} from '@zproo/validation';
import { Permission, RoleName } from '@zproo/types';
import { z } from 'zod';
import { adminUserListQuerySchema } from '../../validators/admin.validators';
import { ErrorResponse, registry, successEnvelope } from '../openapi';

const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description:
    'Access token from any sign-in response. Valid for 15 minutes; renew with /auth/refresh.',
});
const refreshCookie = registry.registerComponent('securitySchemes', 'refreshCookie', {
  type: 'apiKey',
  in: 'cookie',
  name: 'zp_rt',
  description:
    'HttpOnly refresh token cookie, set by sign-in endpoints and rotated on every refresh.',
});

const PublicUser = registry.register(
  'PublicUser',
  z.object({
    id: z.string(),
    fullName: z.string(),
    phone: z.string().nullable().openapi({ example: '+919876543210' }),
    email: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable(),
    state: z.string().nullable(),
    phoneVerified: z.boolean(),
    emailVerified: z.boolean(),
    hasPassword: z.boolean(),
    roles: z.array(z.enum(Object.values(RoleName) as [string, ...string[]])),
    permissions: z.array(z.enum(Object.values(Permission) as [string, ...string[]])),
    createdAt: z.iso.datetime(),
  }),
);

const AuthSession = registry.register(
  'AuthSession',
  z.object({
    user: PublicUser,
    accessToken: z.string(),
    expiresIn: z.number().int().openapi({ example: 900 }),
  }),
);

const OtpSent = registry.register(
  'OtpSent',
  z.object({
    expiresIn: z.number().int().openapi({ example: 300 }),
    resendIn: z.number().int().openapi({ example: 60 }),
    devCode: z.string().optional().openapi({ description: 'Development SMS provider only' }),
  }),
);

const json = (schema: z.ZodType) => ({ 'application/json': { schema } });
const ok = (description: string, data: z.ZodType) => ({
  description,
  content: json(successEnvelope(data)),
});
const error = (description: string) => ({ description, content: json(ErrorResponse) });
const body = (schema: z.ZodType) => ({ body: { content: json(schema) } });
const tags = ['Authentication'];

registry.registerPath({
  method: 'post',
  path: '/auth/send-otp',
  tags,
  summary: 'Send a sign-in code to a mobile number',
  description:
    'Works for new and existing numbers alike (same response), so it cannot be used to discover accounts. ' +
    'Limits: 1 code per minute and 5 per hour per number.',
  request: body(sendOtpSchema),
  responses: {
    200: ok('Code sent', OtpSent),
    400: error('Invalid number'),
    429: error('Too many codes requested'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/verify-otp',
  tags,
  summary: 'Verify the code: signs existing users in, or returns a signup token for new numbers',
  request: body(verifyOtpSchema),
  responses: {
    200: ok(
      'Signed in (AUTHENTICATED, sets refresh cookie) or SIGNUP_REQUIRED with a 15-minute signup token',
      z.union([
        AuthSession.extend({ status: z.literal('AUTHENTICATED') }),
        z.object({
          status: z.literal('SIGNUP_REQUIRED'),
          signupToken: z.string(),
          phone: z.string(),
        }),
      ]),
    ),
    400: error('INVALID_OTP (wrong code) or OTP_EXPIRED (expired, used, or too many attempts)'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags,
  summary: 'Create the account for a verified mobile number',
  request: body(registerSchema),
  responses: {
    201: ok('Account created and signed in (sets refresh cookie)', AuthSession),
    401: error('Signup token invalid or expired'),
    409: error('Number or email already registered'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags,
  summary: 'Sign in with mobile number or email and password',
  request: body(passwordLoginSchema),
  responses: {
    200: ok('Signed in (sets refresh cookie)', AuthSession),
    401: error('INVALID_CREDENTIALS'),
    403: error('ACCOUNT_DISABLED'),
    429: error('Too many attempts for this account (10 per 15 minutes)'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/social/{provider}',
  tags,
  summary: 'Sign in with a Google or Apple ID token',
  description:
    'Links to an existing account only when the provider has verified the email address.',
  request: {
    params: z.object({ provider: z.enum(['google', 'apple']) }),
    ...body(socialLoginSchema),
  },
  responses: {
    200: ok('Signed in (sets refresh cookie)', AuthSession),
    400: error('PROVIDER_NOT_CONFIGURED'),
    401: error('Token could not be verified'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  tags,
  summary: 'Rotate the refresh cookie and get a new access token',
  description:
    'Replaying an already-used refresh token revokes the whole session (theft detection).',
  security: [{ [refreshCookie.name]: [] }],
  responses: { 200: ok('New session', AuthSession), 401: error('Not signed in or session ended') },
});

registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags,
  summary: "End this device's session",
  security: [{ [refreshCookie.name]: [] }],
  responses: { 200: ok('Signed out', z.null()) },
});

registry.registerPath({
  method: 'post',
  path: '/auth/logout-all',
  tags,
  summary: 'End every session on every device',
  security: [{ [bearerAuth.name]: [] }],
  responses: { 200: ok('Signed out everywhere', z.null()), 401: error('Not signed in') },
});

registry.registerPath({
  method: 'post',
  path: '/auth/forgot-password',
  tags,
  summary: 'Send a password reset code by SMS or email',
  description: 'Always responds the same way; a code is only sent if an active account exists.',
  request: body(forgotPasswordSchema),
  responses: {
    200: ok('Reset code sent if the account exists', OtpSent),
    429: error('Too many codes requested'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/reset-password',
  tags,
  summary: 'Set a new password with the reset code (signs out all sessions)',
  request: body(resetPasswordSchema),
  responses: {
    200: ok('Password updated', z.null()),
    400: error('Invalid or expired code, or weak password'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/me',
  tags: ['Account'],
  summary: 'The signed-in user, with roles and permissions',
  security: [{ [bearerAuth.name]: [] }],
  responses: { 200: ok('Profile', PublicUser), 401: error('Not signed in') },
});

registry.registerPath({
  method: 'patch',
  path: '/me',
  tags: ['Account'],
  summary: 'Update your profile',
  security: [{ [bearerAuth.name]: [] }],
  request: body(updateProfileSchema),
  responses: {
    200: ok('Updated profile', PublicUser),
    400: error('Invalid profile details'),
    401: error('Not signed in'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/admin/users',
  tags: ['Admin'],
  summary: 'List and search users',
  description: 'Requires `admin:access` and `user:read:any` (e.g. SUPPORT, ADMIN, SUPER_ADMIN).',
  security: [{ [bearerAuth.name]: [] }],
  request: { query: adminUserListQuerySchema },
  responses: {
    200: ok(
      'Page of users',
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            fullName: z.string(),
            phone: z.string().nullable(),
            email: z.string().nullable(),
            status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
            roles: z.array(z.string()),
            lastLoginAt: z.iso.datetime().nullable(),
            createdAt: z.iso.datetime(),
          }),
        ),
        page: z.number().int(),
        limit: z.number().int(),
        total: z.number().int(),
      }),
    ),
    401: error('Not signed in'),
    403: error('Missing permission'),
  },
});


registry.registerPath({
  method: 'post',
  path: '/me/password',
  tags: ['Account'],
  summary: 'Change the signed-in user password',
  security: [{ [bearerAuth.name]: [] }],
  request: body(changePasswordRequestSchema),
  responses: {
    200: ok('Password changed', z.null()),
    400: error('Invalid password'),
    401: error('Current password is incorrect or not signed in'),
  },
});
