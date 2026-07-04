import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../utils/logger';

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl;

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error', err);
    }
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      error: err.constructor.name.replace('Error', ''),
      path,
      meta: { timestamp },
    });
  }

  // Unknown/unexpected error — never leak internals to the client
  logger.error('Unhandled error', err);
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: 'Internal server error',
    error: 'InternalServerError',
    path,
    meta: { timestamp },
  });
}
