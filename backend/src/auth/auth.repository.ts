import { Pool } from 'pg';
import { IAuthRepository } from './interfaces/auth-repository.interface';
import { User } from './auth.entity';

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
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT id, name, email, password_hash, is_email_verified, is_blacklisted,
              is_deleted, last_login, created_at, updated_at
       FROM users
       WHERE email = $1 AND is_deleted = false
       LIMIT 1`,
      [email],
    );

    if (!result.rows[0]) return null;
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
}
