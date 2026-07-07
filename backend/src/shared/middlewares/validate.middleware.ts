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
        return next(new ValidationError(firstMessage, result.error.flatten()));
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
        return next(new ValidationError(firstMessage, result.error.flatten()));
      }
      logger.debug(`Reset password request validated successfully`)
      req.body = result.data; // now typed & sanitized
      next();
    };
  }
}

export default ValidateRequest.getInstance();