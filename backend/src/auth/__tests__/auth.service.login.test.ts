import crypto from 'crypto';
import { AuthService } from '../../auth/auth.service';
import { IAuthRepository } from '../../auth/interfaces/auth-repository.interface';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';
import { User } from '../../auth/auth.entity';
import * as passwordUtil from '../../shared/utils/password.util';
import * as tokenUtil from '../../shared/utils/token.util';

// Mock logger
jest.mock('../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

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
  };
}

describe('AuthService.login', () => {
  let mockRepository: jest.Mocked<IAuthRepository>;
  let service: AuthService;

  beforeEach(() => {
    mockRepository = makeMockRepository();
    service = new AuthService(mockRepository);
    jest.restoreAllMocks();
  });

  describe('failure — email not found', () => {
    it('throws UnauthorizedError when email is not registered', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'Password123!' })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('throws UnauthorizedError with message "Email not found"', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'Password123!' })
      ).rejects.toThrow('Email not found');
    });

    it('does not verify password or store token when user is not found', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      const compareSpy = jest.spyOn(passwordUtil, 'comparePassword');

      await service.login({ email: 'nonexistent@example.com', password: 'Password123!' }).catch(() => {});

      expect(compareSpy).not.toHaveBeenCalled();
      expect(mockRepository.storeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('failure — incorrect password', () => {
    it('throws UnauthorizedError when password does not match', async () => {
      mockRepository.findByEmail.mockResolvedValue(makeUser());
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);

      await expect(
        service.login({ email: 'ishan@example.com', password: 'WrongPassword1!' })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('throws UnauthorizedError with message "Incorrect password"', async () => {
      mockRepository.findByEmail.mockResolvedValue(makeUser());
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);

      await expect(
        service.login({ email: 'ishan@example.com', password: 'WrongPassword1!' })
      ).rejects.toThrow('Incorrect password');
    });

    it('does not generate tokens or store token in DB when password is wrong', async () => {
      mockRepository.findByEmail.mockResolvedValue(makeUser());
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);
      const genAccessSpy = jest.spyOn(tokenUtil, 'generateAccessToken');

      await service.login({ email: 'ishan@example.com', password: 'WrongPassword1!' }).catch(() => {});

      expect(genAccessSpy).not.toHaveBeenCalled();
      expect(mockRepository.storeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('success — valid credentials', () => {
    const mockUser = makeUser();
    const mockAccessToken = 'mock.access.token';
    const mockRefreshToken = 'mock.refresh.token';

    beforeEach(() => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(tokenUtil, 'generateAccessToken').mockReturnValue(mockAccessToken);
      jest.spyOn(tokenUtil, 'generateRefreshToken').mockReturnValue(mockRefreshToken);
      mockRepository.storeRefreshToken.mockResolvedValue(undefined);
    });

    it('verifies the password hash', async () => {
      const compareSpy = jest.spyOn(passwordUtil, 'comparePassword');
      await service.login({ email: 'ishan@example.com', password: 'StrongP@ss1' });

      expect(compareSpy).toHaveBeenCalledWith('StrongP@ss1', mockUser.passwordHash);
    });

    it('generates access and refresh tokens with correct payload', async () => {
      const genAccessSpy = jest.spyOn(tokenUtil, 'generateAccessToken');
      const genRefreshSpy = jest.spyOn(tokenUtil, 'generateRefreshToken');

      await service.login({ email: 'ishan@example.com', password: 'StrongP@ss1' });

      const expectedPayload = { userId: mockUser.id, email: mockUser.email, role: 'user' };
      expect(genAccessSpy).toHaveBeenCalledWith(expectedPayload);
      expect(genRefreshSpy).toHaveBeenCalledWith(expectedPayload);
    });

    it('stores the hashed refresh token in the database', async () => {
      const expectedHash = crypto.createHash('sha256').update(mockRefreshToken).digest('hex');

      await service.login({ email: 'ishan@example.com', password: 'StrongP@ss1' });

      expect(mockRepository.storeRefreshToken).toHaveBeenCalledTimes(1);
      expect(mockRepository.storeRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        expectedHash,
        expect.any(Date)
      );
    });

    it('returns the user, access token, and refresh token', async () => {
      const result = await service.login({ email: 'ishan@example.com', password: 'StrongP@ss1' });

      expect(result).toEqual({
        user: mockUser,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });
  });
});
