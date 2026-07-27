export interface ShortUrl {
  id: string;
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface Pagination {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

export interface GetLinksResponseData {
  shortUrls: ShortUrl[];
  pagination: Pagination;
}

export interface ShortenUrlResponseData {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  expiresAt: string;
  createdAt: string;
}