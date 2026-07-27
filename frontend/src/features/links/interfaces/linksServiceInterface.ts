import type { GetLinksResponseData, ShortenUrlResponseData } from '../../../types';

export interface ILinksService {
  /**
   * Fetches the paginated short URLs created by the currently authenticated user.
   * @param page Page number
   * @param limit Items per page
   */
  getLinks(page?: number, limit?: number): Promise<GetLinksResponseData>;

  /**
   * Shortens a given URL.
   * @param originalUrl The original long URL
   * @param expirationMode The expiration mode (never, custom, etc)
   * @param customDays The number of custom days
   */
  shortenUrl(originalUrl: string, expirationMode: string, customDays: string): Promise<ShortenUrlResponseData>;
}
