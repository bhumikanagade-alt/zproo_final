import {
  forgotPasswordSchema,
  passwordLoginSchema,
  registerSchema,
  resetPasswordSchema,
  sendOtpSchema,
  socialLoginSchema,
  socialProviderSchema,
  verifyOtpSchema,
} from '@zproo/validation';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { createAuthController } from '../controllers/auth.controller';
import type { authRateLimiters } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

export function authRoutes(
  controller: ReturnType<typeof createAuthController>,
  limits: ReturnType<typeof authRateLimiters>,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(limits.perIp);

  // Validation runs before the per-target limiters, which key on the normalised phone/email.
  router.post(
    '/send-otp',
    validate({ body: sendOtpSchema }),
    limits.otpCooldown,
    limits.otpHourly,
    controller.sendOtp,
  );
  router.post(
    '/verify-otp',
    validate({ body: verifyOtpSchema }),
    limits.otpVerify,
    controller.verifyOtp,
  );
  router.post('/register', validate({ body: registerSchema }), controller.register);
  router.post('/login', validate({ body: passwordLoginSchema }), limits.login, controller.login);
  router.post(
    '/social/:provider',
    validate({ params: z.object({ provider: socialProviderSchema }), body: socialLoginSchema }),
    controller.social,
  );
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.post('/logout-all', authenticate, controller.logoutAll);
  router.post(
    '/forgot-password',
    validate({ body: forgotPasswordSchema }),
    limits.otpCooldown,
    limits.otpHourly,
    controller.forgotPassword,
  );
  router.post(
    '/reset-password',
    validate({ body: resetPasswordSchema }),
    limits.otpVerify,
    controller.resetPassword,
  );
  return router;
}
