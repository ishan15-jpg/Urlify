import type { ILinksRepository } from './interfaces/linksRepositoryInterface';
import type { ApiResponse, IHttpClient, GetLinksResponseData, ShortenUrlResponseData } from '../../types';

export default class LinksRepository implements ILinksRepository {
  private apiClient: IHttpClient

  constructor(apiClient: IHttpClient) {
    this.apiClient = apiClient;
  }

  public async getLinks(page: number = 1, limit: number = 20): Promise<ApiResponse<GetLinksResponseData>> {
    return await this.apiClient.get<ApiResponse<GetLinksResponseData>>('/url/me', {
    params: { page, limit }
    });
  }

  public async shortenUrl(originalUrl: string, customAlias: string, expiresAt?: number | null): Promise<ApiResponse<ShortenUrlResponseData>> {
    return await this.apiClient.post<ApiResponse<ShortenUrlResponseData>>('/url/shorten', {
      originalUrl,
      customAlias,
      expiresAt,
    });
  }
}
