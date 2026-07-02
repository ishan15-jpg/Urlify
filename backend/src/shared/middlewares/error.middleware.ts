import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { ValidationError } from '../errors/validation.error';
import { logger } from '../utils/logger';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error', err);
    }
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err instanceof ValidationError && err.details ? { details: err.details } : {}),
    });
  }

  // Unknown/unexpected error — never leak internals to the client
  logger.error('Unhandled error', err);
  return res.status(500).json({ error: 'Internal server error' });
}

