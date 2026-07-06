import request from 'supertest';
import { AuthRepository } from '../../auth/auth.repository';
import { User } from '../../auth/auth.entity';
import { generateAccessToken } from '../../shared/utils/token.util';

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

// ---------------------------------------------------------------------------
// Mock BullMQ Queue
// ---------------------------------------------------------------------------
const mockAdd = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        add: mockAdd,
      };
    }),
    Worker: jest.fn(),
  };
});

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
    isEmailVerified: false,
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

describe('POST /api/v1/auth/email-verification-link', () => {
  let findByEmailSpy: jest.SpyInstance;
  let createEmailVerificationTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockReset();
    mockRedisSet.mockReset();
    mockRedisDel.mockReset();
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
    findByEmailSpy = jest.spyOn(AuthRepository.prototype, 'findByEmail');
    createEmailVerificationTokenSpy = jest.spyOn(AuthRepository.prototype, 'createEmailVerificationToken');
  });

  afterEach(() => {
    findByEmailSpy.mockRestore();
    createEmailVerificationTokenSpy.mockRestore();
  });

  it('rejects requests with missing authorization header (401)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/email-verification-link');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Missing or invalid access token');
  });

  it('rejects requests with invalid authorization header (401)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/email-verification-link')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid or expired access token');
  });

  it('rejects requests if the user is already verified (409)', async () => {
    const user = makeUser({ isEmailVerified: true });
    findByEmailSpy.mockResolvedValue(user);

    const token = generateAccessToken({ userId: user.id, email: user.email, role: 'user' });

    const res = await request(app)
      .post('/api/v1/auth/email-verification-link')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('This email is already verified');
  });

  it('creates token in DB, enqueues to BullMQ, and returns 200 on success', async () => {
    const user = makeUser({ isEmailVerified: false });
    findByEmailSpy.mockResolvedValue(user);
    createEmailVerificationTokenSpy.mockResolvedValue({
      id: 'token-db-id',
      userId: user.id,
      tokenHash: 'hashed',
      isRevoked: false,
      isExpired: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = generateAccessToken({ userId: user.id, email: user.email, role: 'user' });

    const res = await request(app)
      .post('/api/v1/auth/email-verification-link')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Verification link sent to your registered email');
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.expiresIn).toBe(600);

    expect(findByEmailSpy).toHaveBeenCalledWith(user.email);
    expect(createEmailVerificationTokenSpy).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
      expect.any(Date)
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining('verification_token:'),
      expect.stringContaining('"tokenId":"token-db-id"'),
      'EX',
      600
    );
    expect(mockAdd).toHaveBeenCalledWith('sendVerificationEmail', {
      to: user.email,
      verificationLink: expect.stringContaining('?token='),
    });
  });
});

describe('POST /api/v1/auth/verify-email', () => {
  let findVerificationTokenByHashSpy: jest.SpyInstance;
  let findByIdSpy: jest.SpyInstance;
  let updateVerificationTokenStatusSpy: jest.SpyInstance;
  let updateUserVerificationStatusSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockReset();
    mockRedisSet.mockReset();
    mockRedisDel.mockReset();
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
    findVerificationTokenByHashSpy = jest.spyOn(AuthRepository.prototype, 'findVerificationTokenByHash');
    findByIdSpy = jest.spyOn(AuthRepository.prototype, 'findById');
    updateVerificationTokenStatusSpy = jest.spyOn(AuthRepository.prototype, 'updateVerificationTokenStatus');
    updateUserVerificationStatusSpy = jest.spyOn(AuthRepository.prototype, 'updateUserVerificationStatus');
  });

  afterEach(() => {
    findVerificationTokenByHashSpy.mockRestore();
    findByIdSpy.mockRestore();
    updateVerificationTokenStatusSpy.mockRestore();
    updateUserVerificationStatusSpy.mockRestore();
  });

  it('rejects when token is missing in request body (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Verification token is required');
  });

  it('rejects when token is empty in request body (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Verification token is required');
  });

  it('rejects when verification token is not found in database on cache miss (401)', async () => {
    mockRedisGet.mockResolvedValue(null);
    findVerificationTokenByHashSpy.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'unknown-token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Verification link is invalid or has expired');
    expect(findVerificationTokenByHashSpy).toHaveBeenCalled();
  });

  it('rejects when verification token is revoked on cache miss (401)', async () => {
    mockRedisGet.mockResolvedValue(null);
    findVerificationTokenByHashSpy.mockResolvedValue({
      id: '1',
      userId: 'user-id',
      tokenHash: 'hashed',
      isRevoked: true,
      isExpired: false,
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'revoked-token' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Verification link is invalid or has expired');
  });

  it('rejects when verification token is expired on cache miss (401)', async () => {
    mockRedisGet.mockResolvedValue(null);
    findVerificationTokenByHashSpy.mockResolvedValue({
      id: '1',
      userId: 'user-id',
      tokenHash: 'hashed',
      isRevoked: false,
      isExpired: true,
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'expired-token' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Verification link is invalid or has expired');
  });

  it('rejects when verification token is past its expiresAt timestamp on cache miss (401)', async () => {
    mockRedisGet.mockResolvedValue(null);
    findVerificationTokenByHashSpy.mockResolvedValue({
      id: '1',
      userId: 'user-id',
      tokenHash: 'hashed',
      isRevoked: false,
      isExpired: false,
      expiresAt: new Date(Date.now() - 5000), // expired 5 seconds ago
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'timedout-token' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Verification link is invalid or has expired');
  });

  it('rejects when user is already verified (409)', async () => {
    mockRedisGet.mockResolvedValue(null);
    findVerificationTokenByHashSpy.mockResolvedValue({
      id: '1',
      userId: 'user-id',
      tokenHash: 'hashed',
      isRevoked: false,
      isExpired: false,
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    findByIdSpy.mockResolvedValue(makeUser({ id: 'user-id', isEmailVerified: true }));

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'valid-token' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('This email is already verified');
  });

  it('successfully verifies email and invalidates token on cache hit (200)', async () => {
    const unverifiedUser = makeUser({ id: 'user-id', isEmailVerified: false });
    const verifiedUser = makeUser({ id: 'user-id', isEmailVerified: true });

    mockRedisGet.mockResolvedValue(JSON.stringify({ userId: 'user-id', tokenId: 'token-db-id' }));

    findByIdSpy
      .mockResolvedValueOnce(unverifiedUser)
      .mockResolvedValueOnce(verifiedUser);

    updateUserVerificationStatusSpy.mockResolvedValue(undefined);
    updateVerificationTokenStatusSpy.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'success-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Email verified successfully');
    expect(res.body.data.email).toBe(verifiedUser.email);
    expect(res.body.data.isEmailVerified).toBe(true);

    expect(findVerificationTokenByHashSpy).not.toHaveBeenCalled(); // Cache hit avoids DB read
    expect(findByIdSpy).toHaveBeenCalledWith('user-id');
    expect(updateUserVerificationStatusSpy).toHaveBeenCalledWith('user-id', true);
    expect(updateVerificationTokenStatusSpy).toHaveBeenCalledWith('token-db-id', true, true);
    expect(mockRedisDel).toHaveBeenCalledWith(expect.stringContaining('verification_token:'));
  });

  it('successfully verifies email on cache miss falling back to DB lookup (200)', async () => {
    const unverifiedUser = makeUser({ id: 'user-id', isEmailVerified: false });
    const verifiedUser = makeUser({ id: 'user-id', isEmailVerified: true });

    mockRedisGet.mockResolvedValue(null); // Cache miss

    findVerificationTokenByHashSpy.mockResolvedValue({
      id: 'token-db-id',
      userId: 'user-id',
      tokenHash: 'hashed',
      isRevoked: false,
      isExpired: false,
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    findByIdSpy
      .mockResolvedValueOnce(unverifiedUser)
      .mockResolvedValueOnce(verifiedUser);

    updateUserVerificationStatusSpy.mockResolvedValue(undefined);
    updateVerificationTokenStatusSpy.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'fallback-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Email verified successfully');

    expect(findVerificationTokenByHashSpy).toHaveBeenCalled(); // DB fallback query
    expect(findByIdSpy).toHaveBeenCalledWith('user-id');
    expect(updateUserVerificationStatusSpy).toHaveBeenCalledWith('user-id', true);
    expect(updateVerificationTokenStatusSpy).toHaveBeenCalledWith('token-db-id', true, true);
    expect(mockRedisDel).toHaveBeenCalledWith(expect.stringContaining('verification_token:'));
  });
});

