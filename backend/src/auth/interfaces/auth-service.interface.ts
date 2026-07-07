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
}

