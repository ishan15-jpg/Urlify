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


