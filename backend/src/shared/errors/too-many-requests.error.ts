import { AppError } from './app-error';

export class TooManyRequestsError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(message: string = 'Too many requests, please try again later.') {
    super(message);
  }
}
