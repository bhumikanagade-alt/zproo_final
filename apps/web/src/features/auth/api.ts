import type { ApiSuccess, AuthSession, OtpSent, PublicUser, VerifyOtpResult } from '@zproo/types';
import { apiGet, apiPost, http } from '@/services/http';

export const authApi = {
  sendOtp: (phone: string) => apiPost<OtpSent>('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) =>
    apiPost<VerifyOtpResult>('/auth/verify-otp', { phone, otp }),
  register: (input: { signupToken: string; fullName: string; email?: string; password?: string }) =>
    apiPost<AuthSession>('/auth/register', input),
  login: (identifier: string, password: string) =>
    apiPost<AuthSession>('/auth/login', { identifier, password }),
  social: (provider: 'google' | 'apple', idToken: string) =>
    apiPost<AuthSession>(`/auth/social/${provider}`, { idToken }),
  refresh: () => apiPost<AuthSession>('/auth/refresh'),
  logout: () => apiPost<null>('/auth/logout'),
  logoutAll: () => apiPost<null>('/auth/logout-all'),
  forgotPassword: (identifier: string) => apiPost<OtpSent>('/auth/forgot-password', { identifier }),
  resetPassword: (identifier: string, otp: string, newPassword: string) =>
    apiPost<null>('/auth/reset-password', { identifier, otp, newPassword }),
  me: () => apiGet<PublicUser>('/me'),
  updateMe: async (changes: {
    fullName: string;
    dateOfBirth: string | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
    state: string | null;
    avatarUrl: string | null;
  }) => (await http.patch<ApiSuccess<PublicUser>>('/me', changes)).data.data,
  changePassword: async (changes: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    (await http.post<ApiSuccess<null>>('/me/password', changes)).data.data,
};
