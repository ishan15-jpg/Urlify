import request from 'supertest';
import { UsersRepository } from '../users.repository';
import * as tokenUtil from '../../shared/utils/token.util';
import { redisClient } from '../../shared/config/redis.config';
import app from '../../app';

// Silence winston logs during tests
jest.mock('../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Mock pg pool
jest.mock('../../shared/config/database.config', () => ({
  db: {},
  closeDatabasePool: jest.fn(),
}));

// Mock Redis
jest.mock('../../shared/config/redis.config', () => ({
  redisClient: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  name: 'Ishan Sharma',
  email: 'ishan@example.com',
  passwordHash: 'hashed',
  isEmailVerified: true,
  isBlacklisted: false,
  isDeleted: false,
  lastLogin: new Date('2026-07-21T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  role: 'user',
};

function getMe(token: string) {
  return request(app)
    .get('/api/v1/users/me')
    .set('Authorization', token ? `Bearer ${token}` : '');
}

describe('GET /api/v1/users/me', () => {
  let findByIdSpy: jest.SpyInstance;
  let redisGetSpy: jest.SpyInstance;
  let redisSetSpy: jest.SpyInstance;
  let verifyAccessTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    findByIdSpy = jest
      .spyOn(UsersRepository.prototype, 'findById')
      .mockResolvedValue(mockUser);
      
    redisGetSpy = redisClient.get as jest.Mock;
    redisGetSpy.mockResolvedValue(null); // Default to cache miss

    redisSetSpy = redisClient.set as jest.Mock;
    redisSetSpy.mockResolvedValue('OK');

    verifyAccessTokenSpy = jest.spyOn(tokenUtil, 'verifyAccessToken').mockReturnValue({
      userId: 'user-123',
      email: 'ishan@example.com',
      role: 'user',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('200 OK — successful profile fetch', () => {
    it('returns HTTP 200 and fetches profile from DB when cache misses', async () => {
      const res = await getMe('valid.token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Ishan Sharma');
      expect(res.body.data.email).toBe('ishan@example.com');
      
      expect(redisGetSpy).toHaveBeenCalledWith('blacklisted_access_token:valid.token'); // middleware blocklist check
      expect(redisGetSpy).toHaveBeenCalledWith('user_profile:user-123'); // service cache check
      expect(findByIdSpy).toHaveBeenCalledWith('user-123');
      expect(redisSetSpy).toHaveBeenCalledWith('user_profile:user-123', expect.any(String), 'EX', 900);
    });

    it('returns HTTP 200 and fetches profile from Redis when cache hits', async () => {
      // Mock cache hit for user profile
      redisGetSpy.mockImplementation((key: string) => {
        if (key.startsWith('user_profile:')) {
          return Promise.resolve(JSON.stringify(mockUser));
        }
        return Promise.resolve(null);
      });

      const res = await getMe('valid.token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Ishan Sharma');
      
      expect(findByIdSpy).not.toHaveBeenCalled();
      expect(redisSetSpy).not.toHaveBeenCalled(); // No need to set if it was a hit
    });
  });

  describe('401 Unauthorized — authentication failures', () => {
    it('returns HTTP 401 when Authorization header is missing', async () => {
      const res = await getMe('');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns HTTP 401 when token is invalid', async () => {
      verifyAccessTokenSpy.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const res = await getMe('invalid.token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('404 Not Found — user not found', () => {
    it('returns HTTP 404 when user is not found in database', async () => {
      findByIdSpy.mockResolvedValue(null);
      const res = await getMe('valid.token');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User with id user-123 not found');
    });
  });
});
