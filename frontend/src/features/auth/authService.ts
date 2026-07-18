import authRepository, { type RegisterPayload } from './authRepository';
import { isValidEmail, validatePassword } from '../../utils/validators';

export interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export class AuthService {
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
    return authRepository.register({
      name: payload.name,
      email: payload.email,
      password: payload.password
    });
  }
}

export default new AuthService();
