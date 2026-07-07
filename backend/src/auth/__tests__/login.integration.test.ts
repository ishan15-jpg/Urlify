import request from 'supertest';
import { AuthRepository } from '../../auth/auth.repository';
import { User } from '../../auth/auth.entity';
import * as passwordUtil from '../../shared/utils/password.util';
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

import app from '../../app';

const VALID_USER = {
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
} as User;

function postLogin(body: unknown) {
  return request(app)
    .post('/api/v1/auth/login')
    .set('Content-Type', 'application/json')
    .send(body as object);
}

describe('POST /api/v1/auth/login', () => {
  let findByEmailSpy: jest.SpyInstance;
  let comparePasswordSpy: jest.SpyInstance;

  beforeEach(() => {
    findByEmailSpy = jest
      .spyOn(AuthRepository.prototype, 'findByEmail')
      .mockResolvedValue(VALID_USER);
    jest
      .spyOn(AuthRepository.prototype, 'storeRefreshToken')
      .mockResolvedValue({ id: 'mock-id' });
    comparePasswordSpy = jest
      .spyOn(passwordUtil, 'comparePassword')
      .mockResolvedValue(true);
    jest
      .spyOn(tokenUtil, 'generateAccessToken')
      .mockReturnValue('mockAccessToken');
    jest
      .spyOn(tokenUtil, 'generateRefreshToken')
      .mockReturnValue('mockRefreshToken');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 200 OK — Successful Login ──────────────────────────────────────────────

  describe('200 OK — successful login', () => {
    const validBody = { email: 'ishan@example.com', password: 'StrongP@ss1' };

    it('returns HTTP 200 for valid credentials', async () => {
      const res = await postLogin(validBody);
      expect(res.status).toBe(200);
    });

    it('returns success=true and correct status code', async () => {
      const res = await postLogin(validBody);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);
    });

    it('returns message "Login successful"', async () => {
      const res = await postLogin(validBody);
      expect(res.body.message).toBe('Login successful');
    });

    it('returns user data and access token in response body', async () => {
      const res = await postLogin(validBody);
      expect(res.body.data).toEqual({
        user: {
          id: VALID_USER.id,
          name: VALID_USER.name,
          email: VALID_USER.email,
          isEmailVerified: VALID_USER.isEmailVerified,
        },
        accessToken: 'mockAccessToken',
      });
    });

    it('never exposes passwordHash in the response body', async () => {
      const res = await postLogin(validBody);
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('passwordHash');
      expect(bodyStr).not.toContain('password_hash');
    });

    it('sends refresh token in a secure httpOnly cookie', async () => {
      const res = await postLogin(validBody);
      const cookies = (res.headers['set-cookie'] as unknown) as string[];
      expect(cookies).toBeDefined();

      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('refreshToken=mockRefreshToken');
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('Secure');
    });
  });

  // ── 400 Bad Request — Validation failures ─────────────────────────────────

  describe('400 Bad Request — input validation', () => {
    it('rejects when email is missing', async () => {
      const res = await postLogin({ password: 'StrongP@ss1' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Incorrect email format');
    });

    it('rejects when password is missing', async () => {
      const res = await postLogin({ email: 'ishan@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Password is required');
    });

    it('rejects when email is empty', async () => {
      const res = await postLogin({ email: '', password: 'StrongP@ss1' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Incorrect email format');
    });

    it('rejects when password is empty', async () => {
      const res = await postLogin({ email: 'ishan@example.com', password: '' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password must be atleast 8 characters');
    });

    it('rejects when email format is invalid', async () => {
      const res = await postLogin({ email: 'not-an-email', password: 'StrongP@ss1' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Incorrect email format');
    });

    it('rejects when password format is invalid (no uppercase)', async () => {
      const res = await postLogin({ email: 'ishan@example.com', password: 'weakp@ss1' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Password must contain at least one uppercase letter');
    });

    it('rejects when password format is invalid (too short)', async () => {
      const res = await postLogin({ email: 'ishan@example.com', password: 'Ab1@' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password must be atleast 8 characters');
    });
  });

  // ── 401 Unauthorized — Authentication failures ────────────────────────────

  describe('401 Unauthorized — invalid credentials', () => {
    it('returns HTTP 401 when email is not found', async () => {
      findByEmailSpy.mockResolvedValue(null);
      const res = await postLogin({ email: 'notfound@example.com', password: 'StrongP@ss1' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email not found');
    });

    it('returns HTTP 401 when password is incorrect', async () => {
      comparePasswordSpy.mockResolvedValue(false);
      const res = await postLogin({ email: 'ishan@example.com', password: 'WrongPassword1!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Incorrect password');
    });
  });

  // ── 500 Internal Server Error ─────────────────────────────────────────────

  describe('500 Internal Server Error — database/unexpected failures', () => {
    it('returns HTTP 500 when repository lookup fails', async () => {
      findByEmailSpy.mockRejectedValue(new Error('Database offline'));
      const res = await postLogin({ email: 'ishan@example.com', password: 'StrongP@ss1' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');
    });
  });
});
