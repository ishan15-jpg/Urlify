import { Router } from 'express';
import { authController } from './auth.module';
import { validate } from '../shared/middlewares/validate.middleware';
import { registerSchema } from './auth.schema';

/**
 * Auth router — all paths here are relative to the mount point in app.ts.
 * The v1 prefix is applied at the app level: app.use('/api/v1/auth', authRouter)
 */
export const authRouter = Router();

// POST /api/v1/auth/register
// Middleware chain: validate(registerSchema) → authController.register
authRouter.post('/register', validate(registerSchema), authController.register);
