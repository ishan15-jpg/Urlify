import { AppError } from './app-error';

/**
 * Error thrown when authentication fails.
 * Maps to HTTP 401 Unauthorized.
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}
