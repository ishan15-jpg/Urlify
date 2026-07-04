import { z } from 'zod';

/**
 * Zod schema for POST /auth/register request body.
 *
 * Rules (from API design doc):
 * - name    : required, non-empty string
 * - email   : required, must be a valid email format
 * - password: required, min 8 chars, at least 1 uppercase letter,
 *             1 digit, and 1 special character
 */
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
