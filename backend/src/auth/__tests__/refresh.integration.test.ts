import request from 'supertest';
import { AuthRepository } from '../../auth/auth.repository';
import { User } from '../../auth/auth.entity';
import * as tokenUtil from '../../shared/utils/token.util';

// ---------------------------------------------------------------------------
// Silence winston logs during tests
// ---------------------------------------------------------------------------
jest.mock('../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Mock pg pool — prevents real DB connections on module import
// ---------------------------------------------------------------------------
jest.mock('../../shared/config/database.config', () => ({
  db: {},
  closeDatabasePool: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock Redis Client
// ---------------------------------------------------------------------------
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn().mockResolvedValue('OK');
const mockRedisDel = jest.fn().mockResolvedValue(1);

jest.mock('../../shared/config/redis.config', () => ({
  redisClient: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    del: (...args: any[]) => mockRedisDel(...args),
    quit: jest.fn().mockResolvedValue('OK'),
  },
  __esModule: true,
  default: {},
}));

// Import app AFTER mocks are registered so the module tree picks them up
import app from '../../app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c',
    name: 'Ishan Sharma',
    email: 'ishan@example.com',
    passwordHash: '$2b$12$hashedvalue',
    isEmailVerified: true,
    isBlacklisted: false,
    isDeleted: false,
    lastLogin: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/refresh', () => {
  let findByIdSpy: jest.SpyInstance;
  let storeRefreshTokenSpy: jest.SpyInstance;
  let findRefreshTokenByHashSpy: jest.SpyInstance;
  let revokeRefreshTokenSpy: jest.SpyInstance;
  let deleteAllRefreshTokensForUserSpy: jest.SpyInstance;
  let verifyRefreshTokenSpy: jest.SpyInstance;
  let generateAccessTokenSpy: jest.SpyInstance;
  let generateRefreshTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockReset();
    mockRedisSet.mockReset();
    mockRedisDel.mockReset();
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);

    findByIdSpy = jest.spyOn(AuthRepository.prototype, 'findById');
    storeRefreshTokenSpy = jest.spyOn(AuthRepository.prototype, 'storeRefreshToken');
    findRefreshTokenByHashSpy = jest.spyOn(AuthRepository.prototype, 'findRefreshTokenByHash');
    revokeRefreshTokenSpy = jest.spyOn(AuthRepository.prototype, 'revokeRefreshToken');
    deleteAllRefreshTokensForUserSpy = jest.spyOn(AuthRepository.prototype, 'deleteAllRefreshTokensForUser');

    verifyRefreshTokenSpy = jest.spyOn(tokenUtil, 'verifyRefreshToken');
    generateAccessTokenSpy = jest.spyOn(tokenUtil, 'generateAccessToken');
    generateRefreshTokenSpy = jest.spyOn(tokenUtil, 'generateRefreshToken');
  });

  afterEach(() => {
    findByIdSpy.mockRestore();
    storeRefreshTokenSpy.mockRestore();
    findRefreshTokenByHashSpy.mockRestore();
    revokeRefreshTokenSpy.mockRestore();
    deleteAllRefreshTokensForUserSpy.mockRestore();

    verifyRefreshTokenSpy.mockRestore();
    generateAccessTokenSpy.mockRestore();
    generateRefreshTokenSpy.mockRestore();
  });

  it('rejects when refreshToken cookie is missing (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send();

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Refresh token is required');
  });

  it('rejects when refresh token verification fails (401)', async () => {
    verifyRefreshTokenSpy.mockImplementation(() => {
      throw new Error('JWT verify failed');
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=invalid-jwt'])
      .send();

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Refresh token is invalid or has expired. Please log in again.');
  });

  it('rejects when token is not found in database on cache miss (401)', async () => {
    const user = makeUser();
    verifyRefreshTokenSpy.mockReturnValue({ userId: user.id, email: user.email, role: 'user' });
    mockRedisGet.mockResolvedValue(null);
    findRefreshTokenByHashSpy.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=valid-jwt-but-missing-db'])
      .send();

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Refresh token is invalid or has expired. Please log in again.');
    expect(findRefreshTokenByHashSpy).toHaveBeenCalled();
  });

  it('detects reuse (revoked token) on cache miss, revokes all sessions and returns 403', async () => {
    const user = makeUser();
    verifyRefreshTokenSpy.mockReturnValue({ userId: user.id, email: user.email, role: 'user' });
    mockRedisGet.mockResolvedValue(null);
    findRefreshTokenByHashSpy.mockResolvedValue({
      id: 'token-id-123',
      userId: user.id,
      tokenHash: 'hashed-old-token',
      isRevoked: true, // already revoked!
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      isExpired: false,
    });
    deleteAllRefreshTokensForUserSpy.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=reused-token'])
      .send();

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Refresh token has been reused. Access denied and all sessions revoked.');
    expect(deleteAllRefreshTokensForUserSpy).toHaveBeenCalledWith(user.id);
  });

  it('successfully rotates session on cache hit (200)', async () => {
    const user = makeUser();
    verifyRefreshTokenSpy.mockReturnValue({ userId: user.id, email: user.email, role: 'user' });
    mockRedisGet.mockResolvedValue(JSON.stringify({ userId: user.id, tokenId: 'token-db-id' }));
    findByIdSpy.mockResolvedValue(user);
    generateAccessTokenSpy.mockReturnValue('new-access-tok');
    generateRefreshTokenSpy.mockReturnValue('new-refresh-tok');
    
    revokeRefreshTokenSpy.mockResolvedValue(undefined);
    storeRefreshTokenSpy.mockResolvedValue({ id: 'new-token-db-id' });
    mockRedisDel.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=valid-cached-token'])
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('new-access-tok');
    expect(res.headers['set-cookie'][0]).toContain('new-refresh-tok');

    expect(revokeRefreshTokenSpy).toHaveBeenCalledWith('token-db-id');
    expect(mockRedisDel).toHaveBeenCalledWith(expect.stringContaining('refresh_token:'));
    expect(storeRefreshTokenSpy).toHaveBeenCalledWith(user.id, expect.any(String), expect.any(Date));
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining('refresh_token:'),
      expect.stringContaining('"tokenId":"new-token-db-id"'),
      'EX',
      expect.any(Number)
    );
  });

  it('successfully rotates session on cache miss via DB fallback (200)', async () => {
    const user = makeUser();
    verifyRefreshTokenSpy.mockReturnValue({ userId: user.id, email: user.email, role: 'user' });
    mockRedisGet.mockResolvedValue(null);
    findRefreshTokenByHashSpy.mockResolvedValue({
      id: 'token-db-id',
      userId: user.id,
      tokenHash: 'hashed-old-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      isExpired: false,
    });
    findByIdSpy.mockResolvedValue(user);
    generateAccessTokenSpy.mockReturnValue('new-access-tok');
    generateRefreshTokenSpy.mockReturnValue('new-refresh-tok');
    
    revokeRefreshTokenSpy.mockResolvedValue(undefined);
    storeRefreshTokenSpy.mockResolvedValue({ id: 'new-token-db-id' });
    mockRedisDel.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=valid-db-token'])
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('new-access-tok');
    expect(res.headers['set-cookie'][0]).toContain('new-refresh-tok');

    expect(findRefreshTokenByHashSpy).toHaveBeenCalled();
    expect(revokeRefreshTokenSpy).toHaveBeenCalledWith('token-db-id');
    expect(storeRefreshTokenSpy).toHaveBeenCalledWith(user.id, expect.any(String), expect.any(Date));
  });
});
