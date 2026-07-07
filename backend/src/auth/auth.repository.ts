import { Pool } from 'pg';
import { IAuthRepository } from './interfaces/auth-repository.interface';
import { User, EmailVerificationToken, PasswordResetToken } from './auth.entity';
import { logger } from '../shared/utils/logger';


export class AuthRepository implements IAuthRepository {
  constructor(private readonly db: Pool) {}

  /**
   * Looks up a user by email address.
   * Only returns non-deleted records (is_deleted = false).
   *
   * @param email - The email to search for.
   * @returns The matching User entity, or null if not found.
   */
  async findByEmail(email: string): Promise<User | null> {
    logger.debug(`Database query initiated`);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT id, name, email, password_hash, is_email_verified, is_blacklisted,
              is_deleted, last_login, created_at, updated_at
       FROM users
       WHERE email = $1 AND is_deleted = false
       LIMIT 1`,
      [email],
    );

    if (!result.rows[0]) {
      logger.debug(`User not found from database`);
      return null;
    }
    logger.debug(`User found from database`);
    return this.toEntity(result.rows[0]);
  }

  /**
   * Inserts a new user into the users table.
   * The database generates the UUID primary key and audit timestamps.
   *
   * @param data - The name, email, and hashed password to store.
   * @returns The newly created User entity.
   */
  async create(data: Pick<User, 'name' | 'email' | 'passwordHash'>): Promise<User> {
    logger.debug(`Database query initiated`)
    const result = await this.db.query<Record<string, unknown>>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, password_hash, is_email_verified, is_blacklisted,
                 is_deleted, last_login, created_at, updated_at`,
      [data.name, data.email, data.passwordHash],
    );
    
    return this.toEntity(result.rows[0]);
  }

  /** Maps a raw database row to the User domain entity. */
  private toEntity(row: Record<string, unknown>): User {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      email: row['email'] as string,
      passwordHash: row['password_hash'] as string,
      isEmailVerified: row['is_email_verified'] as boolean,
      isBlacklisted: row['is_blacklisted'] as boolean,
      isDeleted: row['is_deleted'] as boolean,
      lastLogin: row['last_login'] ? new Date(row['last_login'] as string) : null,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  /**
   * Stores a user's refresh token hash in the database.
   *
   * @param userId - The ID of the user.
   * @param tokenHash - The SHA-256 hash of the refresh token.
   * @param expiresAt - The expiration timestamp.
   */
  async storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    logger.debug(`Storing refresh token for user ${userId}`);
    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  }

  /**
   * Stores a user's email verification token hash in the database.
   *
   * @param userId - The ID of the user.
   * @param tokenHash - The SHA-256 hash of the verification token.
   * @param expiresAt - The expiration timestamp.
   */
  async createEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<EmailVerificationToken> {
    logger.debug(`Storing email verification token hash for user ${userId}`);
    const result = await this.db.query<Record<string, unknown>>(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token_hash, is_revoked, expires_at, is_expired, created_at, updated_at`,
      [userId, tokenHash, expiresAt],
    );
    return this.toEmailVerificationTokenEntity(result.rows[0]);
  }

  /**
   * Finds a user by their unique database ID.
   *
   * @param id - The UUID of the user.
   * @returns The matching User entity, or null if not found.
   */
  async findById(id: string): Promise<User | null> {
    logger.debug(`Database query: findById initiated`);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT id, name, email, password_hash, is_email_verified, is_blacklisted,
              is_deleted, last_login, created_at, updated_at
       FROM users
       WHERE id = $1 AND is_deleted = false
       LIMIT 1`,
      [id],
    );

    if (!result.rows[0]) {
      logger.debug(`User not found by ID`);
      return null;
    }
    logger.debug(`User found by ID`);
    return this.toEntity(result.rows[0]);
  }

  /**
   * Looks up an email verification token by its hash.
   *
   * @param tokenHash - The SHA-256 token hash.
   * @returns The verification token record, or null if not found.
   */
  async findVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    logger.debug(`Database query: findVerificationTokenByHash initiated`);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT id, user_id, token_hash, is_revoked, expires_at, is_expired, created_at, updated_at
       FROM email_verification_tokens
       WHERE token_hash = $1
       LIMIT 1`,
      [tokenHash],
    );

    if (!result.rows[0]) {
      logger.debug(`Verification token not found`);
      return null;
    }
    logger.debug(`Verification token found`);
    return this.toEmailVerificationTokenEntity(result.rows[0]);
  }

  /**
   * Updates the status (revocation & expiration) of an email verification token.
   */
  async updateVerificationTokenStatus(tokenId: string, isRevoked: boolean, isExpired: boolean): Promise<void> {
    logger.debug(`Updating verification token status for token ${tokenId}`);
    await this.db.query(
      `UPDATE email_verification_tokens
       SET is_revoked = $2, is_expired = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [tokenId, isRevoked, isExpired],
    );
  }

  /**
   * Updates the email verification status flag on a user record.
   */
  async updateUserVerificationStatus(userId: string, isVerified: boolean): Promise<void> {
    logger.debug(`Updating email verification status for user ${userId} to ${isVerified}`);
    await this.db.query(
      `UPDATE users
       SET is_email_verified = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId, isVerified],
    );
  }

  /** Maps a raw database row to the EmailVerificationToken domain entity. */
  private toEmailVerificationTokenEntity(row: Record<string, unknown>): EmailVerificationToken {
    return {
      id: String(row['id']),
      userId: row['user_id'] as string,
      tokenHash: row['token_hash'] as string,
      isRevoked: row['is_revoked'] as boolean,
      expiresAt: new Date(row['expires_at'] as string),
      isExpired: row['is_expired'] as boolean,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  /**
   * Stores a user's password reset token hash in the database.
   *
   * @param userId - The ID of the user.
   * @param tokenHash - The SHA-256 hash of the password reset token.
   * @param expiresAt - The expiration timestamp.
   * @returns The created PasswordResetToken entity.
   */
  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken> {
    logger.debug(`Storing password reset token hash for user ${userId}`);
    const result = await this.db.query<Record<string, unknown>>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token_hash, is_revoked, expires_at, is_expired, created_at, updated_at`,
      [userId, tokenHash, expiresAt],
    );
    return this.toPasswordResetTokenEntity(result.rows[0]);
  }

  /** Maps a raw database row to the PasswordResetToken domain entity. */
  private toPasswordResetTokenEntity(row: Record<string, unknown>): PasswordResetToken {
    return {
      id: String(row['id']),
      userId: row['user_id'] as string,
      tokenHash: row['token_hash'] as string,
      isRevoked: row['is_revoked'] as boolean,
      expiresAt: new Date(row['expires_at'] as string),
      isExpired: row['is_expired'] as boolean,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  /**
   * Looks up a password reset token by its hash.
   */
  async findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    logger.debug(`Database query: findPasswordResetTokenByHash initiated`);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT id, user_id, token_hash, is_revoked, expires_at, is_expired, created_at, updated_at
       FROM password_reset_tokens
       WHERE token_hash = $1
       LIMIT 1`,
      [tokenHash],
    );

    if (!result.rows[0]) {
      logger.debug(`Password reset token not found`);
      return null;
    }
    logger.debug(`Password reset token found`);
    return this.toPasswordResetTokenEntity(result.rows[0]);
  }

  /**
   * Updates a user's password hash in the database.
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    logger.debug(`Updating password for user ${userId}`);
    await this.db.query(
      `UPDATE users
       SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId, passwordHash],
    );
  }

  /**
   * Hard deletes a password reset token from the database.
   */
  async deletePasswordResetToken(tokenId: string): Promise<void> {
    logger.debug(`Deleting password reset token ${tokenId} from database`);
    await this.db.query(
      `DELETE FROM password_reset_tokens
       WHERE id = $1`,
      [tokenId],
    );
  }
}

