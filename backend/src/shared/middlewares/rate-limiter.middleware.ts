import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../utils/rate-limiter.util';
import { TooManyRequestsError } from '../errors/too-many-requests.error';
import { logger } from '../utils/logger';

const rateLimiter = new RateLimiter();

export interface RateLimiterOptions {
  capacity: number | ((req: Request) => number);
  windowMs: number | ((req: Request) => number);
  keyGenerator: (req: Request) => string | null | undefined;
  skip?: (req: Request) => boolean;
}

export const createRateLimiter = (options: RateLimiterOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (options.skip && options.skip(req)) {
        return next();
      }

      const capacity = typeof options.capacity === 'function' ? options.capacity(req) : options.capacity;
      const windowMs = typeof options.windowMs === 'function' ? options.windowMs(req) : options.windowMs;

      const identifier = options.keyGenerator(req);
      const key = identifier || req.ip || 'unknown_ip';

      logger.debug(`Checking rate limit for key: ${key}`);
      const result = await rateLimiter.consume(key, capacity, windowMs);

      // Set standard RateLimit headers
      res.setHeader('X-RateLimit-Limit', capacity.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', result.reset.toString());

      if (!result.allowed) {
        logger.warn(`Rate limit exceeded for key: ${key} on path: ${req.path}`);
        throw new TooManyRequestsError();
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
