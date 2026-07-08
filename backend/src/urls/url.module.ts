import { db } from '../shared/config/database.config';
import { UrlRepository } from './url.repository';
import { UrlService } from './url.service';
import { UrlController } from './url.controller';

const urlRepository = new UrlRepository(db);
const urlService = new UrlService(urlRepository);
export const urlController = new UrlController(urlService);
export { urlRepository, urlService };
