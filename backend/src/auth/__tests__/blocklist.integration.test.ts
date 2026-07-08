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

describe('PATCH /api/v1/admin/users/:userId/blocklist', () => {
  let findByIdSpy: jest.SpyInstance;
  let updateBlocklistStatusSpy: jest.SpyInstance;
  let deleteAllRefreshTokensForUserSpy: jest.SpyInstance;
  let verifyAccessTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    findByIdSpy = jest.spyOn(AuthRepository.prototype, 'findById');
    updateBlocklistStatusSpy = jest.spyOn(AuthRepository.prototype, 'updateBlocklistStatus');
    deleteAllRefreshTokensForUserSpy = jest.spyOn(AuthRepository.prototype, 'deleteAllRefreshTokensForUser');
    verifyAccessTokenSpy = jest.spyOn(tokenUtil, 'verifyAccessToken');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function patchBlocklist(userId: string, body: unknown, tokenHeader?: string) {
    const req = request(app).patch(`/api/v1/admin/users/${userId}/blocklist`);
    if (tokenHeader !== undefined) {
      req.set('Authorization', tokenHeader);
    }
    return req.send(body as object);
  }

  // ── 401 Unauthorized ──────────────────────────────────────────────────────────
  describe('401 Unauthorized', () => {
    it('returns HTTP 401 when Authorization header is missing', async () => {
      const res = await patchBlocklist('target-user-id', { blocklisted: true });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Missing or invalid access token');
    });

    it('returns HTTP 401 when Authorization header is invalid', async () => {
      const res = await patchBlocklist('target-user-id', { blocklisted: true }, 'InvalidHeader');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Missing or invalid access token');
    });

    it('returns HTTP 401 when token verification fails', async () => {
      verifyAccessTokenSpy.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const res = await patchBlocklist('target-user-id', { blocklisted: true }, 'Bearer invalid-token');
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
      
      const res = await patchBlocklist('target-user-id', { blocklisted: true }, 'Bearer user-token');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access this resource');
    });
  });

  // ── 400 Bad Request — Input Validation ──────────────────────────────────────
  describe('400 Bad Request — input validation', () => {
    beforeEach(() => {
      verifyAccessTokenSpy.mockReturnValue({
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
      });
    });

    it('rejects when blocklisted field is missing', async () => {
      const res = await patchBlocklist('target-user-id', { reason: 'No blocklisted field' }, 'Bearer admin-token');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('blocklisted must be a boolean');
    });

    it('rejects when blocklisted field is not a boolean', async () => {
      const res = await patchBlocklist('target-user-id', { blocklisted: 'yes' }, 'Bearer admin-token');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('blocklisted must be a boolean');
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
      
      const res = await patchBlocklist('non-existent-user-id', { blocklisted: true }, 'Bearer admin-token');
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

    it('returns HTTP 409 when admin attempts to blocklist themselves', async () => {
      const res = await patchBlocklist(adminUser.id, { blocklisted: true }, 'Bearer admin-token');
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin cannot blocklist themselves');
    });

    it('returns HTTP 409 when admin attempts to blocklist another admin user', async () => {
      findByIdSpy.mockResolvedValue(targetAdmin);

      const res = await patchBlocklist(targetAdmin.id, { blocklisted: true }, 'Bearer admin-token');
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin cannot blocklist another admin');
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

    it('successfully blocklists a user and revokes active sessions', async () => {
      findByIdSpy.mockResolvedValue(targetUser);
      
      const updatedUser = { ...targetUser, isBlacklisted: true, updatedAt: new Date('2026-07-08T10:00:00Z') };
      updateBlocklistStatusSpy.mockResolvedValue(updatedUser);
      deleteAllRefreshTokensForUserSpy.mockResolvedValue(undefined);

      const res = await patchBlocklist(targetUser.id, { blocklisted: true, reason: 'Abuse' }, 'Bearer admin-token');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User has been blocklisted successfully');
      expect(res.body.data).toEqual({
        id: targetUser.id,
        isBlocklisted: true,
        blocklistedAt: updatedUser.updatedAt.toISOString(),
      });

      expect(updateBlocklistStatusSpy).toHaveBeenCalledWith(targetUser.id, true);
      expect(deleteAllRefreshTokensForUserSpy).toHaveBeenCalledWith(targetUser.id);
    });

    it('successfully lifts blocklist for a user and does not revoke sessions', async () => {
      findByIdSpy.mockResolvedValue({ ...targetUser, isBlacklisted: true });
      
      const updatedUser = { ...targetUser, isBlacklisted: false, updatedAt: new Date('2026-07-08T10:00:00Z') };
      updateBlocklistStatusSpy.mockResolvedValue(updatedUser);

      const res = await patchBlocklist(targetUser.id, { blocklisted: false }, 'Bearer admin-token');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User blocklist has been lifted successfully');
      expect(res.body.data).toEqual({
        id: targetUser.id,
        isBlocklisted: false,
        blocklistedAt: updatedUser.updatedAt.toISOString(),
      });

      expect(updateBlocklistStatusSpy).toHaveBeenCalledWith(targetUser.id, false);
      expect(deleteAllRefreshTokensForUserSpy).not.toHaveBeenCalled();
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
      updateBlocklistStatusSpy.mockRejectedValue(new Error('Database error'));

      const res = await patchBlocklist(targetUser.id, { blocklisted: true }, 'Bearer admin-token');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');
    });
  });
});
