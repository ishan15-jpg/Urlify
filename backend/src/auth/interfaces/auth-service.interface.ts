import { User } from '../auth.entity';
import { RegisterRequestDto } from '../dtos/register-request.dto';
import { LoginRequestDto } from '../dtos/login-request.dto';

export interface IAuthService {
  /**
   * Registers a new user account.
   * Checks for duplicate email, hashes the password, and persists the record.
   *
   * @param dto - Validated registration payload.
   * @returns The newly created User entity.
   * @throws ConflictError if the email is already registered.
   */
  register(dto: RegisterRequestDto): Promise<User>;

  /**
   * Log in an existing user.
   *
   * @param dto - Validated login payload (email and password).
   * @returns User entity, access token, and refresh token.
   */
  login(dto: LoginRequestDto): Promise<{ user: User; accessToken: string; refreshToken: string }>;
}
