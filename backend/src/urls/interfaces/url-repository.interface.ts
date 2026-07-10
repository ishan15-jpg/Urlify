import { Url } from '../url.entity';

export interface IUrlRepository {
  /**
   * Inserts a record with a temporary unique shortcode to retrieve the database numeric ID.
   *
   * @param params - The original URL, optional user ID, and optional expiry date.
   * @returns The generated database ID.
   */
  createPlaceholder(params: {
    originalUrl: string;
    userId: string | null;
    expiresAt?: Date | null;
  }): Promise<{ id: string }>;

  /**
   * Updates the short_url column of a record with the permanent shortcode.
   *
   * @param id - The numeric ID of the record.
   * @param shortUrl - The shortcode to update.
   * @returns The fully updated Url entity.
   */
  updateShortUrl(id: string, shortUrl: string): Promise<Url>;

  /**
   * Finds a URL record by its primary key ID.
   *
   * @param id - The primary key ID of the record.
   * @returns The matching Url entity or null.
   */
  findById(id: string): Promise<Url | null>;

  /**
   * Finds a URL record by its shortcode.
   *
   * @param shortUrl - The shortcode of the record.
   * @returns The matching Url entity or null.
   */
  findByShortUrl(shortUrl: string): Promise<Url | null>;

  /**
   * Increments the click count of a URL record by its shortcode.
   *
   * @param shortUrl - The shortcode of the record.
   */
  incrementClickCount(shortUrl: string): Promise<void>;

  /**
   * Retrieves a paginated list of short URL entities matching parameters.
   */
  findAll(params: {
    offset: number;
    limit: number;
    search?: string;
    sortBy?: 'clicks' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    status?: 'active' | 'expired';
  }): Promise<{ urls: Url[]; totalItems: number }>;
}
