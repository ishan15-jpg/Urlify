import type { LinksResponseData } from '../../../types';

export interface ILinksService {
  /**
   * Fetches the paginated short URLs created by the currently authenticated user.
   * @param page Page number
   * @param limit Items per page
   */
  getLinks(page?: number, limit?: number): Promise<LinksResponseData>;
}
