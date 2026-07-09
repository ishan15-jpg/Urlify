import { Url } from '../url.entity';

export interface IUrlService {
  /**
   * Validates and shortens an original URL. Supports both authenticated and anonymous workflows.
   *
   * @param params - The original URL and optional user ID.
   * @returns The updated Url entity along with generated shortcode and full short URL.
   */
  shortenUrl(params: {
    originalUrl: string;
    userId: string | null;
    expirationTime?: number;
  }): Promise<{
    url: Url;
    shortCode: string;
    shortUrl: string;
  }>;

  /**
   * Retrieves the original destination URL for a given shortcode.
   * Leverages caching, locking, and fallback strategies.
   *
   * @param shortCode - The unique short URL identifier code.
   * @returns The destination URL string.
   */
  getOriginalUrl(shortCode: string): Promise<string>;
}
