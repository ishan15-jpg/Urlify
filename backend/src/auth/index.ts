/**
 * Auth module public API.
 *
 * Only import from this file when consuming the auth module from outside.
 * Never import directly from internal files (auth.service.ts, auth.repository.ts, etc.).
 */
export { authRouter } from './auth.router';
export type { User } from './auth.entity';
export type { IAuthService } from './interfaces/auth-service.interface';
