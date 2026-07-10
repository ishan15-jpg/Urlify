import { IUrlService } from './interfaces/url-service.interface';
import { IUrlRepository } from './interfaces/url-repository.interface';
import { encodeBase62 } from '../shared/utils/base62.util';
import { isValidUrl } from '../shared/utils/url-validation.util';
import { ValidationError } from '../shared/errors/validation.error';
import { logger } from '../shared/utils/logger';
import { redisClient } from '../shared/config/redis.config';
import { Url } from './url.entity';
import { NotFoundError } from '../shared/errors/not-found.error';
import { GoneError } from '../shared/errors/gone.error';

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

  async getOriginalUrl(shortCode: string): Promise<string> {
    const cacheKey = `url:${shortCode}`;
    
    // 1. First check the cache for original URL
    try {
      logger.debug(`Getting ${cacheKey} from redis`);
      const cachedUrl = await redisClient.get(cacheKey);
      if (cachedUrl) {
        logger.info(`Redis cache hit for shortCode: ${shortCode} -> ${cachedUrl}`);
        // 2. Return original url and asynchronously update click counts in background
        this.urlRepository.incrementClickCount(shortCode).catch(err => {
          logger.error(`Failed to increment click count in background for shortCode: ${shortCode}:`, err);
        });
        return cachedUrl;
      }
    } catch (err) {
      logger.error(`Redis read error: ${err}. Falling back to DB directly.`);
      const urlRecord = await this.urlRepository.findByShortUrl(shortCode);
      if (!urlRecord) throw new NotFoundError('URL', shortCode);
      if (urlRecord.isExpired || (urlRecord.expiresAt && urlRecord.expiresAt < new Date())) {
        throw new GoneError(shortCode);
      }
      return urlRecord.originalUrl;
    }

    // 3. Cache miss: Acquire lock for 2 seconds
    const lockKey = `lock:url:${shortCode}`;
    const lockToken = Math.random().toString(36).substring(2) + Date.now().toString();
    const lockTimeoutMs = 2000; // 2 seconds lock timeout parameter

    try {
      logger.debug(`Acquiring lock for key ${lockKey} with token ${lockToken} for ${lockTimeoutMs}ms`);
      const acquired = await redisClient.set(lockKey, lockToken, 'PX', lockTimeoutMs, 'NX');
      
      if (acquired === 'OK') {
        logger.info(`Acquired lock for shortCode: ${shortCode}. Fetching from DB.`);
        try {
          // 4. Query DB, 5. Raise error according to record get found or expired
          logger.debug(`Fetching from DB for shortCode ${shortCode}`);
          const urlRecord = await this.urlRepository.findByShortUrl(shortCode);
          if (!urlRecord) {
            logger.warn(`Failed to fetch for shortCode ${shortCode}`);
            throw new NotFoundError('URL', shortCode);
          }
          if (urlRecord.isExpired || (urlRecord.expiresAt && urlRecord.expiresAt < new Date())) {
            logger.warn(`URL expired for shortCode ${shortCode}`);
            throw new GoneError(shortCode);
          }
          
          const originalUrl = urlRecord.originalUrl;
          const expiresAt = urlRecord.expiresAt;
          
          // 7. Store result in cache and update click count asynchronously in background (private helper)
          this.processPostFetch(shortCode, cacheKey, originalUrl, expiresAt).catch(err => {
            logger.error(`Error in post-fetch processing for shortCode ${shortCode}:`, err);
          });
          
          // Release lock asynchronously in the background
          this.releaseLock(lockKey, lockToken).catch(err => {
            logger.error(`Error in releasing lock for shortCode ${shortCode}:`, err);
          });
          
          // 6. Return original url
          return originalUrl;
        } catch (error) {
          // Ensure the lock is released in case of errors
          this.releaseLock(lockKey, lockToken).catch(err => {
            logger.error(`Error in releasing lock on error for shortCode ${shortCode}:`, err);
          });
          throw error;
        }
      } else {
        // Lock failed: Poll cache for the value
        logger.info(`Lock failed for shortCode: ${shortCode}. Polling Redis.`);
        const maxRetries = 20;
        const retryDelayMs = 50;
        for (let i = 0; i < maxRetries; i++) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          const polledUrl = await redisClient.get(cacheKey);
          if (polledUrl) {
            logger.info(`Found polled value in Redis cache for shortCode: ${shortCode}`);
            this.urlRepository.incrementClickCount(shortCode).catch(err => {
              logger.error(`Failed to increment click count in background for shortCode: ${shortCode}:`, err);
            });
            return polledUrl;
          }
        }
        
        // Fallback: If still not in cache, query directly from DB and heal cache
        logger.warn(`Redis lock polling timed out for shortCode: ${shortCode}. Falling back to DB query and caching mapping.`);
        const urlRecord = await this.urlRepository.findByShortUrl(shortCode);
        if (!urlRecord) {
          throw new NotFoundError('URL', shortCode);
        }
        if (urlRecord.isExpired || (urlRecord.expiresAt && urlRecord.expiresAt < new Date())) {
          throw new GoneError(shortCode);
        }

        const originalUrl = urlRecord.originalUrl;
        const expiresAt = urlRecord.expiresAt;
        
        this.processPostFetch(shortCode, cacheKey, originalUrl, expiresAt).catch(err => {
          logger.error(`Error in post-fetch processing on fallback for shortCode ${shortCode}:`, err);
        });
        return originalUrl;
      }
    } catch (err) {
      // Robust error handling for lock acquisition / Redis failure
      logger.error(`Redis lock error: ${err}. Falling back to direct DB query.`);
      const urlRecord = await this.urlRepository.findByShortUrl(shortCode);
      if (!urlRecord) {
        throw new NotFoundError('URL', shortCode);
      }
      if (urlRecord.isExpired || (urlRecord.expiresAt && urlRecord.expiresAt < new Date())) {
        throw new GoneError(shortCode);
      }
      
      this.urlRepository.incrementClickCount(shortCode).catch(err => {
        logger.error(`Failed to increment click count in background for shortCode: ${shortCode}:`, err);
      });
      return urlRecord.originalUrl;
    }
  }

  private async processPostFetch(shortCode: string, cacheKey: string, originalUrl: string, expiresAt: Date | null): Promise<void> {
    // 1. Asynchronously increment click count in DB
    this.urlRepository.incrementClickCount(shortCode).catch(err => {
      logger.error(`Failed to increment click count in background for shortCode: ${shortCode}:`, err);
    });

    // 2. Asynchronously cache the mapping in Redis
    try {
      if (expiresAt) {
        const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
        if (ttl > 0) {
          await redisClient.set(cacheKey, originalUrl, 'EX', ttl);
        }
      } else {
        await redisClient.set(cacheKey, originalUrl, 'EX', 24*60*60);
      }
    } catch (err) {
      logger.error(`Failed to cache URL in background for shortCode: ${shortCode}:`, err);
    }
  }

  private async releaseLock(lockKey: string, lockToken: string): Promise<void> {
    try {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await redisClient.eval(luaScript, 1, lockKey, lockToken);
    } catch (err) {
      logger.error(`Failed to release lock in background for lockKey: ${lockKey}:`, err);
    }
  }

  async getShortUrls(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: 'clicks' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    status?: 'active' | 'expired';
  }): Promise<{ urls: Url[]; totalItems: number }> {
    const offset = (params.page - 1) * params.limit;
    logger.info(`Fetching short URLs service: page=${params.page}, limit=${params.limit}, offset=${offset}`);
    return this.urlRepository.findAll({
      offset,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status: params.status,
    });
  }
}
