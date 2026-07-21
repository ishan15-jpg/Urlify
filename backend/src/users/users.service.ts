import { IUsersService } from './interfaces/users-service.interface';
import { IUsersRepository } from './interfaces/users-repository.interface';
import { User } from '../auth/auth.entity';
import { NotFoundError } from '../shared/errors/not-found.error';
import { logger } from '../shared/utils/logger';
import { redisClient } from '../shared/config/redis.config';

export class UsersService implements IUsersService {
  constructor(private readonly usersRepository: IUsersRepository) {}

  /**
   * Fetches the user profile by user ID.
   * Checks Redis cache first, falls back to DB, and caches the result.
   */
  async getUserProfile(userId: string): Promise<User> {
    logger.debug(`Fetching user profile for user ${userId}`);
    const redisKey = `user_profile:${userId}`;

    // 1. Check Redis cache
    try {
      const cachedData = await redisClient.get(redisKey);
      if (cachedData) {
        logger.debug(`Redis cache hit for user profile ${userId}`);
        const user = JSON.parse(cachedData) as User;
        
        // Re-hydrate Date objects after JSON parse
        user.createdAt = new Date(user.createdAt);
        user.updatedAt = new Date(user.updatedAt);
        if (user.lastLogin) {
          user.lastLogin = new Date(user.lastLogin);
        }
        
        return user;
      }
    } catch (err) {
      logger.warn(`Failed to retrieve user profile from Redis for user ${userId}`, err);
      // Fallback to DB if Redis fails
    }

    // 2. Cache miss, fetch from Database
    logger.debug(`Redis cache miss. Falling back to database lookup for user ${userId}`);
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      logger.warn(`User profile fetch failed: User ${userId} not found`);
      throw new NotFoundError('User', userId);
    }

    // 3. Cache the result in Redis with a 15-minute TTL
    try {
      logger.debug(`Caching user profile in Redis for user ${userId}`);
      await redisClient.set(redisKey, JSON.stringify(user), 'EX', 900); // 15 minutes
    } catch (err) {
      logger.warn(`Failed to cache user profile in Redis for user ${userId}`, err);
    }

    return user;
  }
}
