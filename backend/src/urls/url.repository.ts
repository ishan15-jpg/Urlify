import { Pool } from 'pg';
import { IUrlRepository } from './interfaces/url-repository.interface';
import { Url } from './url.entity';
import { logger } from '../shared/utils/logger';
import { NotFoundError } from '../shared/errors/not-found.error';

export class UrlRepository implements IUrlRepository {
  constructor(private readonly db: Pool) {}

  async createPlaceholder(params: {
    originalUrl: string;
    userId: string | null;
    expiresAt?: Date | null;
  }): Promise<{ id: string }> {
    logger.debug(`Database query: createPlaceholder initiated`);
    
    // We generate a unique temporary shortcode to bypass the unique constraint
    const tempShortUrl = 'temp_' + Math.random().toString(36).substring(2) + '_' + Date.now();
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO urls (original_url, short_url, user_id, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [params.originalUrl, tempShortUrl, params.userId, params.expiresAt || null],
    );
    return result.rows[0];
  }

  async updateShortUrl(id: string, shortUrl: string): Promise<Url> {
    logger.debug(`Database query: updateShortUrl initiated for ID ${id}`);
    const result = await this.db.query<Record<string, unknown>>(
      `UPDATE urls
       SET short_url = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, user_id, original_url, short_url, is_deleted, is_expired, click_count, expires_at, created_at, updated_at`,
      [id, shortUrl],
    );

    if (!result.rows[0]) {
      logger.warn(`Failed to update short_url: URL with ID ${id} not found`);
      throw new NotFoundError('URL', id);
    }
    return this.toEntity(result.rows[0]);
  }

  async findById(id: string): Promise<Url | null> {
    logger.debug(`Database query: findById initiated for ID ${id}`);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT id, user_id, original_url, short_url, is_deleted, is_expired, click_count, expires_at, created_at, updated_at
       FROM urls
       WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (!result.rows[0]) {
      return null;
    }
    return this.toEntity(result.rows[0]);
  }

  async findByShortUrl(shortUrl: string): Promise<Url | null> {
    logger.debug(`Database query: findByShortUrl initiated for ${shortUrl}`);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT id, user_id, original_url, short_url, is_deleted, is_expired, click_count, expires_at, created_at, updated_at
       FROM urls
       WHERE short_url = $1 AND is_deleted = false`,
      [shortUrl],
    );

    if (!result.rows[0]) {
      return null;
    }
    return this.toEntity(result.rows[0]);
  }

  private toEntity(row: Record<string, unknown>): Url {
    return {
      id: String(row['id']),
      userId: (row['user_id'] as string) || null,
      originalUrl: row['original_url'] as string,
      shortUrl: row['short_url'] as string,
      isDeleted: row['is_deleted'] as boolean,
      isExpired: row['is_expired'] as boolean,
      clickCount: Number(row['click_count']),
      expiresAt: row['expires_at'] ? new Date(row['expires_at'] as string) : null,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
