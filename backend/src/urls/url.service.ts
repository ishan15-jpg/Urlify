import { IUrlService } from './interfaces/url-service.interface';
import { IUrlRepository } from './interfaces/url-repository.interface';
import { encodeBase62 } from '../shared/utils/base62.util';
import { isValidUrl } from '../shared/utils/url-validation.util';
import { ValidationError } from '../shared/errors/validation.error';
import { logger } from '../shared/utils/logger';
import { redisClient } from '../shared/config/redis.config';
import { Url } from './url.entity';

export class UrlService implements IUrlService {
  constructor(private readonly urlRepository: IUrlRepository) {}

  async shortenUrl(params: {
    originalUrl: string;
    userId: string | null;
    expirationTime?: number;
  }): Promise<{
    url: Url;
    shortCode: string;
    shortUrl: string;
  }> {
    const { originalUrl, userId, expirationTime } = params;
    logger.info(`Shortening URL: ${originalUrl} for user: ${userId || 'anonymous'}, expirationTime=${expirationTime || 'infinite'}`);

    if (!isValidUrl(originalUrl)) {
      logger.warn(`Invalid URL provided: ${originalUrl}`);
      throw new ValidationError('Invalid destination URL');
    }

    // Calculate expiration timestamp if expirationTime (in days) is provided
    const expiresAt = expirationTime
      ? new Date(Date.now() + expirationTime * 24 * 60 * 60 * 1000)
      : null;

    // 1. Store placeholder record in database to generate sequence ID
    const placeholder = await this.urlRepository.createPlaceholder({
      originalUrl,
      userId,
      expiresAt,
    });

    // 2. Base62 encode the ID to create a unique 7-character shortcode
    const id = BigInt(placeholder.id);
    const shortCode = encodeBase62(id);

    // 3. Update the record with the generated shortcode
    const updatedUrl = await this.urlRepository.updateShortUrl(placeholder.id, shortCode);

    // 4. Store the mapping in Redis for faster lookup
    const redisKey = `url:${shortCode}`;
    if (expiresAt) {
      const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        redisClient.set(redisKey, originalUrl, 'EX', ttl);
      } else {
        redisClient.set(redisKey, originalUrl);
      }
    } else {
      redisClient.set(redisKey, originalUrl);
    }
    logger.debug(`Stored mapping in Redis: ${redisKey} -> ${originalUrl}`);

    const appUrl = process.env.APP_URL || 'http://localhost:8000';
    const shortUrl = `${appUrl}/${shortCode}`;

    return {
      url: updatedUrl,
      shortCode,
      shortUrl,
    };
  }
}
