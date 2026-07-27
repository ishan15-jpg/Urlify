import type { IAuthRepository } from './interfaces/authRepositoryInterface';
import type { RegisterPayload, LoginPayload, VerifyEmailPayload, EmailVerificationLinkPayload, ForgotPasswordPayload, ResetPasswordPayload } from '../../types';
import { isValidEmail, validatePassword } from '../../utils/validators';
import type { IAuthService } from './interfaces/authServiceInterface';
import type { EmailVerificationLinkResponseData, RefreshResponseData, VerifyEmailResponseData } from '../../types/authResponse';

export interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default class AuthService implements IAuthService {
  private authRepository: IAuthRepository;

  constructor(authRepository: IAuthRepository) {
    this.authRepository = authRepository;
  }
  /**
   * Validates registration data and calls the repository.
   * Throws an error containing field-specific errors if validation fails.
   */
  public async register(payload: RegisterPayload, confirmPassword?: string): Promise<any> {
    const errors: FieldErrors = {};

    // 1. All fields must be filled
    if (!payload.name?.trim()) errors.name = 'Full name is required';
    if (!payload.email?.trim()) errors.email = 'Email address is required';
    if (!payload.password) errors.password = 'Password is required';
    if (!confirmPassword) errors.confirmPassword = 'Confirm password is required';

    // 2. Validate Email Format
    if (payload.email && !isValidEmail(payload.email)) {
      errors.email = 'Invalid email format';
    }

    // 3. Validate Password Format
    if (payload.password) {
      const passwordError = validatePassword(payload.password);
      if (passwordError) {
        errors.password = passwordError;
      }
    }

    // 4. Passwords must match
    if (payload.password && confirmPassword && payload.password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // If there are any errors, throw them to be handled by the hook
    if (Object.keys(errors).length > 0) {
      throw { name: 'ValidationError', fieldErrors: errors };
    }

    // If valid, call the repository
    return this.authRepository.register({
      name: payload.name,
      email: payload.email,
      password: payload.password
    });
  }

  /**
   * Validates login credentials and calls the repository.
   * Throws an error containing field-specific errors if validation fails.
   */
  public async login(payload: LoginPayload): Promise<any> {
    const errors: FieldErrors = {};

    if (!payload.email?.trim()) errors.email = 'Email address is required';
    if (!payload.password) errors.password = 'Password is required';

    if (payload.email && !isValidEmail(payload.email)) {
      errors.email = 'Invalid email format';
    }

    if (Object.keys(errors).length > 0) {
      throw { name: 'ValidationError', fieldErrors: errors };
    }

    return this.authRepository.login({
      email: payload.email,
      password: payload.password
    });
  }

  public async logout(): Promise<void> {
    await this.authRepository.logout();
  }

  public async sendEmailVerificationLink(data: EmailVerificationLinkPayload): Promise<EmailVerificationLinkResponseData> {
    const response = await this.authRepository.sendEmailVerificationLink({ email: data.email });
    return response.data;
  }

  public async verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponseData> {
    const response = await this.authRepository.verifyEmail({ token: payload.token });
    return response.data
  }

  public async refreshToken(): Promise<RefreshResponseData> {
    const response = await this.authRepository.refreshToken();
    return response.data;
  }

  public async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await this.authRepository.forgotPassword({ email: payload.email });
  }

  public async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    const errors: FieldErrors = {};

    if (!payload.token) errors.password = 'Reset token is required';
    if (!payload.newPassword) {
      errors.password = 'New password is required';
    } else {
      const passwordError = validatePassword(payload.newPassword);
      if (passwordError) {
        errors.password = passwordError;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw { name: 'ValidationError', fieldErrors: errors };
    }

    await this.authRepository.resetPassword({
      token: payload.token,
      newPassword: payload.newPassword
    });
  }
};