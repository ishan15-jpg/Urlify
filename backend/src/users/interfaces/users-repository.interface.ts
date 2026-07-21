import { User } from '../../auth/auth.entity';

export interface IUsersRepository {
  /**
   * Finds a user by their unique database ID.
   *
   * @param id - The UUID of the user.
   * @returns The matching User entity, or null if not found.
   */
  findById(id: string): Promise<User | null>;
}
