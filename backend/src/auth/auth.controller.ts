import { Request, Response, NextFunction } from 'express';
import { IAuthService } from './interfaces/auth-service.interface';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { LoginRequestDto } from './dtos/login-request.dto';
import { toRegisterResponseDto } from './dtos/register-response.dto';
import { toUserDto } from './dtos/login-response.dto';
import { toAdminUserDto } from './dtos/admin-user-response.dto';
import { logger } from '../shared/utils/logger';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { ValidationError } from '../shared/errors/validation.error';

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  /**
   * POST /api/v1/auth/register
   *
   * Expects a validated RegisterRequestDto on req.body (enforced by the
   * validate middleware before this handler runs).
   * Returns 201 with the created user data on success.
   * Any thrown AppError is forwarded to the centralized error middleware.
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as RegisterRequestDto;
      logger.info(`User registration initiated`)
      const user = await this.authService.register(dto);
      logger.info(`User registered successfully`);
      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Account created. Please verify your email to continue.',
        data: {
          user: toRegisterResponseDto(user),
        },
        meta: {
          requestId: req.headers['x-request-id'] ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err){
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/login
   *
   * Validates the login payload, performs authentication via the service,
   * sets the refresh token in a secure cookie, and returns the user info
   * and access token.
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as LoginRequestDto;
      logger.info(`User authentication initiated`);
      const { user, accessToken, refreshToken } = await this.authService.login(dto);
      logger.info(`User authenticated successfully`);

      // Send refresh token to secure cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true, // Secure cookie
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matching JWT refresh token lifetime)
      });

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Login successful',
        data: {
          user: toUserDto(user),
          accessToken,
        },
        meta: {
          requestId: req.headers['x-request-id'] ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/email-verification-link
   *
   * Requests a new email verification link. Checks if user exists and is not verified,
   * stores verification token hash, and pushes email job to BullMQ.
   */
  sendEmailVerificationLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized');
      }

      const { userId, email } = req.user;
      logger.info(`Email verification link request initiated for user ${userId}`);
      await this.authService.generateEmailVerificationLink(userId, email);
      logger.info(`Email verification link enqueued successfully for user ${userId}`);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Verification link sent to your registered email',
        data: {
          email,
          expiresIn: 600, // 10 minutes in seconds
        },
        meta: {
          requestId: req.headers['x-request-id'] ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/verify-email
   *
   * Verifies the user's email address using the token passed in the request body.
   */
  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body as { token: string };
      logger.info(`Email verification request initiated`);
      
      const user = await this.authService.verifyEmail(token);
      logger.info(`Email verified successfully for user ${user.id}`);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Email verified successfully',
        data: {
          email: user.email,
          isEmailVerified: user.isEmailVerified,
        },
        meta: {
          requestId: req.headers['x-request-id'] ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/forgot-password
   *
   * Initiates the forgot-password workflow.
   */
  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body as { email: string };
      logger.info(`Forgot password request initiated for email ${email}`);

      await this.authService.processForgotPassword(email);
      logger.info(`Forgot password workflow triggered for email ${email}`);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'If an account exists with this email, a reset link has been sent',
        data: null,
        meta: {
          requestId: req.headers['x-request-id'] ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/reset-password
   *
   * Resets the user's password using the token.
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };
      logger.info(`Reset password request initiated`);

      // Call service synchronously to update password
      await this.authService.resetPassword({ token, newPassword });
      logger.info(`Password reset successfully`);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Password reset successfully. Please log in with your new password.',
        data: null,
        meta: {
          requestId: req.headers['x-request-id'] ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/refresh
   *
   * Refreshes the user's session and returns a new access token in the response body.
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const oldRefreshToken = req.cookies?.refreshToken;
      if (!oldRefreshToken) {
        logger.warn(`Refresh token cookie is missing`);
        throw new ValidationError('Refresh token is required');
      }

      logger.info(`Session refresh request received`);
      const { accessToken, newRefreshToken } = await this.authService.refreshSession(oldRefreshToken);

      // Set the new refresh token in a secure cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      logger.info(`Session refreshed successfully`);
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Access token refreshed successfully',
        data: {
          accessToken,
          expiresIn: 900, // 15 minutes in seconds
        },
        meta: {
          requestId: req.headers['x-request-id'] ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/admin/users
   *
   * Fetches a paginated list of users filtered by query parameters.
   */
  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info('Admin users fetch request initiated');
      const query = req.query as any;
      const { users, pagination } = await this.authService.getUsers!({
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
      });

      logger.info('Admin users fetched successfully');
      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Users fetched successfully',
        data: {
          users: users.map(toAdminUserDto),
          pagination,
        },
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
