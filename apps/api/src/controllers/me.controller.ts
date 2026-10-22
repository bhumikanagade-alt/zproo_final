import type { RequestHandler } from 'express';
import { requireAuth } from '../middleware/auth';
import { validated } from '../middleware/validate';
import type { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { requestContext } from './auth.controller';

export function createMeController(users: UserService) {
  const get: RequestHandler = async (req, res) => {
    sendSuccess(res, await users.getProfile(requireAuth(req).userId));
  };

  const update: RequestHandler = async (req, res) => {
    const changes = validated<{ fullName: string; dateOfBirth?: string | null; gender?: 'MALE' | 'FEMALE' | 'OTHER' | null; state?: string | null; avatarUrl?: string | null }>(req, 'body');
    sendSuccess(
      res,
      await users.updateProfile(requireAuth(req).userId, changes, requestContext(req)),
      'Profile updated',
    );
  };

  const changePassword: RequestHandler = async (req, res) => {
    const changes = validated<{ currentPassword: string; newPassword: string }>(req, 'body');
    await users.changePassword(requireAuth(req).userId, changes, requestContext(req));
    sendSuccess(res, null, 'Password changed. Please sign in again.');
  };

  return { get, update, changePassword };
}
