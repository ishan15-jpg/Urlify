import { Request, Response, NextFunction } from 'express';
import { IUrlService } from './interfaces/url-service.interface';
import { logger } from '../shared/utils/logger';

export class UrlController {
  constructor(private readonly urlService: IUrlService) {}

  shortenUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { originalUrl, expirationTime } = req.body;
      // If user is authenticated, req.user will be populated. If not, it is undefined.
      const userId = req.user ? req.user.userId : null;

      logger.info(`Shorten URL request received: ${originalUrl} for user: ${userId || 'anonymous'}, expirationTime: ${expirationTime}`);
      const { url, shortCode, shortUrl } = await this.urlService.shortenUrl({
        originalUrl,
        userId,
        expirationTime,
      });

      logger.info(`URL successfully shortened: ${shortCode}`);
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'URL shortened successfully',
        data: {
          shortCode,
          shortUrl,
          originalUrl: url.originalUrl,
          expiresAt: url.expiresAt ? url.expiresAt.toISOString() : null,
          createdAt: url.createdAt.toISOString(),
        },
        meta: {
          requestId: req.headers['x-request-id'] ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  redirectToOriginalUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shortCode } = req.params;
      logger.info(`Redirect request received for shortCode: ${shortCode}`);
      
      const originalUrl = await this.urlService.getOriginalUrl(shortCode as string);
      
      logger.info(`Redirecting shortCode: ${shortCode} to: ${originalUrl}`);
      res.redirect(302, originalUrl);
    } catch (err) {
      next(err);
    }
  };
}
