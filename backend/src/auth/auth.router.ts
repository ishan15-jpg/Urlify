import { Router } from 'express';
import { authController } from './auth.module';
import validate from '../shared/middlewares/validate.middleware';
import { loginSchema, registerSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema';
import { logger } from '../shared/utils/logger';
import { authenticate } from '../shared/middlewares/auth.middleware';

/**
 * Auth router — all paths here are relative to the mount point in app.ts.
 * The v1 prefix is applied at the app level: app.use('/api/v1/auth', authRouter)
 */
export const authRouter = Router();

// POST /api/v1/auth/register
// Middleware chain: validate(registerSchema) → authController.register
authRouter.post('/register', 
    (_, __, next) => { logger.info(`Registration request recieved`); next(); },  
    validate.validateRegisterRequest(registerSchema), 
    authController.register
);

// POST /api/v1/auth/login
// Middleware chain: authController.login
authRouter.post('/login',
    (_, __, next) => { logger.info(`Login request received`); next(); },
    validate.validateLoginRequest(loginSchema),
    authController.login
);

// POST /api/v1/auth/email-verification-link
// Middleware chain: authenticate → authController.sendEmailVerificationLink
authRouter.post('/email-verification-link',
    (_, __, next) => { logger.info(`Email verification link request received`); next(); },
    authenticate,
    authController.sendEmailVerificationLink
);

// POST /api/v1/auth/verify-email
// Middleware chain: validate(verifyEmailSchema) → authController.verifyEmail
authRouter.post('/verify-email',
    (_, __, next) => { logger.info(`Email verification request received`); next(); },
    validate.validateVerifyEmailRequest(verifyEmailSchema),
    authController.verifyEmail
);

// POST /api/v1/auth/forgot-password
// Middleware chain: validate(forgotPasswordSchema) → authController.forgotPassword
authRouter.post('/forgot-password',
    (_, __, next) => { logger.info(`Forgot password request received`); next(); },
    validate.validateForgotPasswordRequest(forgotPasswordSchema),
    authController.forgotPassword
);

// POST /api/v1/auth/reset-password
// Middleware chain: validate(resetPasswordSchema) → authController.resetPassword
authRouter.post('/reset-password',
    (_, __, next) => { logger.info(`Reset password request received`); next(); },
    validate.validateResetPasswordRequest(resetPasswordSchema),
    authController.resetPassword
);


