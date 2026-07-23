import type { ILinksRepository } from './interfaces/linksRepositoryInterface';
import type { LinksResponseData } from '../../types';
import type { ApiResponse } from '../../types/apiResponse';
import type { IHttpClient } from '../../types';

export default class LinksRepository implements ILinksRepository {
  private apiClient: IHttpClient

  constructor(apiClient: IHttpClient) {
    this.apiClient = apiClient;
  }

  public async getLinks(page: number = 1, limit: number = 20): Promise<ApiResponse<LinksResponseData>> {
    return await this.apiClient.get<ApiResponse<LinksResponseData>>('/url/me', {
    params: { page, limit }
    });
  }
}
