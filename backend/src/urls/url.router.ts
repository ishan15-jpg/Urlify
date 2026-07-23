import { Router } from 'express';
import { urlController } from './url.module';
import { optionalAuthenticate, authenticate } from '../shared/middlewares/auth.middleware';
import validate from '../shared/middlewares/validate.middleware';
import { shortenUrlSchema } from './url.schema';
import { logger } from '../shared/utils/logger';

export const urlRouter = Router();

// POST /api/v1/shorten
// Middleware chain: optionalAuthenticate → validate.validateShortenUrlRequest(shortenUrlSchema) → urlController.shortenUrl
urlRouter.post('/shorten',
  (_, __, next) => { logger.info(`POST /shorten request received`); next(); },
  optionalAuthenticate,
  validate.validateShortenUrlRequest(shortenUrlSchema),
  urlController.shortenUrl
);

// GET /api/v1/url/me
// Returns paginated list of URLs created by the authenticated user
urlRouter.get('/me',
  (_, __, next) => { logger.info(`GET /me request received`); next(); },
  authenticate,
  urlController.getMyUrls
);
