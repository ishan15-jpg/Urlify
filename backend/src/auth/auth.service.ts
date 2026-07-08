import crypto from 'crypto';
import { IAuthService } from './interfaces/auth-service.interface';
import { IAuthRepository } from './interfaces/auth-repository.interface';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { LoginRequestDto } from './dtos/login-request.dto';
import { User } from './auth.entity';
import { ConflictError } from '../shared/errors/conflict.error';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { ForbiddenError } from '../shared/errors/forbidden.error';
import { NotFoundError } from '../shared/errors/not-found.error';
import { hashPassword, comparePassword } from '../shared/utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../shared/utils/token.util';
import { logger } from '../shared/utils/logger';
import { emailQueue } from '../shared/queues/email.queue';
import { redisClient } from '../shared/config/redis.config';
import { passwordResetQueue } from '../shared/queues/password-reset.queue';

export class AuthService implements IAuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  /**
  * @param dto - Validated registration payload (name, email, password).
  * @returns The newly created User entity.
  * @throws ConflictError if the email is already registered.
  */
  async register(dto: RegisterRequestDto): Promise<User> {
    logger.debug(`Looking up user by email`);
    const existing = await this.authRepository.findByEmail(dto.email);
    if (existing) {
      logger.warn(`Registration failed due to duplicate email`);
      throw new ConflictError('An account with this email already exists');
    }

    logger.debug(`Password hash initiated`)
    const passwordHash = await hashPassword(dto.password);
    logger.debug(`Password hash completed`)

    logger.debug(`Inserting new user into database`)
    const user = await this.authRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    
    logger.debug(`New user inserted successfully`);
    return user;
  }

  /**
   * @param dto - Validated login payload.
   * @returns User entity, access token, and refresh token.
   * @throws UnauthorizedError if email not found or password incorrect.
  */
  async login(dto: LoginRequestDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    logger.debug(`Looking up user by email`);
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      logger.warn(`Login failed: email not found`);
      throw new UnauthorizedError('Email not found');
    }

    logger.debug(`Comparing paswords`);
    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      logger.warn(`Login failed: incorrect password`);
      throw new UnauthorizedError('Incorrect password');
    }

    const payload = { userId: user.id, email: user.email, role: user.role || 'user' };
    logger.debug(`Creating access token`);
    const accessToken = generateAccessToken(payload);
    logger.debug(`Access token created`);
    logger.debug(`Creating refresh token`);
    const refreshToken = generateRefreshToken(payload);
    logger.debug(`Refresh token created`);

    // Hash refresh token using SHA-256 to save in database
    logger.debug(`Hashing refresh token`);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    logger.debug(`Refresh token hashed`);

    logger.debug(`Storing refresh token hash in repository`);
    this.storeRefreshTokens(user.id, tokenHash);

    return { user, accessToken, refreshToken };
  }

  /** Background task helper to store refresh token to Redis and DB. */
  private async storeRefreshTokens(userId: string, tokenHash: string): Promise<void> {
    const refreshTokenRecord = await this.authRepository.storeRefreshToken(userId, tokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const redisKey = `refresh_token:${tokenHash}`;
    const redisValue = JSON.stringify({ userId, tokenId: refreshTokenRecord.id });
    await redisClient.set(redisKey, redisValue, 'EX', 7 * 24 * 60 * 60);
  }

  /**
   * Generates a token, stores its hash, and pushes a send job to BullMQ.
   *
   * @param userId - The ID of the user requesting verification.
   * @param email - The user's registered email address.
   */
  async generateEmailVerificationLink(userId: string, email: string): Promise<void> {
    logger.debug(`Looking up user by email: ${email}`);
    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      logger.warn(`Verification link generation failed: User not found`);
      throw new NotFoundError('User', email);
    }

    if (user.isEmailVerified) {
      logger.warn(`Verification link generation failed: Email is already verified`);
      throw new ConflictError('This email is already verified');
    }

    // Generate secure random token
    logger.debug(`Generating email verification token`);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    logger.debug(`Storing verification token hash in repository`);
    const tokenRecord = await this.authRepository.createEmailVerificationToken(user.id, tokenHash, expiresAt);

    // Caching in Redis with a 10-minute TTL (600s)
    const redisKey = `verification_token:${tokenHash}`;
    const redisValue = JSON.stringify({ userId: user.id, tokenId: tokenRecord.id });
    logger.debug(`Caching verification token in Redis`);
    redisClient.set(redisKey, redisValue, 'EX', 600);

    // Push the email send job to BullMQ
    const clientUrl = process.env.CLIENT_URL;
    const verificationLink = `${clientUrl}?token=${rawToken}`;
    
    logger.debug(`Enqueuing email send job to BullMQ`);
    emailQueue.add('sendVerificationEmail', {
      to: email,
      verificationLink,
    });
    logger.info(`Email send job enqueued successfully for user: ${userId}`);
  }

  /**
   * Verifies a user's email using a token. Validates the token against stored hash,
   * sets the user as verified, and revokes/expires the token.
   *
   * @param token - The raw verification token string.
   * @returns The updated User entity.
   */
  async verifyEmail(token: string): Promise<User> {
    logger.debug(`Verifying email verification token`);
    
    // Hash the raw token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const redisKey = `verification_token:${tokenHash}`;

    let userId: string | null = null;
    let tokenId: string | null = null;

    // Check Redis cache first
    logger.debug(`Checking Redis cache for verification token`);
    const cachedData = await redisClient.get(redisKey);
    
    if (cachedData) {
      logger.debug(`Redis cache hit for verification token`);
      const parsed = JSON.parse(cachedData) as { userId: string; tokenId: string };
      userId = parsed.userId;
      tokenId = parsed.tokenId;
    } else {
      logger.debug(`Redis cache miss. Falling back to database lookup`);
      // Retrieve the token details from database
      const tokenRecord = await this.authRepository.findVerificationTokenByHash(tokenHash);
      
      // If not found, revoked, expired, or past expiresAt, throw UnauthorizedError
      if (
        !tokenRecord ||
        tokenRecord.isRevoked ||
        tokenRecord.isExpired ||
        new Date() > tokenRecord.expiresAt
      ) {
        logger.warn(`Email verification failed: Invalid or expired token`);
        throw new UnauthorizedError('Verification link is invalid or has expired');
      }

      userId = tokenRecord.userId;
      tokenId = tokenRecord.id;
    }

    // Retrieve the user
    const user = await this.authRepository.findById(userId);
    if (!user) {
      logger.warn(`Email verification failed: User ${userId} not found`);
      throw new NotFoundError('User', userId);
    }

    // If user is already verified
    if (user.isEmailVerified) {
      logger.warn(`Email verification failed: User ${user.id} email is already verified`);
      // Clean up cache just in case it hits a verified user
      if (cachedData) {
        redisClient.del(redisKey);
      }
      throw new ConflictError('This email is already verified');
    }

    // Perform database updates
    logger.debug(`Updating user verification status in repository`);
    await this.authRepository.updateUserVerificationStatus(user.id, true);

    logger.debug(`Invalidating token in repository`);
    this.authRepository.updateVerificationTokenStatus(tokenId, true, true);

    // Invalidate/delete from Redis cache
    logger.debug(`Removing verification token from Redis cache`);
    redisClient.del(redisKey);

    logger.info(`Email verified successfully for user: ${user.id}`);
    
    // Fetch and return the updated user
    const updatedUser = await this.authRepository.findById(user.id);
    if (!updatedUser) {
      throw new NotFoundError('User', user.id);
    }
    return updatedUser;
  }

  /**
   * Initiates forgot-password process: generates reset token, stores it in DB/cache,
   * and pushes email sending job to the password reset queue (all in the background).
   *
   * @param email - The email to check and send reset link.
   */
  async processForgotPassword(email: string): Promise<void> {
    logger.info(`Forgot password request received for email: ${email}`);
    const user = await this.authRepository.findByEmail(email);
    
    // Account enumeration protection: return success even if user not found or blacklisted
    if (!user || user.isBlacklisted) {
      logger.info(`Forgot password execution bypassed: User not found or blacklisted for email: ${email}`);
      return;
    }

    // Generate secure random token
    logger.debug(`Generating password reset token`);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Kick off storage and queuing asynchronously in the background (fire-and-forget)
    this.storeAndSendForgotPasswordLink(user.id, email, tokenHash, rawToken, expiresAt).catch(err => {
      logger.error(`Error processing forgot password background workflow for user ${user.id}:`, err);
    });
  }

  /** Background task helper to perform token database persistence, cache write, and enqueueing. */
  private async storeAndSendForgotPasswordLink(
    userId: string,
    email: string,
    tokenHash: string,
    rawToken: string,
    expiresAt: Date
  ): Promise<void> {
    logger.debug(`Storing password reset token in repository`);
    const tokenRecord = await this.authRepository.createPasswordResetToken(userId, tokenHash, expiresAt);

    logger.debug(`Caching password reset token in Redis`);
    const redisKey = `password_reset_token:${tokenHash}`;
    const redisValue = JSON.stringify({ userId, tokenId: tokenRecord.id });
    redisClient.set(redisKey, redisValue, 'EX', 300); // 5 minutes TTL

    const clientUrl = process.env.CLIENT_URL;
    const resetLink = `${clientUrl}?token=${rawToken}`;

    logger.debug(`Enqueuing password reset email job to BullMQ`);
    await passwordResetQueue.add('sendPasswordResetEmail', {
      to: email,
      resetLink,
    });
    logger.info(`Password reset background workflow completed successfully for user ${userId}`);
  }

  /**
   * Resets a user's password using a reset token. Checks token validity,
   * updates the user's password synchronously, and deletes the token in the background.
   */
  async resetPassword(dto: { token: string; newPassword: string }): Promise<void> {
    const { token, newPassword } = dto;
    logger.debug(`Reset password process initiated`);

    // Hash the token using SHA-256
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const redisKey = `password_reset_token:${tokenHash}`;

    let userId: string | null = null;
    let tokenId: string | null = null;

    // Check Redis cache first
    logger.debug(`Checking Redis cache for password reset token`);
    const cachedData = await redisClient.get(redisKey);

    if (cachedData) {
      logger.debug(`Redis cache hit for password reset token`);
      const parsed = JSON.parse(cachedData) as { userId: string; tokenId: string };
      userId = parsed.userId;
      tokenId = parsed.tokenId;
    } else {
      logger.debug(`Redis cache miss. Falling back to database lookup`);
      const tokenRecord = await this.authRepository.findPasswordResetTokenByHash(tokenHash);

      if (
        !tokenRecord ||
        tokenRecord.isRevoked ||
        tokenRecord.isExpired ||
        new Date() > tokenRecord.expiresAt
      ) {
        logger.warn(`Password reset failed: Invalid or expired token`);
        throw new UnauthorizedError('Reset token is invalid or has expired');
      }

      userId = tokenRecord.userId;
      tokenId = tokenRecord.id;
    }

    // Fetch the user
    const user = await this.authRepository.findById(userId);
    if (!user) {
      logger.warn(`Password reset failed: User ${userId} not found`);
      throw new NotFoundError('User', userId);
    }

    // Hash the new password using password hashing helper
    const newPasswordHash = await hashPassword(newPassword);

    // Synchronously update the password
    logger.debug(`Updating user password synchronously in database`);
    await this.authRepository.updatePassword(user.id, newPasswordHash);
    logger.info(`Password updated synchronously for user ${user.id}`);

    // Asynchronously delete token from Redis and PostgreSQL database (fire-and-forget background task)
    this.cleanupResetToken(redisKey, tokenId).catch((err) => {
      logger.error(`Error deleting reset token during background cleanup:`, err);
    });
  }

  /** Background task helper to delete reset token from Redis and DB. */
  private async cleanupResetToken(redisKey: string, tokenId: string): Promise<void> {
    logger.debug(`Removing password reset token from Redis cache`);
    await redisClient.del(redisKey);

    logger.debug(`Deleting password reset token ${tokenId} from database`);
    await this.authRepository.deletePasswordResetToken(tokenId);
    logger.info(`Password reset token clean up completed successfully`);
  }

  /**
   * Refreshes user session using a refresh token.
   * Compares token hash against cache/database, checks for reuse (revocation) to prevent theft,
   * updates token state synchronously, and returns new tokens.
   */
  async refreshSession(oldToken: string): Promise<{ accessToken: string; newRefreshToken: string }> {
    logger.debug(`Refresh session process initiated`);

    // 1. Verify token signature and extract user info
    let payload: any;
    try {
      payload = verifyRefreshToken(oldToken);
    } catch (err) {
      logger.warn(`Refresh token signature verification failed`);
      throw new UnauthorizedError('Refresh token is invalid or has expired. Please log in again.');
    }

    const userId = payload.userId;
    const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
    const oldRedisKey = `refresh_token:${oldTokenHash}`;

    let tokenId: string | null = null;

    // 2. Lookup old token in Redis cache
    logger.debug(`Checking Redis cache for refresh token`);
    const cachedData = await redisClient.get(oldRedisKey);

    if (cachedData) {
      logger.debug(`Redis cache hit for refresh token`);
      const parsed = JSON.parse(cachedData) as { userId: string; tokenId: string };
      tokenId = parsed.tokenId;
    } else {
      logger.debug(`Redis cache miss. Falling back to database lookup`);
      const tokenRecord = await this.authRepository.findRefreshTokenByHash(oldTokenHash);

      if (!tokenRecord) {
        logger.warn(`Refresh token not found in database`);
        throw new UnauthorizedError('Refresh token is invalid or has expired. Please log in again.');
      }

      // Check if token was revoked (reuse detection / potential theft)
      if (tokenRecord.isRevoked) {
        logger.warn(`Potential refresh token reuse detected for user ${userId}. Revoking all sessions.`);
        await this.authRepository.deleteAllRefreshTokensForUser(userId);
        throw new ForbiddenError('Refresh token has been reused. Access denied and all sessions revoked.');
      }

      // Check if token is expired
      if (tokenRecord.isExpired || new Date() > tokenRecord.expiresAt) {
        logger.warn(`Refresh token has expired in database`);
        throw new UnauthorizedError('Refresh token is invalid or has expired. Please log in again.');
      }

      tokenId = tokenRecord.id;
    }

    // 3. Fetch user
    const user = await this.authRepository.findById(userId);
    if (!user) {
      logger.warn(`Refresh failed: User ${userId} not found`);
      throw new NotFoundError('User', userId);
    }

    // 4. Generate new access and refresh tokens
    const tokenPayload = { userId: user.id, email: user.email, role: user.role || 'user' };
    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 5. Rotate tokens synchronously
    logger.debug(`Revoking old refresh token in database and cache`);
    await this.authRepository.revokeRefreshToken(tokenId!);
    await redisClient.del(oldRedisKey);

    logger.debug(`Storing and caching new refresh token`);
    const newTokenRecord = await this.authRepository.storeRefreshToken(user.id, newRefreshTokenHash, newExpiresAt);
    
    const newRedisKey = `refresh_token:${newRefreshTokenHash}`;
    const newRedisValue = JSON.stringify({ userId: user.id, tokenId: newTokenRecord.id });
    await redisClient.set(newRedisKey, newRedisValue, 'EX', 7 * 24 * 60 * 60);

    logger.info(`Session successfully refreshed for user ${user.id}`);
    return { accessToken, newRefreshToken };
  }

  /**
   * Fetches a paginated list of users and pagination metadata based on query filters.
   *
   * @param params - Query parameters.
   * @returns List of matching user entities and pagination info.
   */
  async getUsers(params: {
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
  }> {
    logger.info(`Fetching paginated users: page=${params.page}, limit=${params.limit}, search=${params.search || ''}, status=${params.status || ''}`);
    const { users, totalItems } = await this.authRepository.findAndCount!(params);
    const totalPages = Math.ceil(totalItems / params.limit) || 1;
    
    return {
      users,
      pagination: {
        totalItems,
        currentPage: params.page,
        totalPages,
        limit: params.limit,
      },
    };
  }
}

