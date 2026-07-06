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
  email: z
    .string({ message: 'Email is required' })
    .min(1, 'Email is required')
    .email('Incorrect email format'),
  password: z
    .string({ message: 'Password is required' })
    .min(1, 'Password is required')
    .min(8, 'Incorrect password format')
    .regex(/[A-Z]/, 'Incorrect password format')
    .regex(/[0-9]/, 'Incorrect password format')
    .regex(/[!@#$%^&*_]/, 'Incorrect password format'),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

