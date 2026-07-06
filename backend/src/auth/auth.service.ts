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
    await this.authRepository.createEmailVerificationToken(user.id, tokenHash, expiresAt);

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
}
