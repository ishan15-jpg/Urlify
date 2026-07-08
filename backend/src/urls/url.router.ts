import { Router } from 'express';
import { urlController } from './url.module';
import { optionalAuthenticate } from '../shared/middlewares/auth.middleware';
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
