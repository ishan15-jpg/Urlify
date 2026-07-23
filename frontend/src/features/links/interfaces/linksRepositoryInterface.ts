import { type LinksResponseData } from "../../../types";
import type { ApiResponse } from "../../../types/apiResponse";

export interface ILinksRepository {
  /**
   * Fetches the paginated short URLs created by the currently authenticated user.
   * @param page Page number
   * @param limit Items per page
   */
  getLinks(page?: number, limit?: number): Promise<ApiResponse<LinksResponseData>>;
}
