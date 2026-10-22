import {
  emailSchema,
  identifierSchema,
  indianMobileSchema,
  otpCodeSchema,
  passwordSchema,
  personNameSchema,
} from '@zproo/validation';
import { z } from 'zod';

/** Form schemas built from the shared API schemas, so browser and server rules match. */

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    schema.optional(),
  );

export const phoneFormSchema = z.object({ phone: indianMobileSchema });

export const passwordLoginFormSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, 'Enter your password'),
});

export const profileFormSchema = z.object({
  fullName: personNameSchema,
  email: optional(emailSchema),
  password: optional(passwordSchema),
});

export const forgotFormSchema = z.object({ identifier: identifierSchema });

export const resetFormSchema = z
  .object({
    otp: otpCodeSchema,
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const nameFormSchema = z.object({ fullName: personNameSchema });
