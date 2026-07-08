import { z } from 'zod';

export const shortenUrlSchema = z.object({
  originalUrl: z.url('originalUrl must be a valid URL'),
  expirationTime: z.number().int().positive('expirationTime must be a positive integer').optional(),
});

export type ShortenUrlSchemaType = z.infer<typeof shortenUrlSchema>;
