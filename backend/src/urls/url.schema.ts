import { z } from 'zod';

export const shortenUrlSchema = z.object({
  originalUrl: z.url('originalUrl must be a valid URL'),
  expirationTime: z.number().int().positive('expirationTime must be a positive integer').optional(),
});

export type ShortenUrlSchemaType = z.infer<typeof shortenUrlSchema>;

export const getShortUrlsQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : 1),
    z.number().int().min(1, 'Page must be at least 1').default(1)
  ),
  limit: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : 20),
    z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20)
  ),
  search: z.string().optional(),
  sortBy: z.enum(['clicks', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['active', 'expired']).optional(),
});

export type GetShortUrlsQuerySchemaType = z.infer<typeof getShortUrlsQuerySchema>;
