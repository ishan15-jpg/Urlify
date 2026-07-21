import type { 
  IHttpClient, 
  LoginPayload, 
  RegisterPayload, 
  EmailVerificationLinkPayload, 
  VerifyEmailPayload, 
  ForgotPasswordPayload, 
  ResetPasswordPayload 
} from '../../types';
import type { IAuthRepository } from './interfaces/authRepositoryInterface';

// --- AuthRepository implementation ---

export default class AuthRepository implements IAuthRepository {
  private apiClient: IHttpClient;

  constructor(apiClient: IHttpClient) {
    this.apiClient = apiClient;
  }

  /**
   * Authenticates a user and issues an access token.
   */
  public async login<T = any>(data: LoginPayload): Promise<T> {
    return this.apiClient.post<T>('/auth/login', data);
  }

  /**
   * Authenticates a user and issues an access token.
   */
  public async logout<T = any>(): Promise<T> {
    return this.apiClient.post<T>('/auth/logout');
  }

  /**
   * Creates a new user account and triggers an email verification flow.
   */
  public async register<T = any>(data: RegisterPayload): Promise<T> {
    return this.apiClient.post<T>('/auth/register', data);
  }

  /**
   * Sends an email verification link.
   */
  public async sendEmailVerificationLink<T = any>(data: EmailVerificationLinkPayload): Promise<T> {
    return this.apiClient.post<T>('/auth/email-verification-link', data);
  }

  /**
   * Verifies an email using the token sent to the user.
   */
  public async verifyEmail<T = any>(data: VerifyEmailPayload): Promise<T> {
    return this.apiClient.post<T>('/auth/verify-email', data);
  }

  /**
   * Initiates the forgot password flow by sending a reset link.
   */
  public async forgotPassword<T = any>(data: ForgotPasswordPayload): Promise<T> {
    return this.apiClient.post<T>('/auth/forgot-password', data);
  }

  /**
   * Resets the user's password using the provided token.
   */
  public async resetPassword<T = any>(data: ResetPasswordPayload): Promise<T> {
    return this.apiClient.post<T>('/auth/reset-password', data);
  }

  /**
   * Refreshes the access token.
   */
  public async refreshToken<T = any>(): Promise<T> {
    return this.apiClient.post<T>('/auth/refresh');
  }
}