import { Router } from 'express';
import { authController } from './auth/auth.module';
import { urlController } from './urls/url.module';
import { authenticate, authorize } from './shared/middlewares/auth.middleware';
import validate from './shared/middlewares/validate.middleware';
import { getUsersQuerySchema, blocklistUserSchema } from './auth/auth.schema';
import { getShortUrlsQuerySchema } from './urls/url.schema';
import { logger } from './shared/utils/logger';

/**
 * Admin router — all paths here are relative to the mount point in app.ts.
 * The v1/admin prefix is applied at the app level: app.use('/api/v1/admin', adminRouter)
 */
export const adminRouter = Router();

// GET /api/v1/admin/users
// Middleware chain: authenticate → authorize(['admin']) → validate.validateGetUsersQuery(getUsersQuerySchema) → authController.getUsers
adminRouter.get('/users',
  (_, __, next) => { logger.info(`Admin GET /users request received`); next(); },
  authenticate,
  authorize(['admin']),
  validate.validateGetUsersQuery(getUsersQuerySchema),
  authController.getUsers
);

// PATCH /api/v1/admin/users/:userId/blocklist
// Middleware chain: authenticate → authorize(['admin']) → validate.validateBlocklistRequest(blocklistUserSchema) → authController.updateBlocklistStatus
adminRouter.patch('/users/:userId/blocklist',
  (_, __, next) => { logger.info(`Admin PATCH /users/:userId/blocklist request received`); next(); },
  authenticate,
  authorize(['admin']),
  validate.validateBlocklistRequest(blocklistUserSchema),
  authController.updateBlocklistStatus
);

// DELETE /api/v1/admin/users/:userId
// Middleware chain: authenticate → authorize(['admin']) → authController.softDeleteUser
adminRouter.delete('/users/:userId',
  (_, __, next) => { logger.info(`Admin DELETE /users/:userId request received`); next(); },
  authenticate,
  authorize(['admin']),
  authController.softDeleteUser
);

// GET /api/v1/admin/short-urls
// Middleware chain: authenticate → authorize(['admin']) → validate.validateGetShortUrlsQuery(getShortUrlsQuerySchema) → urlController.getShortUrls
adminRouter.get('/short-urls',
  (_, __, next) => { logger.info(`Admin GET /short-urls request received`); next(); },
  authenticate,
  authorize(['admin']),
  validate.validateGetShortUrlsQuery(getShortUrlsQuerySchema),
  urlController.getShortUrls
);

// GET /api/v1/admin/short-urls/:shortURL
// Middleware chain: authenticate → authorize(['admin']) → urlController.getShortUrlDetails
adminRouter.get('/short-urls/:shortURL',
  (_, __, next) => { logger.info(`Admin GET /short-urls/:shortURL request received`); next(); },
  authenticate,
  authorize(['admin']),
  urlController.getShortUrlDetails
);


