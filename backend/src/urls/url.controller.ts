import { Request, Response, NextFunction } from 'express';
import { IUrlService } from './interfaces/url-service.interface';
import { logger } from '../shared/utils/logger';
import { ShortenUrlRequestDto } from './dtos/shorten-url-request.dto';

export class UrlController {
  constructor(private readonly urlService: IUrlService) {}

  shortenUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { originalUrl, expirationTime } = req.body as ShortenUrlRequestDto;
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
      const { shortCode } = req.params as { shortCode: string };
      logger.info(`Redirect request received for shortCode: ${shortCode}`);
      
      const originalUrl = await this.urlService.getOriginalUrl(shortCode as string);
      
      logger.info(`Redirecting shortCode: ${shortCode} to: ${originalUrl}`);
      res.redirect(302, originalUrl);
    } catch (err) {
      next(err);
    }
  };

  getShortUrls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, search, sortBy, sortOrder, status } = req.query as any;
      logger.info(`Admin fetch short URLs: page=${page}, limit=${limit}, search=${search}, sortBy=${sortBy}, sortOrder=${sortOrder}, status=${status}`);
      
      const { urls, totalItems } = await this.urlService.getShortUrls({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        status,
      });

      const mappedUrls = urls.map(url => ({
        id: url.id,
        shortCode: url.shortUrl,
        originalUrl: url.originalUrl,
        ownerId: url.userId,
        clicks: url.clickCount,
        isActive: !url.isDeleted && !url.isExpired && (!url.expiresAt || url.expiresAt > new Date()),
        createdAt: url.createdAt.toISOString(),
        expiresAt: url.expiresAt ? url.expiresAt.toISOString() : null,
      }));

      const totalPages = Math.ceil(totalItems / limit);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Short URLs fetched successfully',
        data: {
          shortUrls: mappedUrls,
          pagination: {
            totalItems,
            currentPage: page,
            totalPages,
            limit,
          },
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
}
