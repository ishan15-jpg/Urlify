import request from 'supertest';
import { UrlRepository } from '../url.repository';
import { Url } from '../url.entity';
import * as tokenUtil from '../../shared/utils/token.util';
import { redisClient } from '../../shared/config/redis.config';

// Silence winston logs during tests
jest.mock('../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Mock pg pool — prevents real DB connections on module import
jest.mock('../../shared/config/database.config', () => ({
  db: {},
  closeDatabasePool: jest.fn(),
}));

import app from '../../app';

function makeUrl(overrides: Partial<Url> = {}): Url {
  return {
    id: '12345',
    userId: null,
    originalUrl: 'https://google.com',
    shortUrl: '00003d7', // base62 for 12345 is 3d7, padded: 00003d7
    isDeleted: false,
    isExpired: false,
    clickCount: 0,
    expiresAt: null,
    createdAt: new Date('2026-07-08T12:00:00Z'),
    updatedAt: new Date('2026-07-08T12:00:00Z'),
    ...overrides,
  };
}

describe('POST /api/v1/shorten', () => {
  let createPlaceholderSpy: jest.SpyInstance;
  let updateShortUrlSpy: jest.SpyInstance;
  let verifyAccessTokenSpy: jest.SpyInstance;
  let redisSetSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    createPlaceholderSpy = jest.spyOn(UrlRepository.prototype, 'createPlaceholder');
    updateShortUrlSpy = jest.spyOn(UrlRepository.prototype, 'updateShortUrl');
    verifyAccessTokenSpy = jest.spyOn(tokenUtil, 'verifyAccessToken');
    redisSetSpy = jest.spyOn(redisClient, 'set');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function postShorten(body: unknown, tokenHeader?: string) {
    const req = request(app).post('/api/v1/shorten');
    if (tokenHeader !== undefined) {
      req.set('Authorization', tokenHeader);
    }
    return req.send(body as object);
  }

  // ── 400 Bad Request — Input Validation ──────────────────────────────────────
  describe('400 Bad Request — input validation', () => {
    it('rejects when originalUrl is missing', async () => {
      const res = await postShorten({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expected string, received undefined');
    });

    it('rejects when originalUrl is not a valid URL', async () => {
      const res = await postShorten({ originalUrl: 'not-a-url' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('originalUrl must be a valid URL');
    });

    it('rejects when originalUrl does not start with http or https', async () => {
      const res = await postShorten({ originalUrl: 'ftp://ftp.example.com' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid destination URL');
    });

    it('rejects when expirationTime is negative', async () => {
      const res = await postShorten({ originalUrl: 'https://google.com', expirationTime: -1 });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expirationTime must be a positive integer');
    });

    it('rejects when expirationTime is a decimal', async () => {
      const res = await postShorten({ originalUrl: 'https://google.com', expirationTime: 2.5 });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expected int, received number');
    });

    it('rejects when expirationTime is not a number', async () => {
      const res = await postShorten({ originalUrl: 'https://google.com', expirationTime: '3' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expected number, received string');
    });
  });

  // ── 401 Unauthorized ──────────────────────────────────────────────────────────
  describe('401 Unauthorized', () => {
    it('returns HTTP 401 when token verification fails', async () => {
      verifyAccessTokenSpy.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const res = await postShorten({ originalUrl: 'https://example.com' }, 'Bearer invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired access token');
    });
  });

  // ── 201 Created — Success cases ──────────────────────────────────────────────
  describe('201 Created — success', () => {
    it('successfully shortens a URL anonymously (without authentication)', async () => {
      const targetUrl = 'https://google.com';
      createPlaceholderSpy.mockResolvedValue({ id: '12345' });
      
      const expectedShortCode = '00003d7'; // base62 of 12345 is 3d7, padded: 00003d7
      const dbUrlRecord = makeUrl({ id: '12345', originalUrl: targetUrl, shortUrl: expectedShortCode });
      updateShortUrlSpy.mockResolvedValue(dbUrlRecord);

      const res = await postShorten({ originalUrl: targetUrl });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('URL shortened successfully');
      expect(res.body.data.shortCode).toBe(expectedShortCode);
      expect(res.body.data.shortCode).toHaveLength(7);
      expect(res.body.data.originalUrl).toBe(targetUrl);
      expect(res.body.data.shortUrl).toContain(`/${expectedShortCode}`);

      expect(createPlaceholderSpy).toHaveBeenCalledWith({
        originalUrl: targetUrl,
        userId: null,
        expiresAt: null,
      });
      expect(updateShortUrlSpy).toHaveBeenCalledWith('12345', expectedShortCode);
      expect(redisSetSpy).toHaveBeenCalledWith(`url:${expectedShortCode}`, targetUrl);
    });

    it('successfully shortens a URL with authentication and saves userId', async () => {
      const targetUrl = 'https://github.com';
      const mockUserId = 'f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c';
      
      verifyAccessTokenSpy.mockReturnValue({
        userId: mockUserId,
        email: 'user@example.com',
        role: 'user',
      });

      createPlaceholderSpy.mockResolvedValue({ id: '100' });
      
      const expectedShortCode = '000001C'; // base62 of 100 is 1C, padded: 000001C
      const dbUrlRecord = makeUrl({ id: '100', originalUrl: targetUrl, shortUrl: expectedShortCode, userId: mockUserId });
      updateShortUrlSpy.mockResolvedValue(dbUrlRecord);

      const res = await postShorten({ originalUrl: targetUrl }, 'Bearer valid-user-token');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('URL shortened successfully');
      expect(res.body.data.shortCode).toBe(expectedShortCode);

      expect(createPlaceholderSpy).toHaveBeenCalledWith({
        originalUrl: targetUrl,
        userId: mockUserId,
        expiresAt: null,
      });
      expect(updateShortUrlSpy).toHaveBeenCalledWith('100', expectedShortCode);
      expect(redisSetSpy).toHaveBeenCalledWith(`url:${expectedShortCode}`, targetUrl);
    });

    it('successfully shortens a URL with expirationTime and sets TTL in Redis', async () => {
      const targetUrl = 'https://google.com';
      createPlaceholderSpy.mockResolvedValue({ id: '12345' });
      
      const expectedShortCode = '00003d7';
      const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
      const dbUrlRecord = makeUrl({ id: '12345', originalUrl: targetUrl, shortUrl: expectedShortCode, expiresAt });
      updateShortUrlSpy.mockResolvedValue(dbUrlRecord);

      const res = await postShorten({ originalUrl: targetUrl, expirationTime: 2 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('URL shortened successfully');
      expect(res.body.data.shortCode).toBe(expectedShortCode);
      expect(res.body.data.expiresAt).toBe(expiresAt.toISOString());

      expect(createPlaceholderSpy).toHaveBeenCalledWith({
        originalUrl: targetUrl,
        userId: null,
        expiresAt: expect.any(Date),
      });
      expect(updateShortUrlSpy).toHaveBeenCalledWith('12345', expectedShortCode);
      expect(redisSetSpy).toHaveBeenCalledWith(
        `url:${expectedShortCode}`,
        targetUrl,
        'EX',
        expect.any(Number)
      );
    });
  });
});
