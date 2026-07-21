import { Request, Response, NextFunction } from 'express';
import { IUsersService } from './interfaces/users-service.interface';
import { toUserProfileDto } from './dtos/user-profile-response.dto';
import { logger } from '../shared/utils/logger';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';

export class UsersController {
  constructor(private readonly usersService: IUsersService) {}

  /**
   * GET /api/v1/users/me
   *
   * Fetches the profile of the currently authenticated user.
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized');
      }

      const userId = req.user.userId;
      logger.info(`Profile fetch request initiated for user ${userId}`);

      const user = await this.usersService.getUserProfile(userId);
      logger.info(`Profile fetched successfully for user ${userId}`);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'User profile fetched successfully',
        data: toUserProfileDto(user),
        meta: {
          requestId: req.headers['x-request-id'] ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
