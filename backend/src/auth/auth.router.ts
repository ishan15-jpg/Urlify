import { Router } from 'express';
import { authController } from './auth.module';
import validate from '../shared/middlewares/validate.middleware';
import { loginSchema, registerSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema, updatePasswordSchema } from './auth.schema';
import { logger } from '../shared/utils/logger';
import { authenticate } from '../shared/middlewares/auth.middleware';
import { createRateLimiter } from '../shared/middlewares/rate-limiter.middleware';

const registerLimiter = createRateLimiter({
  capacity: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: (req) => `register:${req.ip}`
});

const loginLimiter = createRateLimiter({
  capacity: 5,
  windowMs: 15 * 60 * 1000, // 15 min
  keyGenerator: (req) => `login:${req.ip}:${req.body?.email || 'no-email'}`
});

const verificationLinkLimiter = createRateLimiter({
  capacity: 1,
  windowMs: 60 * 1000, // 60 sec
  keyGenerator: (req) => `verification_link:${req.user?.userId || req.ip}`
});

const forgotPasswordLimiter = createRateLimiter({
  capacity: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: (req) => `forgot_pw:${req.body?.email || req.ip}`
});

const updatePasswordLimiter = createRateLimiter({
  capacity: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: (req) => `update_pw:${req.user?.userId || req.ip}`
});

const refreshLimiter = createRateLimiter({
  capacity: 10,
  windowMs: 5 * 60 * 1000, // 5 min
  keyGenerator: (req) => `refresh:${req.cookies?.refreshToken || req.ip}`
});

/**
 * Auth router — all paths here are relative to the mount point in app.ts.
 * The v1 prefix is applied at the app level: app.use('/api/v1/auth', authRouter)
 */
export const authRouter = Router();

// POST /api/v1/auth/register
// Middleware chain: validate(registerSchema) → authController.register
authRouter.post('/register', 
    (_, __, next) => { logger.info(`Registration request recieved`); next(); },  
    registerLimiter,
    validate.validateRegisterRequest(registerSchema), 
    authController.register
);

// POST /api/v1/auth/login
// Middleware chain: authController.login
authRouter.post('/login',
    (_, __, next) => { logger.info(`Login request received`); next(); },
    validate.validateLoginRequest(loginSchema),
    loginLimiter,
    authController.login
);

// POST /api/v1/auth/email-verification-link
// Middleware chain: authenticate → authController.sendEmailVerificationLink
authRouter.post('/email-verification-link',
    (_, __, next) => { logger.info(`Email verification link request received`); next(); },
    authenticate,
    verificationLinkLimiter,
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
    forgotPasswordLimiter,
    authController.forgotPassword
);

// POST /api/v1/auth/reset-password
// Middleware chain: validate(resetPasswordSchema) → authController.resetPassword
authRouter.post('/reset-password',
    (_, __, next) => { logger.info(`Reset password request received`); next(); },
    validate.validateResetPasswordRequest(resetPasswordSchema),
    authController.resetPassword
);

// POST /api/v1/auth/update-password
// Middleware chain: authenticate → validate(updatePasswordSchema) → authController.updatePassword
authRouter.post('/update-password',
    (_, __, next) => { logger.info(`Update password request received`); next(); },
    authenticate,
    updatePasswordLimiter,
    validate.validateUpdatePasswordRequest(updatePasswordSchema),
    authController.updatePassword
);

// POST /api/v1/auth/refresh
// Middleware chain: authController.refresh
authRouter.post('/refresh',
    (_, __, next) => { logger.info(`Refresh token request received`); next(); },
    refreshLimiter,
    authController.refresh
);

// POST /api/v1/auth/logout
// Middleware chain: authenticate → authController.logout
authRouter.post('/logout',
    (_, __, next) => { logger.info(`Logout request received`); next(); },
    authenticate,
    authController.logout
);


