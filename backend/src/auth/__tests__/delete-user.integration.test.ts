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

describe('DELETE /api/v1/admin/users/:userId', () => {
  let findByIdSpy: jest.SpyInstance;
  let softDeleteUserSpy: jest.SpyInstance;
  let deleteAllRefreshTokensForUserSpy: jest.SpyInstance;
  let verifyAccessTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    findByIdSpy = jest.spyOn(AuthRepository.prototype, 'findById');
    softDeleteUserSpy = jest.spyOn(AuthRepository.prototype, 'softDeleteUser');
    deleteAllRefreshTokensForUserSpy = jest.spyOn(AuthRepository.prototype, 'deleteAllRefreshTokensForUser');
    verifyAccessTokenSpy = jest.spyOn(tokenUtil, 'verifyAccessToken');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function deleteUser(userId: string, tokenHeader?: string) {
    const req = request(app).delete(`/api/v1/admin/users/${userId}`);
    if (tokenHeader !== undefined) {
      req.set('Authorization', tokenHeader);
    }
    return req.send();
  }

  // ── 401 Unauthorized ──────────────────────────────────────────────────────────
  describe('401 Unauthorized', () => {
    it('returns HTTP 401 when Authorization header is missing', async () => {
      const res = await deleteUser('target-user-id');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Missing or invalid access token');
    });

    it('returns HTTP 401 when Authorization header is invalid', async () => {
      const res = await deleteUser('target-user-id', 'InvalidHeader');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Missing or invalid access token');
    });

    it('returns HTTP 401 when token verification fails', async () => {
      verifyAccessTokenSpy.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const res = await deleteUser('target-user-id', 'Bearer invalid-token');
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
      
      const res = await deleteUser('target-user-id', 'Bearer user-token');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access this resource');
    });
  });

  // ── 404 Not Found ───────────────────────────────────────────────────────────
  describe('404 Not Found', () => {
    beforeEach(() => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
      });
    });

    it('returns HTTP 404 when target user does not exist', async () => {
      findByIdSpy.mockResolvedValue(null);
      
      const res = await deleteUser('non-existent-user-id', 'Bearer admin-token');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User with id non-existent-user-id not found');
    });
  });

  // ── 409 Conflict — Policy Checks ─────────────────────────────────────────────
  describe('409 Conflict — policy validation', () => {
    const adminUser = makeUser({ id: 'admin-id', email: 'admin@example.com', role: 'admin' });
    const targetAdmin = makeUser({ id: 'other-admin-id', email: 'otheradmin@example.com', role: 'admin' });

    beforeEach(() => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });
    });

    it('returns HTTP 409 when admin attempts to delete themselves', async () => {
      const res = await deleteUser(adminUser.id, 'Bearer admin-token');
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin cannot delete themselves');
    });

    it('returns HTTP 409 when admin attempts to delete another admin user', async () => {
      findByIdSpy.mockResolvedValue(targetAdmin);

      const res = await deleteUser(targetAdmin.id, 'Bearer admin-token');
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin cannot delete another admin');
    });
  });

  // ── 200 OK — Success Cases ──────────────────────────────────────────────────
  describe('200 OK — success', () => {
    const adminUser = makeUser({ id: 'admin-id', email: 'admin@example.com', role: 'admin' });
    const targetUser = makeUser({ id: 'user-id', email: 'user@example.com', role: 'user' });

    beforeEach(() => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });
    });

    it('successfully soft deletes a user and revokes active sessions', async () => {
      findByIdSpy.mockResolvedValue(targetUser);
      
      const updatedUser = { ...targetUser, isDeleted: true, updatedAt: new Date('2026-07-08T10:00:00Z') };
      softDeleteUserSpy.mockResolvedValue(updatedUser);
      deleteAllRefreshTokensForUserSpy.mockResolvedValue(undefined);

      const res = await deleteUser(targetUser.id, 'Bearer admin-token');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User account deleted successfully');
      expect(res.body.data).toEqual({
        id: targetUser.id,
        deletedAt: updatedUser.updatedAt.toISOString(),
      });

      expect(softDeleteUserSpy).toHaveBeenCalledWith(targetUser.id);
      expect(deleteAllRefreshTokensForUserSpy).toHaveBeenCalledWith(targetUser.id);
    });
  });

  // ── 500 Internal Server Error ───────────────────────────────────────────────
  describe('500 Internal Server Error', () => {
    const adminUser = makeUser({ id: 'admin-id', email: 'admin@example.com', role: 'admin' });
    const targetUser = makeUser({ id: 'user-id', email: 'user@example.com', role: 'user' });

    beforeEach(() => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });
    });

    it('returns HTTP 500 when database update fails', async () => {
      findByIdSpy.mockResolvedValue(targetUser);
      softDeleteUserSpy.mockRejectedValue(new Error('Database error'));

      const res = await deleteUser(targetUser.id, 'Bearer admin-token');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');
    });
  });
});
