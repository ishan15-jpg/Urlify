import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../auth/auth.controller';
import { IAuthService } from '../../auth/interfaces/auth-service.interface';
import { ConflictError } from '../../shared/errors/conflict.error';
import { User } from '../../auth/auth.entity';

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

function makeRequest(body: unknown = {}, headers: Record<string, string> = {}): Request {
  return { body, headers } as unknown as Request;
}

function makeResponse(): { res: Response; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  return { res, json, status };
}

function makeNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthController.register', () => {
  let mockService: jest.Mocked<IAuthService>;
  let controller: AuthController;

  beforeEach(() => {
    mockService = {
      register: jest.fn(),
      login: jest.fn(),
      generateEmailVerificationLink: jest.fn(),
      verifyEmail: jest.fn(),
      processForgotPassword: jest.fn(),
    };
    controller = new AuthController(mockService);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe('success', () => {
    it('calls authService.register with the request body', async () => {
      const createdUser = makeUser();
      mockService.register.mockResolvedValue(createdUser);
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res } = makeResponse();
      const next = makeNext();

      await controller.register(req, res, next);

      expect(mockService.register).toHaveBeenCalledTimes(1);
      expect(mockService.register).toHaveBeenCalledWith({
        name: 'Ishan Sharma',
        email: 'ishan@example.com',
        password: 'StrongP@ss1',
      });
    });

    it('responds with HTTP 201', async () => {
      mockService.register.mockResolvedValue(makeUser());
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res, status } = makeResponse();

      await controller.register(req, res, makeNext());

      expect(status).toHaveBeenCalledWith(201);
    });

    it('responds with success=true and statusCode=201', async () => {
      mockService.register.mockResolvedValue(makeUser());
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res, json } = makeResponse();

      await controller.register(req, res, makeNext());

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, statusCode: 201 }),
      );
    });

    it('returns the user data without passwordHash in the response body', async () => {
      const createdUser = makeUser();
      mockService.register.mockResolvedValue(createdUser);
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res, json } = makeResponse();

      await controller.register(req, res, makeNext());

      const body = json.mock.calls[0][0] as Record<string, unknown>;
      const user = (body['data'] as Record<string, unknown>)['user'] as Record<string, unknown>;
      expect(user['id']).toBe(createdUser.id);
      expect(user['email']).toBe(createdUser.email);
      expect(user['name']).toBe(createdUser.name);
      expect(user['isEmailVerified']).toBe(false);
      // passwordHash must NOT be leaked
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('includes the expected message in the response', async () => {
      mockService.register.mockResolvedValue(makeUser());
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res, json } = makeResponse();

      await controller.register(req, res, makeNext());

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Account created. Please verify your email to continue.',
        }),
      );
    });

    it('includes requestId from x-request-id header when present', async () => {
      mockService.register.mockResolvedValue(makeUser());
      const req = makeRequest(
        { name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' },
        { 'x-request-id': 'req_abc123' },
      );
      const { res, json } = makeResponse();

      await controller.register(req, res, makeNext());

      const body = json.mock.calls[0][0] as Record<string, unknown>;
      const meta = body['meta'] as Record<string, unknown>;
      expect(meta['requestId']).toBe('req_abc123');
    });

    it('sets requestId to null when x-request-id header is absent', async () => {
      mockService.register.mockResolvedValue(makeUser());
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res, json } = makeResponse();

      await controller.register(req, res, makeNext());

      const body = json.mock.calls[0][0] as Record<string, unknown>;
      const meta = body['meta'] as Record<string, unknown>;
      expect(meta['requestId']).toBeNull();
    });

    it('includes an ISO 8601 timestamp in meta', async () => {
      mockService.register.mockResolvedValue(makeUser());
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res, json } = makeResponse();

      await controller.register(req, res, makeNext());

      const body = json.mock.calls[0][0] as Record<string, unknown>;
      const meta = body['meta'] as Record<string, unknown>;
      expect(typeof meta['timestamp']).toBe('string');
      expect(new Date(meta['timestamp'] as string).toISOString()).toBe(meta['timestamp']);
    });

    it('does not call next() on success', async () => {
      mockService.register.mockResolvedValue(makeUser());
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res } = makeResponse();
      const next = makeNext();

      await controller.register(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });

  // ── Error forwarding ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('forwards ConflictError to next() when email is taken', async () => {
      const conflictErr = new ConflictError('An account with this email already exists');
      mockService.register.mockRejectedValue(conflictErr);
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res } = makeResponse();
      const next = makeNext() as jest.Mock;

      await controller.register(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(conflictErr);
    });

    it('forwards unexpected errors to next()', async () => {
      const unexpectedErr = new Error('DB is down');
      mockService.register.mockRejectedValue(unexpectedErr);
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res } = makeResponse();
      const next = makeNext() as jest.Mock;

      await controller.register(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(unexpectedErr);
    });

    it('does not write to res when an error occurs', async () => {
      mockService.register.mockRejectedValue(new Error('failure'));
      const req = makeRequest({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });
      const { res, json, status } = makeResponse();

      await controller.register(req, res, makeNext());

      expect(status).not.toHaveBeenCalled();
      expect(json).not.toHaveBeenCalled();
    });
  });
});
