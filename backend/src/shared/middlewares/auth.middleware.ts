import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.util';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { ForbiddenError } from '../errors/forbidden.error';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis.config';

/**
 * Middleware that lets only authenticated users with a valid access token
 * access the route. Decodes the token and attaches the payload to req.user.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    logger.debug(`Extracting access token from request headers`);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid Authorization header');
      return next(new UnauthorizedError('Missing or invalid access token'));
    }
    const token = authHeader.substring(7).trim(); // Extract the token
    logger.debug(`Access token extracted`);

    // Check Redis blocklist
    logger.debug(`Checking if access token is blocklisted`);
    const isBlacklisted = await redisClient.get(`blacklisted_access_token:${token}`);
    if (isBlacklisted) {
      logger.warn('Authentication failed: Access token is blocklisted');
      return next(new UnauthorizedError('Invalid or expired access token'));
    }

    logger.debug(`Verifying access token`);
    const decoded = verifyAccessToken(token);
    // Attach decoded user token payload to the request object
    req.user = decoded;
    logger.debug(`Access token verified successfully`);
    next();
  } catch (error) {
    logger.warn('Authentication failed: Token verification failed', error);
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}

/**
 * Middleware that restricts access to users with specific roles.
 * Must be registered AFTER the authenticate middleware.
 */
export function authorize(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('Authorization failed: No user attached to request');
      return next(new UnauthorizedError('Missing or invalid access token'));
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user.userId} has role ${req.user.role}, required roles: [${roles.join(', ')}]`);
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }
    logger.debug(`User ${req.user.userId} with role ${req.user.role} authorized successfully`);
    next();
  };
}

/**
 * Middleware that optionally authenticates a user. If a valid access token is provided,
 * decodes and attaches the payload to req.user. If no token is provided, it proceeds
 * as an unauthenticated request without throwing an error.
 */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    logger.debug(`Extracting access token optionally from request headers`);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('No access token provided, proceeding as anonymous request');
      return next();
    }
    const token = authHeader.substring(7).trim(); // Extract the token
    logger.debug(`Access token extracted`);

    // Check Redis blocklist
    logger.debug(`Checking if access token is blocklisted optionally`);
    const isBlacklisted = await redisClient.get(`blacklisted_access_token:${token}`);
    if (isBlacklisted) {
      logger.debug('Optional authentication failed: Access token is blocklisted');
      return next(); // Proceed as anonymous request if blocklisted
    }

    logger.debug(`Verifying access token optionally`);
    const decoded = verifyAccessToken(token);
    // Attach decoded user token payload to the request object
    req.user = decoded;
    logger.debug(`Access token verified successfully`);
    next();
  } catch (error) {
    logger.warn('Optional authentication failed: Token verification failed', error);
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}

