import { IAuthService } from './interfaces/auth-service.interface';
import { IAuthRepository } from './interfaces/auth-repository.interface';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { User } from './auth.entity';
import { ConflictError } from '../shared/errors/conflict.error';
import { hashPassword } from '../shared/utils/password.util';

export class AuthService implements IAuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  /**
   * Registers a new user account.
   *
   * Steps:
   * 1. Check whether the email is already taken — throw ConflictError if so.
   * 2. Hash the password via bcrypt.
   * 3. Persist the new record and return the created entity.
   *
   * @param dto - Validated registration payload (name, email, password).
   * @returns The newly created User entity.
   * @throws ConflictError if the email is already registered.
   */
  async register(dto: RegisterRequestDto): Promise<User> {
    const existing = await this.authRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(dto.password);

    return this.authRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
  }
}
