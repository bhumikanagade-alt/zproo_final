import type { RoleName } from './enums';
import type { Permission } from './permissions';

/** The signed-in user as returned to that same user. Never contains secrets or hashes. */
export interface PublicUser {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  state: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  roles: RoleName[];
  permissions: Permission[];
  createdAt: string;
}

/** Returned by every endpoint that signs a user in. The refresh token travels only in an HttpOnly cookie. */
export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
}

export interface OtpSent {
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Seconds until another code may be requested. */
  resendIn: number;
  /** Development only (console SMS provider): the code, so flows can be tested without a phone. */
  devCode?: string;
}

/** Result of verifying a phone OTP: either signed in, or proof of phone ownership to finish signup. */
export type VerifyOtpResult =
  | ({ status: 'AUTHENTICATED' } & AuthSession)
  | { status: 'SIGNUP_REQUIRED'; signupToken: string; phone: string };

export interface AdminUserRow {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  roles: RoleName[];
  lastLoginAt: string | null;
  createdAt: string;
}
