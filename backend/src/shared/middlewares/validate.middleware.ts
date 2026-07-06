import { Request, Response, NextFunction } from 'express';
import z from 'zod';
import { ValidationError } from '../errors/validation.error';
import { logger } from '../utils/logger';

class ValidateRequest {
  validateRegisterRequest = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`Validating request`)
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn(`Request failed due to invalid request body`);
        return next(new ValidationError('Invalid request body', result.error.flatten));
      }
      logger.debug(`Registration request validated successfully`)
      req.body = result.data; // now typed & sanitized
      next();
    };
  }

  validateLoginRequest = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`Validating login request`)
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn(`Login request failed due to invalid request body`);
        return next(new ValidationError('Invalid request body', result.error.flatten));
      }
      logger.debug(`Login request validated successfully`)
      req.body = result.data; // now typed & sanitized
      next();
    };
  }
}

export default new ValidateRequest();