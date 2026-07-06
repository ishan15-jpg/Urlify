import { Request, Response, NextFunction } from 'express';
import { IAuthService } from './interfaces/auth-service.interface';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { LoginRequestDto } from './dtos/login-request.dto';
import { toRegisterResponseDto } from './dtos/register-response.dto';
import { toUserDto } from './dtos/login-response.dto';
import { logger } from '../shared/utils/logger';

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
}
