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

// ---------------------------------------------------------------------------
// Mock BullMQ Queue for both email-queue and password-reset-queue
// ---------------------------------------------------------------------------
const mockEmailAdd = jest.fn().mockResolvedValue({ id: 'mock-email-job-id' });
const mockPasswordResetAdd = jest.fn().mockResolvedValue({ id: 'mock-pwd-job-id' });

jest.mock('../../shared/queues/email.queue', () => ({
  emailQueue: {
    add: (...args: any[]) => mockEmailAdd(...args),
  },
}));

jest.mock('../../shared/queues/password-reset.queue', () => ({
  passwordResetQueue: {
    add: (...args: any[]) => mockPasswordResetAdd(...args),
  },
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

describe('POST /api/v1/auth/forgot-password', () => {
  let findByEmailSpy: jest.SpyInstance;
  let createPasswordResetTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockReset();
    mockRedisSet.mockReset();
    mockRedisDel.mockReset();
    mockEmailAdd.mockReset();
    mockPasswordResetAdd.mockReset();
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);

    findByEmailSpy = jest.spyOn(AuthRepository.prototype, 'findByEmail');
    createPasswordResetTokenSpy = jest.spyOn(AuthRepository.prototype, 'createPasswordResetToken');
  });

  afterEach(() => {
    findByEmailSpy.mockRestore();
    createPasswordResetTokenSpy.mockRestore();
  });

  it('rejects when email is missing in request body (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Incorrect email format');
  });

  it('rejects when email format is invalid (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Incorrect email format');
  });

  it('returns 200 success even if email does not exist in the database (security requirement)', async () => {
    findByEmailSpy.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('If an account exists with this email, a reset link has been sent');
    
    // Bypasses execution
    expect(createPasswordResetTokenSpy).not.toHaveBeenCalled();
    expect(mockPasswordResetAdd).not.toHaveBeenCalled();
  });

  it('returns 200 success and starts background workflow when email exists', async () => {
    const user = makeUser();
    findByEmailSpy.mockResolvedValue(user);
    createPasswordResetTokenSpy.mockResolvedValue({
      id: 'token-db-id',
      userId: user.id,
      tokenHash: 'hashed-token',
      isRevoked: false,
      isExpired: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('If an account exists with this email, a reset link has been sent');

    // Wait slightly to let the background fire-and-forget tasks trigger
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(findByEmailSpy).toHaveBeenCalledWith(user.email);
    expect(createPasswordResetTokenSpy).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
      expect.any(Date)
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining('password_reset_token:'),
      expect.stringContaining('"tokenId":"token-db-id"'),
      'EX',
      300
    );
    expect(mockPasswordResetAdd).toHaveBeenCalledWith('sendPasswordResetEmail', {
      to: user.email,
      resetLink: expect.stringContaining('?token='),
    });
  });
});
