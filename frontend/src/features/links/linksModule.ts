import LinksRepository from './linksRepository';
import apiClient from '../../api/apiClient';
import LinksService from './linksService';

const linksRepository = new LinksRepository(apiClient);
export const linksService = new LinksService(linksRepository);
