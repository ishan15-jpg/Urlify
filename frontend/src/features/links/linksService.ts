import type { ILinksService } from './interfaces/linksServiceInterface';
import type { ILinksRepository } from './interfaces/linksRepositoryInterface';
import type { LinksResponseData } from '../../types';

export default class LinksService implements ILinksService {
  private linksRepository: ILinksRepository;

  constructor(linksRepository: ILinksRepository) {
    this.linksRepository = linksRepository;
  }

  public async getLinks(page: number = 1, limit: number = 20): Promise<LinksResponseData> {
    const response = await this.linksRepository.getLinks(page, limit);
    return response.data;
  }
}
