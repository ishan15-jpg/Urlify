import request from 'supertest';
import { AuthRepository } from '../../auth/auth.repository';
import { User } from '../../auth/auth.entity';
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
    role: 'user',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('GET /api/v1/admin/users', () => {
  let findAndCountSpy: jest.SpyInstance;
  let verifyAccessTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    findAndCountSpy = jest.spyOn(AuthRepository.prototype, 'findAndCount');
    verifyAccessTokenSpy = jest.spyOn(tokenUtil, 'verifyAccessToken');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function getUsers(tokenHeader?: string, query: string = '') {
    const req = request(app).get(`/api/v1/admin/users${query}`);
    if (tokenHeader !== undefined) {
      req.set('Authorization', tokenHeader);
    }
    return req;
  }

  // ── 401 Unauthorized ──────────────────────────────────────────────────────────
  describe('401 Unauthorized', () => {
    it('returns HTTP 401 when Authorization header is missing', async () => {
      const res = await getUsers();
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Missing or invalid access token');
    });

    it('returns HTTP 401 when Authorization header is invalid', async () => {
      const res = await getUsers('InvalidHeader');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Missing or invalid access token');
    });

    it('returns HTTP 401 when token verification fails', async () => {
      verifyAccessTokenSpy.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const res = await getUsers('Bearer invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired access token');
    });
  });

  // ── 403 Forbidden ───────────────────────────────────────────────────────────
  describe('403 Forbidden', () => {
    it('returns HTTP 403 when authenticated user is not an admin', async () => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'user-id',
        email: 'user@example.com',
        role: 'user',
      });
      
      const res = await getUsers('Bearer user-token');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access this resource');
    });
  });

  // ── 400 Bad Request — Query Validation ──────────────────────────────────────
  describe('400 Bad Request — query validation', () => {
    beforeEach(() => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
      });
    });

    it('rejects when limit is greater than 100', async () => {
      const res = await getUsers('Bearer admin-token', '?limit=101');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Limit cannot exceed 100');
    });

    it('rejects when limit is less than 1', async () => {
      const res = await getUsers('Bearer admin-token', '?limit=0');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Limit must be at least 1');
    });

    it('rejects when page is less than 1', async () => {
      const res = await getUsers('Bearer admin-token', '?page=0');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Page must be at least 1');
    });

    it('rejects when status is invalid', async () => {
      const res = await getUsers('Bearer admin-token', '?status=invalid-status');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expected one of');
    });
  });

  // ── 200 OK — Success Cases ──────────────────────────────────────────────────
  describe('200 OK — success', () => {
    const adminUser = makeUser({ id: 'admin-id', email: 'admin@example.com', role: 'admin' });
    const regularUser = makeUser({ id: 'user-id', email: 'user@example.com', role: 'user' });

    beforeEach(() => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });
    });

    it('returns standard envelope with paginated users', async () => {
      findAndCountSpy.mockResolvedValue({
        users: [regularUser],
        totalItems: 1,
      });

      const res = await getUsers('Bearer admin-token', '?page=1&limit=20');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statusCode).toBe(200);
      expect(res.body.message).toBe('Users fetched successfully');
      
      expect(res.body.data.users).toHaveLength(1);
      expect(res.body.data.users[0]).toEqual({
        id: regularUser.id,
        name: regularUser.name,
        email: regularUser.email,
        role: 'USER', // mapped to uppercase
        isEmailVerified: regularUser.isEmailVerified,
        isBlocklisted: regularUser.isBlacklisted,
        createdAt: regularUser.createdAt.toISOString(),
      });
      
      expect(res.body.data.pagination).toEqual({
        totalItems: 1,
        currentPage: 1,
        totalPages: 1,
        limit: 20,
      });
    });

    it('passes default page and limit to service when query params are absent', async () => {
      findAndCountSpy.mockResolvedValue({
        users: [],
        totalItems: 0,
      });

      const res = await getUsers('Bearer admin-token');
      expect(res.status).toBe(200);
      expect(findAndCountSpy).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        status: undefined,
      });
    });

    it('passes search and status filters to repository correctly', async () => {
      findAndCountSpy.mockResolvedValue({
        users: [],
        totalItems: 0,
      });

      const res = await getUsers('Bearer admin-token', '?search=ishan&status=active&page=2&limit=10');
      expect(res.status).toBe(200);
      expect(findAndCountSpy).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'ishan',
        status: 'active',
      });
    });
  });

  // ── 500 Internal Server Error ───────────────────────────────────────────────
  describe('500 Internal Server Error', () => {
    it('returns HTTP 500 when database lookup fails', async () => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
      });
      findAndCountSpy.mockRejectedValue(new Error('DB connection reset'));

      const res = await getUsers('Bearer admin-token');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');
    });
  });
});
