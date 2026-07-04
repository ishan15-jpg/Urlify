/**
 * Integration tests for POST /api/v1/auth/register
 *
 * Strategy: run the real Express app (app.ts) with a real middleware stack
 * (validation → controller → error middleware) via supertest.
 * The database is never touched — we mock AuthRepository prototype methods
 * so that any instance constructed by the module gets controlled behaviour.
 */
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
// Import app AFTER mocks are registered so the module tree picks them up
// ---------------------------------------------------------------------------
// eslint-disable-next-line import/first  (dynamic require used intentionally)
import app from '../../app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_BODY = {
  name: 'Ishan Sharma',
  email: 'ishan@example.com',
  password: 'StrongP@ss1',
};

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

/** Posts to the register endpoint. */
function postRegister(body: unknown) {
  return request(app)
    .post('/api/v1/auth/register')
    .set('Content-Type', 'application/json')
    .send(body as object);
}

// ---------------------------------------------------------------------------
// Spy references (set up once, restored after each test by jest config)
// ---------------------------------------------------------------------------
let findByEmailSpy: jest.SpyInstance;
let createSpy: jest.SpyInstance;

beforeEach(() => {
  // Spy on the prototype so every instance created by the module is covered
  findByEmailSpy = jest
    .spyOn(AuthRepository.prototype, 'findByEmail')
    .mockResolvedValue(null);
  createSpy = jest
    .spyOn(AuthRepository.prototype, 'create')
    .mockResolvedValue(makeUser());
});

afterEach(() => {
  findByEmailSpy.mockRestore();
  createSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/register', () => {

  // ── 201 Created ────────────────────────────────────────────────────────────

  describe('201 Created — successful registration', () => {
    it('returns HTTP 201 for a valid payload', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.status).toBe(201);
    });

    it('returns success=true', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.success).toBe(true);
    });

    it('returns statusCode 201 in the response body', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.statusCode).toBe(201);
    });

    it('returns the correct success message', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.message).toBe('Account created. Please verify your email to continue.');
    });

    it('returns the user object inside data.user', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.data.user).toMatchObject({
        id: 'f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c',
        email: 'ishan@example.com',
        name: 'Ishan Sharma',
        isEmailVerified: false,
      });
    });

    it('never exposes passwordHash in the response', async () => {
      const res = await postRegister(VALID_BODY);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('passwordHash');
      expect(body).not.toContain('password_hash');
    });

    it('includes meta.timestamp as an ISO 8601 string', async () => {
      const res = await postRegister(VALID_BODY);
      const { timestamp } = res.body.meta as { timestamp: string };
      expect(typeof timestamp).toBe('string');
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  // ── 400 Bad Request — validation ───────────────────────────────────────────

  describe('400 Bad Request — validation failures', () => {
    it('rejects a completely empty body', async () => {
      const res = await postRegister({});
      expect(res.status).toBe(400);
    });

    it('rejects when name is missing', async () => {
      const res = await postRegister({ email: 'ishan@example.com', password: 'StrongP@ss1' });
      expect(res.status).toBe(400);
    });

    it('rejects when email is missing', async () => {
      const res = await postRegister({ name: 'Ishan Sharma', password: 'StrongP@ss1' });
      expect(res.status).toBe(400);
    });

    it('rejects when password is missing', async () => {
      const res = await postRegister({ name: 'Ishan Sharma', email: 'ishan@example.com' });
      expect(res.status).toBe(400);
    });

    it('rejects an invalid email format', async () => {
      const res = await postRegister({ ...VALID_BODY, email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('rejects a password shorter than 8 characters', async () => {
      const res = await postRegister({ ...VALID_BODY, password: 'Ab1@' });
      expect(res.status).toBe(400);
    });

    it('rejects a password with no uppercase letter', async () => {
      const res = await postRegister({ ...VALID_BODY, password: 'weakp@ss1' });
      expect(res.status).toBe(400);
    });

    it('rejects a password with no digit', async () => {
      const res = await postRegister({ ...VALID_BODY, password: 'StrongP@ss' });
      expect(res.status).toBe(400);
    });

    it('rejects a password with no special character', async () => {
      const res = await postRegister({ ...VALID_BODY, password: 'StrongPass1' });
      expect(res.status).toBe(400);
    });

    it('rejects an empty name string', async () => {
      const res = await postRegister({ ...VALID_BODY, name: '' });
      expect(res.status).toBe(400);
    });

    it('returns success=false on validation error', async () => {
      const res = await postRegister({});
      expect(res.body.success).toBe(false);
    });
  });

  // ── 409 Conflict — duplicate email ─────────────────────────────────────────

  describe('409 Conflict — email already registered', () => {
    beforeEach(() => {
      // Override: make findByEmail report an existing user
      findByEmailSpy.mockResolvedValue(makeUser());
    });

    it('returns HTTP 409', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.status).toBe(409);
    });

    it('returns success=false', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.success).toBe(false);
    });

    it('returns statusCode 409 in the body', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.statusCode).toBe(409);
    });

    it('returns the correct conflict message', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.message).toBe('An account with this email already exists');
    });

    it('includes path in the error response', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.path).toBe('/api/v1/auth/register');
    });
  });

  // ── 500 Internal Server Error ───────────────────────────────────────────────

  describe('500 Internal Server Error — unexpected repository failures', () => {
    beforeEach(() => {
      findByEmailSpy.mockRejectedValue(new Error('DB connection lost'));
    });

    it('returns HTTP 500', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.status).toBe(500);
    });

    it('returns success=false', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.success).toBe(false);
    });

    it('does not leak internal error messages to the client', async () => {
      const res = await postRegister(VALID_BODY);
      expect(res.body.message).toBe('Internal server error');
      expect(JSON.stringify(res.body)).not.toContain('DB connection lost');
    });
  });
});
