import { AuthService } from '../../auth/auth.service';
import { IAuthRepository } from '../../auth/interfaces/auth-repository.interface';
import { ConflictError } from '../../shared/errors/conflict.error';
import { User } from '../../auth/auth.entity';
import * as passwordUtil from '../../shared/utils/password.util';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a fully-populated User entity for use in test assertions. */
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

/** Creates a jest-mocked IAuthRepository with safe defaults. */
function makeMockRepository(): jest.Mocked<IAuthRepository> {
  return {
    findByEmail: jest.fn(),
    create: jest.fn(),
    storeRefreshToken: jest.fn(),
    createEmailVerificationToken: jest.fn(),
    findById: jest.fn(),
    findVerificationTokenByHash: jest.fn(),
    updateVerificationTokenStatus: jest.fn(),
    updateUserVerificationStatus: jest.fn(),
    createPasswordResetToken: jest.fn(),
    findPasswordResetTokenByHash: jest.fn(),
    updatePassword: jest.fn(),
    deletePasswordResetToken: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService.register', () => {
  let mockRepository: jest.Mocked<IAuthRepository>;
  let service: AuthService;

  beforeEach(() => {
    mockRepository = makeMockRepository();
    service = new AuthService(mockRepository);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe('success — email does not exist yet', () => {
    it('calls findByEmail with the provided email', async () => {
      const createdUser = makeUser();
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(createdUser);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('$2b$12$hashed');

      await service.register({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });

      expect(mockRepository.findByEmail).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('ishan@example.com');
    });

    it('hashes the password before storing', async () => {
      const createdUser = makeUser();
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(createdUser);
      const hashSpy = jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('$2b$12$hashed');

      await service.register({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });

      expect(hashSpy).toHaveBeenCalledTimes(1);
      expect(hashSpy).toHaveBeenCalledWith('StrongP@ss1');
    });

    it('calls repository.create with hashed password, never the plain-text one', async () => {
      const createdUser = makeUser();
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(createdUser);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('$2b$12$hashed');

      await service.register({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' });

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'Ishan Sharma',
        email: 'ishan@example.com',
        passwordHash: '$2b$12$hashed',
      });
      // Confirm the plain-text password was never passed to create
      const callArg = mockRepository.create.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('password');
    });

    it('returns the user entity produced by the repository', async () => {
      const createdUser = makeUser();
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(createdUser);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('$2b$12$hashed');

      const result = await service.register({
        name: 'Ishan Sharma',
        email: 'ishan@example.com',
        password: 'StrongP@ss1',
      });

      expect(result).toEqual(createdUser);
    });
  });

  // ── Conflict — duplicate email ──────────────────────────────────────────────

  describe('failure — email already registered', () => {
    it('throws ConflictError when the email exists', async () => {
      mockRepository.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.register({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws ConflictError with the correct message', async () => {
      mockRepository.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.register({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' }),
      ).rejects.toThrow('An account with this email already exists');
    });

    it('does not call hashPassword when email is taken', async () => {
      mockRepository.findByEmail.mockResolvedValue(makeUser());
      const hashSpy = jest.spyOn(passwordUtil, 'hashPassword');

      await service.register({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' }).catch(() => {
        // swallow expected error
      });

      expect(hashSpy).not.toHaveBeenCalled();
    });

    it('does not call repository.create when email is taken', async () => {
      mockRepository.findByEmail.mockResolvedValue(makeUser());

      await service.register({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' }).catch(() => {});

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  // ── Repository errors propagate ────────────────────────────────────────────

  describe('failure — repository throws unexpectedly', () => {
    it('propagates a database error from findByEmail', async () => {
      mockRepository.findByEmail.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        service.register({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' }),
      ).rejects.toThrow('DB connection lost');
    });

    it('propagates a database error from create', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('$2b$12$hashed');
      mockRepository.create.mockRejectedValue(new Error('Unique constraint violation'));

      await expect(
        service.register({ name: 'Ishan Sharma', email: 'ishan@example.com', password: 'StrongP@ss1' }),
      ).rejects.toThrow('Unique constraint violation');
    });
  });
});
