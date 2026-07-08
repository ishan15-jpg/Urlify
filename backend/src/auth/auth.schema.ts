import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Must be a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*_]/, 'Password must contain at least one special character'),
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email('Incorrect email format'),
  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be atleast 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*_]/, 'Password must contain at least one special character'),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  token: z
    .string({ message: 'Verification token is required' })
    .min(1, 'Verification token is required'),
});

export type VerifyEmailSchemaType = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .email('Incorrect email format')
});

export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z
    .string({ message: 'Reset token is required' })
    .min(1, 'Reset token is required'),
  newPassword: z
    .string({ message: 'New password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*_]/, 'Password must contain at least one special character'),
  confirmNewPassword: z
  .string({ message: 'Confirm new password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*_]/, 'Password must contain at least one special character'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;

export const getUsersQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : 1),
    z.number().int().min(1, 'Page must be at least 1').default(1)
  ),
  limit: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : 20),
    z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20)
  ),
  search: z.string().optional(),
  status: z.enum(['active', 'blocklisted', 'unverified']).optional(),
});

export type GetUsersQuerySchemaType = z.infer<typeof getUsersQuerySchema>;



