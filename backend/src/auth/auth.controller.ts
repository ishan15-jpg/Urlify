import { Request, Response, NextFunction } from 'express';
import { IAuthService } from './interfaces/auth-service.interface';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { toRegisterResponseDto } from './dtos/register-response.dto';

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
      const user = await this.authService.register(dto);

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
    } catch (err) {
      next(err);
    }
  };
}
