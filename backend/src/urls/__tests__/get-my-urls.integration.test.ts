import request from 'supertest';
import { UrlRepository } from '../url.repository';
import { Url } from '../url.entity';
import * as tokenUtil from '../../shared/utils/token.util';

// Silence winston logs during tests
jest.mock('../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Mock pg pool — prevents real DB connections on module import
jest.mock('../../shared/config/database.config', () => ({
  db: {},
  closeDatabasePool: jest.fn(),
}));

// Mock redis
jest.mock('../../shared/config/redis.config', () => ({
  redisClient: {
    set: jest.fn(),
    get: jest.fn(),
  },
}));

import app from '../../app';

function makeUrl(overrides: Partial<Url> = {}): Url {
  return {
    id: '12345',
    userId: 'user123',
    originalUrl: 'https://google.com',
    shortUrl: '00003d7',
    isDeleted: false,
    isExpired: false,
    clickCount: 0,
    expiresAt: null,
    createdAt: new Date('2026-07-08T12:00:00.000Z'),
    updatedAt: new Date('2026-07-08T12:00:00.000Z'),
    ...overrides,
  };
}

describe('GET /api/v1/url/me', () => {
  let findByUserIdSpy: jest.SpyInstance;
  let verifyAccessTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    findByUserIdSpy = jest.spyOn(UrlRepository.prototype, 'findByUserId');
    verifyAccessTokenSpy = jest.spyOn(tokenUtil, 'verifyAccessToken');
  });

  it('should return 401 if unauthenticated', async () => {
    verifyAccessTokenSpy.mockImplementation(() => {
      throw new Error('No token provided');
    });

    const response = await request(app).get('/api/v1/url/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return paginated URLs for the authenticated user', async () => {
    verifyAccessTokenSpy.mockReturnValue({
      userId: 'user123',
      role: 'user',
    });

    const mockUrls = [
      makeUrl({ id: '1', shortUrl: 'test1' }),
      makeUrl({ id: '2', shortUrl: 'test2' })
    ];

    findByUserIdSpy.mockResolvedValue({
      urls: mockUrls,
      totalItems: 2
    });

    const response = await request(app)
      .get('/api/v1/url/me?page=1&limit=20')
      .set('Authorization', 'Bearer dummy-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.shortUrls).toHaveLength(2);
    expect(response.body.data.shortUrls[0].shortCode).toBe('test1');
    expect(response.body.data.pagination.totalItems).toBe(2);
    expect(response.body.data.pagination.currentPage).toBe(1);
    
    expect(findByUserIdSpy).toHaveBeenCalledWith('user123', {
      offset: 0,
      limit: 20
    });
  });
});
