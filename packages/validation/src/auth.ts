import { z } from 'zod';
import {
  emailSchema,
  indianMobileSchema,
  otpCodeSchema,
  passwordSchema,
  personNameSchema,
  isoDateSchema,
} from './common';

/**
 * A mobile number or an email address. Output is tagged so callers never have to guess:
 * `{ type: 'phone', value: '+919876543210' }` or `{ type: 'email', value: 'amit@example.com' }`.
 */
export const identifierSchema = z
  .string()
  .trim()
  .min(1, 'Enter your mobile number or email')
  .transform((raw, ctx) => {
    const schema = raw.includes('@') ? emailSchema : indianMobileSchema;
    const result = schema.safeParse(raw);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        message: raw.includes('@')
          ? 'Enter a valid email address'
          : 'Enter a valid 10-digit mobile number or email',
      });
      return z.NEVER;
    }
    return {
      type: raw.includes('@') ? ('email' as const) : ('phone' as const),
      value: result.data,
    };
  });
export type Identifier = z.output<typeof identifierSchema>;

export const sendOtpSchema = z.object({ phone: indianMobileSchema });

export const verifyOtpSchema = z.object({ phone: indianMobileSchema, otp: otpCodeSchema });

export const registerSchema = z.object({
  signupToken: z.string().min(20).max(2048),
  fullName: personNameSchema,
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
});

export const passwordLoginSchema = z.object({
  identifier: identifierSchema,
  // Existing passwords are checked, not re-validated against the current policy.
  password: z.string().min(1, 'Enter your password').max(128),
});

export const forgotPasswordSchema = z.object({ identifier: identifierSchema });

export const resetPasswordSchema = z.object({
  identifier: identifierSchema,
  otp: otpCodeSchema,
  newPassword: passwordSchema,
});

export const socialProviderSchema = z.enum(['google', 'apple']);
export type SocialProvider = z.infer<typeof socialProviderSchema>;

export const socialLoginSchema = z.object({ idToken: z.string().min(20).max(8192) });

export const profileGenderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);

const profileDateOfBirthSchema = isoDateSchema
  .refine((value) => value <= new Date().toISOString().slice(0, 10), 'Date of birth cannot be in the future')
  .refine((value) => value >= '1900-01-01', 'Enter a valid date of birth');

const avatarDataUrlSchema = z
  .string()
  .max(90_000, 'Profile photo is too large')
  .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'Use a JPG, PNG or WEBP image');

const avatarUrlSchema = z.union([avatarDataUrlSchema, z.url().max(2048)]);

export const updateProfileSchema = z.object({
  fullName: personNameSchema,
  dateOfBirth: profileDateOfBirthSchema.nullable().optional(),
  gender: profileGenderSchema.nullable().optional(),
  state: z.string().trim().min(2).max(60).nullable().optional(),
  avatarUrl: avatarUrlSchema.nullable().optional(),
});

const currentPasswordSchema = z.string().min(1, 'Enter your current password').max(128);

export const changePasswordRequestSchema = z
  .object({
    currentPassword: currentPasswordSchema,
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from your current password',
  });

export const changePasswordSchema = changePasswordRequestSchema
  .extend({
    confirmPassword: z.string().min(1, 'Confirm your new password').max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
