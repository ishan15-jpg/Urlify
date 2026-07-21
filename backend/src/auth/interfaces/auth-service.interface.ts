import { User } from '../auth.entity';
import { RegisterRequestDto } from '../dtos/register-request.dto';
import { LoginRequestDto } from '../dtos/login-request.dto';

export interface IAuthService {
  /**
   * Registers a new user account.
   * Checks for duplicate email, hashes the password, and persists the record.
   *
   * @param dto - Validated registration payload.
   * @returns The newly created User entity.
   * @throws ConflictError if the email is already registered.
   */
  register(dto: RegisterRequestDto): Promise<User>;

  /**
   * Log in an existing user.
   *
   * @param dto - Validated login payload (email and password).
   * @returns User entity, access token, and refresh token.
   */
  login(dto: LoginRequestDto): Promise<{ user: User; accessToken: string; refreshToken: string }>;

  /**
   * Generates an email verification token, stores it in the database, and enqueues a job to send the email.
   *
   * @param userId - The ID of the user.
   * @param email - The registered email address of the user.
   */
  generateEmailVerificationLink(userId: string, email: string): Promise<void>;

  /**
   * Verifies a user's email using a token. Validates the token against stored hash,
   * sets the user as verified, and revokes/expires the token.
   *
   * @param token - The raw verification token string.
   * @returns The updated User entity.
   */
  verifyEmail(token: string): Promise<User>;

  /**
   * Initiates forgot-password process: generates reset token, stores it in DB/cache,
   * and pushes email sending job to the password reset queue (all in the background).
   *
   * @param email - The email to check and send reset link.
   */
  processForgotPassword(email: string): Promise<void>;

  /**
   * Resets a user's password using a reset token. Checks token validity,
   * updates the user's password synchronously, and deletes the token in the background.
   *
   * @param dto - Token and new password details.
   */
  resetPassword(dto: { token: string; newPassword: string }): Promise<void>;

  /**
   * Refreshes user session using a refresh token.
   * Compares token hash against cache/database, checks for reuse (revocation) to prevent theft,
   * updates token state synchronously, and returns new tokens.
   *
   * @param oldToken - The current raw refresh token.
   */
  refreshSession(oldToken: string): Promise<{ accessToken: string; newRefreshToken: string }>;

  /**
   * Fetches a paginated list of users and pagination metadata based on query filters.
   *
   * @param params - Query parameters.
   * @returns List of matching user entities and pagination info.
   */
  getUsers?(params: {
    page: number;
    limit: number;
    search?: string;
    status?: 'active' | 'blocklisted' | 'unverified';
  }): Promise<{
    users: User[];
    pagination: {
      totalItems: number;
      currentPage: number;
      totalPages: number;
      limit: number;
    };
  }>;

  /**
   * Updates a user's blocklist status and revokes active refresh tokens if blocklisted.
   *
   * @param params - Admin ID, target user ID, blocklisted flag, and optional reason.
   * @returns The updated User entity.
   */
  updateBlocklistStatus?(params: {
    adminId: string;
    targetUserId: string;
    blocklisted: boolean;
    reason?: string;
  }): Promise<User>;

  /**
   * Soft deletes a user account and revokes active refresh tokens.
   *
   * @param params - Admin ID and target user ID.
   * @returns The updated User entity representing the soft-deleted state.
   */
  softDeleteUser?(params: {
    adminId: string;
    targetUserId: string;
  }): Promise<User>;

  /**
   * Logs out a user by blocklisting their access token and revoking their refresh token.
   *
   * @param userId - The ID of the user.
   * @param accessToken - The current access token to blocklist.
   * @param exp - The expiration timestamp of the access token.
   * @param refreshToken - The optional refresh token to revoke.
   */
  logout(userId: string, accessToken: string, exp: number, refreshToken?: string): Promise<void>;
}

