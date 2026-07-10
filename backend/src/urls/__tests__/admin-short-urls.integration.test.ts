import request from 'supertest';
import { UrlRepository } from '../url.repository';
import { Url } from '../url.entity';
import * as tokenUtil from '../../shared/utils/token.util';

// Silence winston logs during tests
jest.mock('../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Mock pg pool — prevents real DB connections
jest.mock('../../shared/config/database.config', () => ({
  db: {},
  closeDatabasePool: jest.fn(),
}));

import app from '../../app';

function makeUrl(overrides: Partial<Url> = {}): Url {
  return {
    id: '1',
    userId: 'user-uuid',
    originalUrl: 'https://google.com',
    shortUrl: 'ggl',
    isDeleted: false,
    isExpired: false,
    clickCount: 15,
    expiresAt: null,
    createdAt: new Date('2026-07-08T12:00:00Z'),
    updatedAt: new Date('2026-07-08T12:00:00Z'),
    ...overrides,
  };
}

describe('GET /api/v1/admin/short-urls', () => {
  let findAllSpy: jest.SpyInstance;
  let findByShortUrlSpy: jest.SpyInstance;
  let verifyAccessTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    findAllSpy = jest.spyOn(UrlRepository.prototype, 'findAll');
    findByShortUrlSpy = jest.spyOn(UrlRepository.prototype, 'findByShortUrl');
    verifyAccessTokenSpy = jest.spyOn(tokenUtil, 'verifyAccessToken');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function getShortUrls(tokenHeader?: string, query: string = '') {
    const req = request(app).get(`/api/v1/admin/short-urls${query}`);
    if (tokenHeader !== undefined) {
      req.set('Authorization', tokenHeader);
    }
    return req;
  }

  // ── 401 Unauthorized ──────────────────────────────────────────────────────────
  describe('401 Unauthorized', () => {
    it('returns HTTP 401 when Authorization header is missing', async () => {
      const res = await getShortUrls();
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Missing or invalid access token');
    });

    it('returns HTTP 401 when Authorization header is invalid', async () => {
      const res = await getShortUrls('InvalidHeader');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Missing or invalid access token');
    });

    it('returns HTTP 401 when token verification fails', async () => {
      verifyAccessTokenSpy.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const res = await getShortUrls('Bearer invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired access token');
    });
  });

  // ── 403 Forbidden ───────────────────────────────────────────────────────────
  describe('403 Forbidden', () => {
    it('returns HTTP 403 when authenticated user is not an admin', async () => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'user-id',
        email: 'user@example.com',
        role: 'user',
      });
      
      const res = await getShortUrls('Bearer user-token');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access this resource');
    });
  });

  // ── 400 Bad Request — Query Validation ──────────────────────────────────────
  describe('400 Bad Request — query validation', () => {
    beforeEach(() => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
      });
    });

    it('rejects when page is less than 1', async () => {
      const res = await getShortUrls('Bearer admin-token', '?page=0');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Page must be at least 1');
    });

    it('rejects when limit is less than 1', async () => {
      const res = await getShortUrls('Bearer admin-token', '?limit=0');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Limit must be at least 1');
    });

    it('rejects when limit is greater than 100', async () => {
      const res = await getShortUrls('Bearer admin-token', '?limit=101');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Limit cannot exceed 100');
    });

    it('rejects when sortBy is invalid', async () => {
      const res = await getShortUrls('Bearer admin-token', '?sortBy=invalid');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects when sortOrder is invalid', async () => {
      const res = await getShortUrls('Bearer admin-token', '?sortOrder=invalid');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects when status is invalid', async () => {
      const res = await getShortUrls('Bearer admin-token', '?status=invalid');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── 200 OK — Success cases ──────────────────────────────────────────────────
  describe('200 OK — success', () => {
    beforeEach(() => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
      });
    });

    it('successfully fetches short URLs with default pagination parameters', async () => {
      const mockUrls = [
        makeUrl({ id: '1', shortUrl: 'g1', clickCount: 10 }),
        makeUrl({ id: '2', shortUrl: 'g2', clickCount: 20 }),
      ];
      findAllSpy.mockResolvedValue({
        urls: mockUrls,
        totalItems: 2,
      });

      const res = await getShortUrls('Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Short URLs fetched successfully');
      expect(res.body.data.shortUrls).toHaveLength(2);
      expect(res.body.data.shortUrls[0]).toEqual({
        id: '1',
        shortCode: 'g1',
        originalUrl: 'https://google.com',
        ownerId: 'user-uuid',
        clicks: 10,
        isActive: true,
        createdAt: '2026-07-08T12:00:00.000Z',
        expiresAt: null,
      });

      expect(res.body.data.pagination).toEqual({
        totalItems: 2,
        currentPage: 1,
        totalPages: 1,
        limit: 20,
      });

      expect(findAllSpy).toHaveBeenCalledWith({
        offset: 0,
        limit: 20,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        status: undefined,
      });
    });

    it('successfully propagates query parameters to database repository', async () => {
      findAllSpy.mockResolvedValue({
        urls: [],
        totalItems: 0,
      });

      const query = '?page=3&limit=10&search=test&sortBy=clicks&sortOrder=asc&status=active';
      const res = await getShortUrls('Bearer admin-token', query);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination).toEqual({
        totalItems: 0,
        currentPage: 3,
        totalPages: 0,
        limit: 10,
      });

      expect(findAllSpy).toHaveBeenCalledWith({
        offset: 20,
        limit: 10,
        search: 'test',
        sortBy: 'clicks',
        sortOrder: 'asc',
        status: 'active',
      });
    });

    it('accurately calculates isActive status property based on isDeleted, isExpired and expiresAt', async () => {
      const activeUrl = makeUrl({ id: '1', isDeleted: false, isExpired: false, expiresAt: null });
      const deletedUrl = makeUrl({ id: '2', isDeleted: true, isExpired: false, expiresAt: null });
      const expiredFlagUrl = makeUrl({ id: '3', isDeleted: false, isExpired: true, expiresAt: null });
      const expiredDateUrl = makeUrl({ id: '4', isDeleted: false, isExpired: false, expiresAt: new Date(Date.now() - 1000) });
      const futureExpiryUrl = makeUrl({ id: '5', isDeleted: false, isExpired: false, expiresAt: new Date(Date.now() + 100000) });

      findAllSpy.mockResolvedValue({
        urls: [activeUrl, deletedUrl, expiredFlagUrl, expiredDateUrl, futureExpiryUrl],
        totalItems: 5,
      });

      const res = await getShortUrls('Bearer admin-token');

      expect(res.status).toBe(200);
      const items = res.body.data.shortUrls;
      expect(items).toHaveLength(5);
      expect(items[0].isActive).toBe(true);  // active
      expect(items[1].isActive).toBe(false); // deleted
      expect(items[2].isActive).toBe(false); // expired flag
      expect(items[3].isActive).toBe(false); // expired date
      expect(items[4].isActive).toBe(true);  // future expiry date
    });
  });

  describe('GET /api/v1/admin/short-urls/:shortURL', () => {
    function getShortUrlDetails(shortURL: string, tokenHeader?: string) {
      const req = request(app).get(`/api/v1/admin/short-urls/${shortURL}`);
      if (tokenHeader !== undefined) {
        req.set('Authorization', tokenHeader);
      }
      return req;
    }

    it('returns HTTP 401 when Authorization header is missing', async () => {
      const res = await getShortUrlDetails('sd-prep');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns HTTP 403 when authenticated user is not an admin', async () => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'user-id',
        email: 'user@example.com',
        role: 'user',
      });
      
      const res = await getShortUrlDetails('sd-prep', 'Bearer user-token');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns HTTP 404 when short URL does not exist', async () => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
      });
      findByShortUrlSpy.mockResolvedValue(null);

      const res = await getShortUrlDetails('non-existent', 'Bearer admin-token');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('URL with id non-existent not found');
    });

    it('returns HTTP 200 and URL details successfully without click analytics', async () => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
      });
      
      const targetUrl = makeUrl({ shortUrl: 'sd-prep', clickCount: 100 });
      findByShortUrlSpy.mockResolvedValue(targetUrl);

      const res = await getShortUrlDetails('sd-prep', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Short URL details fetched successfully');
      expect(res.body.data).toEqual({
        id: '1',
        shortCode: 'sd-prep',
        originalUrl: 'https://google.com',
        ownerId: 'user-uuid',
        clicks: 100,
        isActive: true,
        createdAt: '2026-07-08T12:00:00.000Z',
        expiresAt: null,
      });
      expect(res.body.data.analytics).toBeUndefined();
    });
  });
});
