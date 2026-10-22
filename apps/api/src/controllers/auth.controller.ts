import type { Identifier, SocialProvider } from '@zproo/validation';
import type { Request, RequestHandler, Response } from 'express';
import type { Env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { validated } from '../middleware/validate';
import type { RequestContext } from '../services/audit.service';
import type { AuthService, IssuedSession, RegisterInput } from '../services/auth.service';
import type { TokenService } from '../services/token.service';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../utils/cookies';
import { sendSuccess } from '../utils/response';

export function requestContext(req: Request): RequestContext {
  return { ip: req.ip, userAgent: req.get('user-agent'), requestId: String(req.id) };
}

export function createAuthController(auth: AuthService, tokens: TokenService, env: Env) {
  const signIn = (res: Response, issued: IssuedSession, message: string, status = 200) => {
    setRefreshCookie(res, issued.refreshToken, tokens.refreshTokenTtlMs, env);
    sendSuccess(res, issued.session, message, status);
  };

  const sendOtp: RequestHandler = async (req, res) => {
    const { phone } = validated<{ phone: string }>(req, 'body');
    sendSuccess(res, await auth.sendPhoneOtp(phone, requestContext(req)), 'Code sent');
  };

  const verifyOtp: RequestHandler = async (req, res) => {
    const { phone, otp } = validated<{ phone: string; otp: string }>(req, 'body');
    const { result, refreshToken } = await auth.verifyPhoneOtp(phone, otp, requestContext(req));
    if (refreshToken) setRefreshCookie(res, refreshToken, tokens.refreshTokenTtlMs, env);
    sendSuccess(
      res,
      result,
      result.status === 'AUTHENTICATED' ? 'Signed in' : 'Mobile number verified',
    );
  };

  const register: RequestHandler = async (req, res) => {
    signIn(
      res,
      await auth.register(validated<RegisterInput>(req, 'body'), requestContext(req)),
      'Account created',
      201,
    );
  };

  const login: RequestHandler = async (req, res) => {
    const { identifier, password } = validated<{ identifier: Identifier; password: string }>(
      req,
      'body',
    );
    signIn(
      res,
      await auth.loginWithPassword(identifier, password, requestContext(req)),
      'Signed in',
    );
  };

  const social: RequestHandler = async (req, res) => {
    const { provider } = validated<{ provider: SocialProvider }>(req, 'params');
    const { idToken } = validated<{ idToken: string }>(req, 'body');
    signIn(res, await auth.socialLogin(provider, idToken, requestContext(req)), 'Signed in');
  };

  const refresh: RequestHandler = async (req, res) => {
    try {
      signIn(
        res,
        await auth.refresh(readRefreshCookie(req), requestContext(req)),
        'Session refreshed',
      );
    } catch (error) {
      clearRefreshCookie(res, env);
      throw error;
    }
  };

  const logout: RequestHandler = async (req, res) => {
    await auth.logout(readRefreshCookie(req));
    clearRefreshCookie(res, env);
    sendSuccess(res, null, 'Signed out');
  };

  const logoutAll: RequestHandler = async (req, res) => {
    await auth.logoutAll(requireAuth(req).userId, requestContext(req));
    clearRefreshCookie(res, env);
    sendSuccess(res, null, 'Signed out of all devices');
  };

  const forgotPassword: RequestHandler = async (req, res) => {
    const { identifier } = validated<{ identifier: Identifier }>(req, 'body');
    const sent = await auth.forgotPassword(identifier, requestContext(req));
    sendSuccess(res, sent, 'If an account exists, we have sent a reset code');
  };

  const resetPassword: RequestHandler = async (req, res) => {
    const body = validated<{ identifier: Identifier; otp: string; newPassword: string }>(
      req,
      'body',
    );
    await auth.resetPassword(body.identifier, body.otp, body.newPassword, requestContext(req));
    clearRefreshCookie(res, env);
    sendSuccess(res, null, 'Password updated. Please sign in with your new password.');
  };

  return {
    sendOtp,
    verifyOtp,
    register,
    login,
    social,
    refresh,
    logout,
    logoutAll,
    forgotPassword,
    resetPassword,
  };
}
