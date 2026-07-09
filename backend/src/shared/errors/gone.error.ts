import { AppError } from './app-error';

export class GoneError extends AppError {
  readonly statusCode = 410;
  readonly isOperational = true;

  constructor(shortCode: string) {
    super(`This short link has expired: ${shortCode}`);
  }
}
