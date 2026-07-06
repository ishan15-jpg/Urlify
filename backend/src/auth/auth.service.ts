import crypto from 'crypto';
import { IAuthService } from './interfaces/auth-service.interface';
import { IAuthRepository } from './interfaces/auth-repository.interface';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { LoginRequestDto } from './dtos/login-request.dto';
import { User } from './auth.entity';
import { ConflictError } from '../shared/errors/conflict.error';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { NotFoundError } from '../shared/errors/not-found.error';
import { hashPassword, comparePassword } from '../shared/utils/password.util';
import { generateAccessToken, generateRefreshToken } from '../shared/utils/token.util';
import { logger } from '../shared/utils/logger';
import { emailQueue } from '../shared/queues/email.queue';
import { redisClient } from '../shared/config/redis.config';

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

    const payload = { userId: user.id, email: user.email, role: 'user' };
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
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    logger.debug(`Storing refresh token hash in repository`);
    await this.authRepository.storeRefreshToken(user.id, tokenHash, expiresAt);

    return { user, accessToken, refreshToken };
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
    await redisClient.set(redisKey, redisValue, 'EX', 600);

    // Push the email send job to BullMQ
    const clientUrl = process.env.CLIENT_URL;
    const verificationLink = `${clientUrl}?token=${rawToken}`;
    
    logger.debug(`Enqueuing email send job to BullMQ`);
    await emailQueue.add('sendVerificationEmail', {
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
        await redisClient.del(redisKey);
      }
      throw new ConflictError('This email is already verified');
    }

    // Perform database updates
    logger.debug(`Updating user verification status in repository`);
    await this.authRepository.updateUserVerificationStatus(user.id, true);

    logger.debug(`Invalidating token in repository`);
    await this.authRepository.updateVerificationTokenStatus(tokenId, true, true);

    // Invalidate/delete from Redis cache
    logger.debug(`Removing verification token from Redis cache`);
    await redisClient.del(redisKey);

    logger.info(`Email verified successfully for user: ${user.id}`);
    
    // Fetch and return the updated user
    const updatedUser = await this.authRepository.findById(user.id);
    if (!updatedUser) {
      throw new NotFoundError('User', user.id);
    }
    return updatedUser;
  }
}
