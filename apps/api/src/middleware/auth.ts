import type { Permission, RoleName } from '@zproo/types';
import type { Request, RequestHandler } from 'express';
import type { RbacService } from '../services/rbac.service';
import type { TokenService } from '../services/token.service';
import { AuthenticationError, AuthorizationError } from '../utils/errors';

/** Requires a valid `Authorization: Bearer <access token>`; sets `req.auth`. */
export function authenticate(tokens: TokenService): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    const match = header?.match(/^Bearer ([A-Za-z0-9._-]+)$/);
    if (!match?.[1]) throw new AuthenticationError('Please sign in to continue');
    req.auth = await tokens.verifyAccessToken(match[1]);
    next();
  };
}

/**
 * Requires every listed permission. Permissions are resolved server-side from the roles in the
 * verified token — never from anything the client sends.
 */
export function authorize(rbac: RbacService, ...required: Permission[]): RequestHandler {
  return async (req, _res, next) => {
    const auth = requireAuth(req);
    if (!(await rbac.hasAll(auth.roles, required))) throw new AuthorizationError();
    next();
  };
}

/**
 * Requires at least one of the listed permissions (resolved from the roles on `req.auth`).
 */
export function authorizeAny(rbac: RbacService, ...allowed: Permission[]): RequestHandler {
  return async (req, _res, next) => {
    const auth = requireAuth(req);
    for (const permission of allowed) {
      if (await rbac.hasAll(auth.roles, [permission])) return next();
    }
    throw new AuthorizationError();
  };
}

/** Looks up the signed-in user and session in the database (see `AdminService.liveStaff`). */
export interface LiveStaffLookup {
  liveStaff(userId: string, sessionId: string): Promise<RoleName[]>;
}

/**
 * For staff routes: the access token alone is not enough. On every request the user must still be
 * ACTIVE and not deleted, the session must not be revoked, and the roles come from the database —
 * so blocking or demoting someone takes effect immediately instead of when their token expires.
 */
export function requireLiveStaff(lookup: LiveStaffLookup): RequestHandler {
  return async (req, _res, next) => {
    const auth = requireAuth(req);
    const roles = await lookup.liveStaff(auth.userId, auth.sessionId);
    req.auth = { ...auth, roles };
    next();
  };
}

export function requireAuth(req: Request) {
  if (!req.auth) throw new AuthenticationError('Please sign in to continue');
  return req.auth;
}
