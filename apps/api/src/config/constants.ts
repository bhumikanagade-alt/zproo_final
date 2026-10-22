/** Authentication policy. Changing these is a security decision — document it in docs/SECURITY.md. */
export const AUTH = {
  otpLength: 6,
  otpTtlSeconds: 5 * 60,
  otpResendSeconds: 60,
  otpMaxAttempts: 5,
  otpMaxSendsPerHour: 5,
  signupTokenTtlSeconds: 15 * 60,
  refreshCookieName: 'zp_rt',
  refreshCookiePath: '/api/auth',
  issuer: 'zproo-go',
  audience: { access: 'zproo-go-api', signup: 'zproo-go-signup' },
} as const;
