import { Request, Response, NextFunction } from 'express';
import z from 'zod';
import { ValidationError } from '../errors/validation.error';
import { logger } from '../utils/logger';

class ValidateRequest {
  private static instance: ValidateRequest;

  private constructor() {}

  public static getInstance(): ValidateRequest {
    if (!ValidateRequest.instance) {
      ValidateRequest.instance = new ValidateRequest();
    }
    return ValidateRequest.instance;
  }

  validateRegisterRequest = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`Validating request`)
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn(`Request failed due to invalid request body`);
        const firstMessage = result.error.issues[0]?.message || 'Invalid request body';
        return next(new ValidationError(firstMessage, result.error.flatten()));
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
        const firstMessage = result.error.issues[0]?.message || 'Invalid request body';
        return next(new ValidationError(firstMessage, result.error.flatten()));
      }
      logger.debug(`Login request validated successfully`)
      req.body = result.data; // now typed & sanitized
      next();
    };
  }

  validateVerifyEmailRequest = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`Validating verify email request`)
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn(`Verify email request failed due to invalid request body`);
        const firstMessage = result.error.issues[0]?.message || 'Invalid request body';
        return next(new ValidationError(firstMessage, result.error.flatten()));
      }
      logger.debug(`Verify email request validated successfully`)
      req.body = result.data; // now typed & sanitized
      next();
    };
  }

  validateForgotPasswordRequest = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`Validating forgot password request`)
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn(`Forgot password request failed due to invalid request body`);
        const firstMessage = result.error.issues[0]?.message || 'Invalid request body';
        return next(new ValidationError(firstMessage, result.error.flatten));
      }
      logger.debug(`Forgot password request validated successfully`)
      req.body = result.data; // now typed & sanitized
      next();
    };
  }

  validateResetPasswordRequest = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`Validating reset password request`)
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn(`Reset password request failed due to invalid request body`);
        const firstMessage = result.error.issues[0]?.message || 'Invalid request body';
        return next(new ValidationError(firstMessage, result.error.flatten));
      }
      logger.debug(`Reset password request validated successfully`)
      req.body = result.data; // now typed & sanitized
      next();
    };
  }

  validateGetUsersQuery = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`Validating get users query parameters`);
      const result = schema.safeParse(req.query);
      if (!result.success) {
        logger.warn(`Get users request failed due to invalid query parameters`);
        const firstMessage = result.error.issues[0]?.message || 'Invalid query parameters';
        return next(new ValidationError(firstMessage, result.error.flatten));
      }
      logger.debug(`Get users query parameters validated successfully`);
      // Redefine req.query to return the validated and coerced parameters
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      next();
    };
  }

  validateBlocklistRequest = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`Validating blocklist request`);
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn(`Blocklist request failed due to invalid request body`);
        const firstMessage = result.error.issues[0]?.message || 'Invalid request body';
        return next(new ValidationError(firstMessage, result.error.flatten));
      }
      logger.debug(`Blocklist request validated successfully`);
      req.body = result.data; // now typed & sanitized
      next();
    };
  }

  validateShortenUrlRequest = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`Validating shorten URL request`);
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn(`Shorten URL request failed due to invalid request body`);
        const firstMessage = result.error.issues[0]?.message || 'Invalid request body';
        return next(new ValidationError(firstMessage, result.error.flatten));
      }
      logger.debug(`Shorten URL request validated successfully`);
      req.body = result.data; // now typed & sanitized
      next();
    };
  }
}

export default ValidateRequest.getInstance();