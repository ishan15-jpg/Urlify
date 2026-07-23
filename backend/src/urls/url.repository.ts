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

  async incrementClickCount(shortUrl: string): Promise<void> {
    logger.debug(`Database query: incrementClickCount initiated for shortUrl ${shortUrl}`);
    await this.db.query(
      `UPDATE urls
       SET click_count = click_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE short_url = $1 AND is_deleted = false`,
      [shortUrl],
    );
  }

  async findAll(params: {
    offset: number;
    limit: number;
    search?: string;
    sortBy?: 'clicks' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    status?: 'active' | 'expired';
  }): Promise<{ urls: Url[]; totalItems: number }> {
    const conditions: string[] = ['is_deleted = false'];
    const queryValues: unknown[] = [];

    // Filter by status
    if (params.status === 'active') {
      conditions.push('(is_expired = false AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP))');
    } else if (params.status === 'expired') {
      conditions.push('(is_expired = true OR (expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP))');
    }

    // Filter by search matching shortCode or originalUrl
    if (params.search) {
      queryValues.push(`%${params.search}%`);
      conditions.push(`(short_url ILIKE $${queryValues.length} OR original_url ILIKE $${queryValues.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Fetch total count
    const countQuery = `SELECT COUNT(*) as count FROM urls ${whereClause}`;
    const countResult = await this.db.query<{ count: string }>(countQuery, queryValues);
    const totalItems = parseInt(countResult.rows[0]?.count || '0', 10);

    // 2. Sorting
    const sortField = params.sortBy === 'clicks' ? 'click_count' : 'created_at';
    const direction = params.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const orderBy = `ORDER BY ${sortField} ${direction}, created_at DESC`;

    // 3. Limit and Offset pagination
    queryValues.push(params.limit);
    const limitPlaceholder = `$${queryValues.length}`;
    queryValues.push(params.offset);
    const offsetPlaceholder = `$${queryValues.length}`;

    const selectQuery = `
      SELECT id, user_id, original_url, short_url, is_deleted, is_expired, click_count, expires_at, created_at, updated_at
      FROM urls
      ${whereClause}
      ${orderBy}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    logger.debug(`Database query: findAll short URLs. countQuery: ${countQuery}, selectQuery: ${selectQuery}`);
    const result = await this.db.query<Record<string, unknown>>(selectQuery, queryValues);
    const urls = result.rows.map((row) => this.toEntity(row));

    return { urls, totalItems };
  }

  async findByUserId(userId: string, params: {
    offset: number;
    limit: number;
  }): Promise<{ urls: Url[]; totalItems: number }> {
    logger.debug(`Database query: findByUserId initiated for user: ${userId}, offset: ${params.offset}, limit: ${params.limit}`);
    const conditions = [
      'user_id = $1',
      'is_deleted = false',
      '(is_expired = false AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP))',
    ];
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 1. Fetch total count
    const countQuery = `SELECT COUNT(*) as count FROM urls ${whereClause}`;
    const countResult = await this.db.query<{ count: string }>(countQuery, [userId]);
    const totalItems = parseInt(countResult.rows[0]?.count || '0', 10);

    // 2. Select paginated results ordered by creation time descending
    const selectQuery = `
      SELECT id, user_id, original_url, short_url, is_deleted, is_expired, click_count, expires_at, created_at, updated_at
      FROM urls
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query<Record<string, unknown>>(selectQuery, [userId, params.limit, params.offset]);
    const urls = result.rows.map((row) => this.toEntity(row));

    return { urls, totalItems };
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
