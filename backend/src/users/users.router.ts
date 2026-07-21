import { Router } from 'express';
import { usersController } from './users.module';
import { authenticate } from '../shared/middlewares/auth.middleware';
import { logger } from '../shared/utils/logger';

/**
 * Users router — all paths here are relative to the mount point in app.ts.
 * The v1 prefix is applied at the app level: app.use('/api/v1/users', usersRouter)
 */
export const usersRouter = Router();

// GET /api/v1/users/me
// Middleware chain: authenticate → usersController.getMe
usersRouter.get('/me',
  (_, __, next) => { logger.info(`GET /me request received`); next(); },
  authenticate,
  usersController.getMe
);
