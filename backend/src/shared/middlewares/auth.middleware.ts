import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.util';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { logger } from '../utils/logger';

/**
 * Middleware that lets only authenticated users with a valid access token
 * access the route. Decodes the token and attaches the payload to req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    logger.debug(`Extracting access token from request headers`);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid Authorization header');
      return next(new UnauthorizedError('Missing or invalid access token'));
    }
    const token = authHeader.substring(7).trim(); // Extract the token
    logger.debug(`Access token extracted`);
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
