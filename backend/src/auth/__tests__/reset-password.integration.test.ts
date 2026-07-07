import request from 'supertest';
import { AuthRepository } from '../../auth/auth.repository';
import { User } from '../../auth/auth.entity';

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

describe('POST /api/v1/auth/reset-password', () => {
  let findPasswordResetTokenByHashSpy: jest.SpyInstance;
  let findByIdSpy: jest.SpyInstance;
  let updatePasswordSpy: jest.SpyInstance;
  let deletePasswordResetTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockReset();
    mockRedisSet.mockReset();
    mockRedisDel.mockReset();
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);

    findPasswordResetTokenByHashSpy = jest.spyOn(AuthRepository.prototype, 'findPasswordResetTokenByHash');
    findByIdSpy = jest.spyOn(AuthRepository.prototype, 'findById');
    updatePasswordSpy = jest.spyOn(AuthRepository.prototype, 'updatePassword');
    deletePasswordResetTokenSpy = jest.spyOn(AuthRepository.prototype, 'deletePasswordResetToken');
  });

  afterEach(() => {
    findPasswordResetTokenByHashSpy.mockRestore();
    findByIdSpy.mockRestore();
    updatePasswordSpy.mockRestore();
    deletePasswordResetTokenSpy.mockRestore();
  });

  it('rejects when body fields are missing (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'tok' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects when passwords do not match (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'token123',
        newPassword: 'NewPassword1!',
        confirmNewPassword: 'NewPassword2!'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Passwords do not match');
  });

  it('rejects when new password format is invalid (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'token123',
        newPassword: 'weak',
        confirmNewPassword: 'weak'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects when token is not found in database on cache miss (401)', async () => {
    mockRedisGet.mockResolvedValue(null);
    findPasswordResetTokenByHashSpy.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'invalid-token',
        newPassword: 'StrongPassword1!',
        confirmNewPassword: 'StrongPassword1!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Reset token is invalid or has expired');
    expect(findPasswordResetTokenByHashSpy).toHaveBeenCalled();
  });

  it('rejects when token is expired on cache miss (401)', async () => {
    mockRedisGet.mockResolvedValue(null);
    findPasswordResetTokenByHashSpy.mockResolvedValue({
      id: 'token-db-id',
      userId: 'user-id',
      tokenHash: 'hash',
      isRevoked: false,
      isExpired: false,
      expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'expired-token',
        newPassword: 'StrongPassword1!',
        confirmNewPassword: 'StrongPassword1!'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Reset token is invalid or has expired');
  });

  it('successfully updates password on cache hit and schedules background cleanup (200)', async () => {
    const user = makeUser();
    mockRedisGet.mockResolvedValue(JSON.stringify({ userId: user.id, tokenId: 'token-db-id' }));
    findByIdSpy.mockResolvedValue(user);
    updatePasswordSpy.mockResolvedValue(undefined);
    deletePasswordResetTokenSpy.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'valid-cached-token',
        newPassword: 'StrongPassword1!',
        confirmNewPassword: 'StrongPassword1!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Password reset successfully. Please log in with your new password.');

    // DB updates are synchronous
    expect(updatePasswordSpy).toHaveBeenCalledWith(user.id, expect.any(String));
    expect(findPasswordResetTokenByHashSpy).not.toHaveBeenCalled(); // Cache hit avoids DB query

    // Wait slightly to let the background fire-and-forget tasks trigger
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockRedisDel).toHaveBeenCalledWith(expect.stringContaining('password_reset_token:'));
    expect(deletePasswordResetTokenSpy).toHaveBeenCalledWith('token-db-id');
  });

  it('successfully updates password on cache miss via DB fallback and schedules cleanup (200)', async () => {
    const user = makeUser();
    mockRedisGet.mockResolvedValue(null); // Cache miss
    findPasswordResetTokenByHashSpy.mockResolvedValue({
      id: 'token-db-id',
      userId: user.id,
      tokenHash: 'hashed-token',
      isRevoked: false,
      isExpired: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    findByIdSpy.mockResolvedValue(user);
    updatePasswordSpy.mockResolvedValue(undefined);
    deletePasswordResetTokenSpy.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'valid-db-token',
        newPassword: 'StrongPassword1!',
        confirmNewPassword: 'StrongPassword1!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(updatePasswordSpy).toHaveBeenCalledWith(user.id, expect.any(String));
    expect(findPasswordResetTokenByHashSpy).toHaveBeenCalled(); // Triggered DB fallback

    // Wait slightly to let the background fire-and-forget tasks trigger
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockRedisDel).toHaveBeenCalledWith(expect.stringContaining('password_reset_token:'));
    expect(deletePasswordResetTokenSpy).toHaveBeenCalledWith('token-db-id');
  });
});
