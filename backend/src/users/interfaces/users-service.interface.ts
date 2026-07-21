import { User } from '../../auth/auth.entity';

export interface IUsersService {
  /**
   * Fetches the user profile by user ID.
   * Leverages Redis cache for performance optimization.
   *
   * @param userId - The ID of the user.
   * @returns The User entity.
   * @throws NotFoundError if the user is not found.
   */
  getUserProfile(userId: string): Promise<User>;
}
