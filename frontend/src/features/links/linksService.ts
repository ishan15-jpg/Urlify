import type { ILinksService } from './interfaces/linksServiceInterface';
import type { ILinksRepository } from './interfaces/linksRepositoryInterface';
import type { GetLinksResponseData, ShortenUrlResponseData } from '../../types';

export default class LinksService implements ILinksService {
  private linksRepository: ILinksRepository;

  constructor(linksRepository: ILinksRepository) {
    this.linksRepository = linksRepository;
  }

  public async getLinks(page: number = 1, limit: number = 20): Promise<GetLinksResponseData> {
    const response = await this.linksRepository.getLinks(page, limit);
    return response.data;
  }

  public async shortenUrl(originalUrl: string, expirationMode: string, customDays: string): Promise<ShortenUrlResponseData> {
    let expiresAt: number | null = null;

    if (expirationMode !== 'never') {
      const days = expirationMode === 'custom' ? parseInt(customDays, 10) : parseInt(expirationMode, 10);
      if (!isNaN(days) && days > 0) {
        expiresAt = days;
      }
    }

    const response = await this.linksRepository.shortenUrl(originalUrl, "", expiresAt);
    return response.data;
  }
}
