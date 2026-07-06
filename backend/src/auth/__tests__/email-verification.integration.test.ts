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

    const token = generateAccessToken({ userId: user.id, email: user.email });

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
    createEmailVerificationTokenSpy.mockResolvedValue(undefined);

    const token = generateAccessToken({ userId: user.id, email: user.email });

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
    expect(mockAdd).toHaveBeenCalledWith('sendVerificationEmail', {
      to: user.email,
      verificationLink: expect.stringContaining('?token='),
    });
  });
});
