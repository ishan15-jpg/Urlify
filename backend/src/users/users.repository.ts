import { Pool } from 'pg';
import { IUsersRepository } from './interfaces/users-repository.interface';
import { User } from '../auth/auth.entity';
import { logger } from '../shared/utils/logger';

export class UsersRepository implements IUsersRepository {
  constructor(private readonly db: Pool) {}

  /**
   * Finds a user by their unique database ID.
   * Only returns non-deleted records.
   *
   * @param id - The UUID of the user.
   * @returns The matching User entity, or null if not found.
   */
  async findById(id: string): Promise<User | null> {
    logger.debug(`Database query: UsersRepository.findById initiated`);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT id, name, email, password_hash, is_email_verified, is_blacklisted,
              is_deleted, last_login, created_at, updated_at, role
       FROM users
       WHERE id = $1 AND is_deleted = false
       LIMIT 1`,
      [id],
    );

    if (!result.rows[0]) {
      logger.debug(`User not found by ID in users repository`);
      return null;
    }
    logger.debug(`User found by ID in users repository`);
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
      role: row['role'] as string,
    };
  }
}
