import request from 'supertest';
import { AuthRepository } from '../../auth/auth.repository';
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

function postLogout(token: string, cookie?: string) {
  const req = request(app)
    .post('/api/v1/auth/logout')
    .set('Authorization', token ? `Bearer ${token}` : '');
    
  if (cookie) {
    req.set('Cookie', cookie);
  }
  return req;
}

describe('POST /api/v1/auth/logout', () => {
  let findRefreshTokenByHashSpy: jest.SpyInstance;
  let revokeRefreshTokenSpy: jest.SpyInstance;
  let redisSetSpy: jest.SpyInstance;
  let redisDelSpy: jest.SpyInstance;
  let redisGetSpy: jest.SpyInstance;
  let verifyAccessTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    findRefreshTokenByHashSpy = jest
      .spyOn(AuthRepository.prototype, 'findRefreshTokenByHash')
      .mockResolvedValue({ id: 'mock-id' });
    revokeRefreshTokenSpy = jest
      .spyOn(AuthRepository.prototype, 'revokeRefreshToken')
      .mockResolvedValue(undefined);
    
    redisSetSpy = redisClient.set as jest.Mock;
    redisSetSpy.mockResolvedValue('OK');
    
    redisDelSpy = redisClient.del as jest.Mock;
    redisDelSpy.mockResolvedValue(1);

    redisGetSpy = redisClient.get as jest.Mock;
    redisGetSpy.mockResolvedValue(null); // Default: not blocklisted
    
    verifyAccessTokenSpy = jest.spyOn(tokenUtil, 'verifyAccessToken').mockReturnValue({
      userId: 'mock-user-id',
      email: 'test@example.com',
      role: 'user',
      exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('200 OK — successful logout', () => {
    it('returns HTTP 200 with both tokens provided', async () => {
      const res = await postLogout('valid.access.token', 'refreshToken=valid.refresh.token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('adds access token to Redis blocklist', async () => {
      await postLogout('valid.access.token', 'refreshToken=valid.refresh.token');
      expect(redisSetSpy).toHaveBeenCalledWith(
        'blacklisted_access_token:valid.access.token',
        'revoked',
        'EX',
        expect.any(Number)
      );
    });

    it('removes refresh token from Redis and Database', async () => {
      await postLogout('valid.access.token', 'refreshToken=valid.refresh.token');
      expect(redisDelSpy).toHaveBeenCalledWith(expect.stringContaining('refresh_token:'));
      expect(findRefreshTokenByHashSpy).toHaveBeenCalled();
      expect(revokeRefreshTokenSpy).toHaveBeenCalledWith('mock-id');
    });

    it('clears the refreshToken cookie', async () => {
      const res = await postLogout('valid.access.token', 'refreshToken=valid.refresh.token');
      const cookies = (res.headers['set-cookie'] as unknown) as string[];
      expect(cookies).toBeDefined();

      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken=;'));
      expect(refreshCookie).toBeDefined();
    });

    it('returns HTTP 200 when only access token is provided (no cookie)', async () => {
      const res = await postLogout('valid.access.token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(redisSetSpy).toHaveBeenCalled(); // Still blocklists access token
      expect(redisDelSpy).not.toHaveBeenCalled(); // No refresh token to revoke
    });
  });

  describe('401 Unauthorized — authentication failures', () => {
    it('returns HTTP 401 when Authorization header is missing', async () => {
      const res = await postLogout('');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Missing or invalid access token');
    });

    it('returns HTTP 401 when access token is invalid', async () => {
      verifyAccessTokenSpy.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const res = await postLogout('invalid.token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired access token');
    });

    it('returns HTTP 401 when access token is already blocklisted', async () => {
      redisGetSpy.mockResolvedValue('revoked'); // Simulate blocklisted
      const res = await postLogout('blocklisted.token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired access token');
      expect(verifyAccessTokenSpy).not.toHaveBeenCalled(); // Fails before verification
    });
  });
});
