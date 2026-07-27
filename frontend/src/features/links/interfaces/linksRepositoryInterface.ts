import type { GetLinksResponseData, ShortenUrlResponseData, ApiResponse } from "../../../types";

export interface ILinksRepository {
  /**
   * Fetches the paginated short URLs created by the currently authenticated user.
   * @param page Page number
   * @param limit Items per page
   */
  getLinks(page?: number, limit?: number): Promise<ApiResponse<GetLinksResponseData>>;

  /**
   * Shortens a given URL.
   * @param originalUrl The original long URL
   * @param customAlias Optional custom alias for the short URL
   * @param expiresAt Optional expiration in days
   */
  shortenUrl(originalUrl: string, customAlias: string, expiresAt?: number | null): Promise<ApiResponse<ShortenUrlResponseData>>;
}
